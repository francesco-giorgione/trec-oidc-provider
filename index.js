const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const session = require('express-session')
const getOidcProvider = require('./provider');
const verify = require('./verification/verifier.js');
const path = require('path');
const once = require('./verification/once.js');


function setNoCache(req, res, next) {
    res.set('cache-control', 'no-store');
    next();
}

function setApp() {
    const app = express();
    app.use('/interaction', bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cookieParser());
    app.use(cors({
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    require('dotenv').config();

    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // Imposta su true in produzione da_modificare
    }));

    app.set('view engine', 'pug');
    app.set('views', path.join(__dirname, 'views'));

    app.listen(5000, () => {
        console.log('OIDC Provider executing on http://localhost:5000');
    });

    return app;
}

verify.getInitializedAgent().then(async agent => {
    const app = setApp();
    app.locals.agent = agent;

    const didID = process.env.DID_ID || 'CHANGE_YOUR_DID_ID'

    // Uncomment only at first execution
    // console.log('Creating the DID...')
    // await once.createDid(app.locals.agent, didID).then(r => {})

    // const created_dids = await app.locals.agent.dids.getCreatedDids();
    // console.log('created dids:', created_dids)
    
    const provider = await getOidcProvider()

    app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
        try {
            const {
                uid, prompt, params
            } = await provider.interactionDetails(req, res);

            const client = await provider.Client.find(params.client_id);

            switch (prompt.name) {
                case 'login': {
                    const result = await verify.getInvitation(req.app.locals.agent)
                    const invitationUrl = result.invitationUrl
                    const oobId = result.oob.id

                    return res.render('login', {url: invitationUrl, oob_id: oobId, u_id: uid})
                }
                case 'consent': {
                    return res.render('interaction', {
                        client,
                        uid,
                        details: prompt.details,
                        params,
                    });
                }
                default:
                    return undefined;
            }
        } catch (err) {
            return next(err);
        }
    });

    app.post('/interaction/:uid/login', async (req, res) => {
        console.log('/login API: got AJAX request from the client')
        const oobId = req.body.oob_id
        const objConnId = {}

        verify.setupConnectionListener(req.app.locals.agent, oobId, objConnId);
        verify.setUpProofDoneListener(req.app.locals.agent, objConnId, provider, req, res);
    });

    app.post('/interaction/:uid/confirm', setNoCache, async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { prompt: { name, details }, params, session: { accountId } } = interactionDetails;

            const oobId = interactionDetails.lastSubmission.login.oobId

            let { grantId } = interactionDetails;
            let grant;

            if (grantId) {
                grant = await provider.Grant.find(grantId);
            } else {
                grant = new provider.Grant({
                    accountId,
                    clientId: params.client_id,
                });
            }

            if (details.missingOIDCScope) {
                grant.addOIDCScope(details.missingOIDCScope.join(' '));
            }
            if (details.missingOIDCClaims) {
                grant.addOIDCClaims(details.missingOIDCClaims);
            }
            if (details.missingResourceScopes) {
                for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
                    grant.addResourceScope(indicator, scopes.join(' '));
                }
            }

            grantId = await grant.save();

            const consent = {};
            if (!interactionDetails.grantId) {
                consent.grantId = grantId;
            }

            const result = { "login": {accountId: accountId}, consent };
            await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
        } catch (err) {
            next(err);
        }
    });

    app.post('/interaction/:uid/abort', async function (req, res, next) {
        const interactionDetails = await provider.interactionDetails(req, res);
        const { prompt: { name, details }, params, session: { accountId } } = interactionDetails;
        
        try {
            const result = {
                login: accountId,
                error: 'access_denied',
                error_description: 'End-User aborted interaction',
            };
            await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
        } catch (err) {
            next(err);
        }
    });

    app.use(provider.callback())
})  