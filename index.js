const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const session = require('express-session')
const getOidcProvider = require('./provider');
const verify = require('./verification/verifier.js');
const path = require('path');


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
        console.log('OIDC Provider in esecuzione su http://localhost:5000');
    });

    return app;
}

verify.getInitializedAgent().then(async agent => {
    const app = setApp();
    app.locals.agent = agent;
    app.locals.dataMap = {}
    const provider = await getOidcProvider()

    app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
        try {
            const {
                uid, prompt, params, session
            } = await provider.interactionDetails(req, res);

            const client = await provider.Client.find(params.client_id);

            switch (prompt.name) {
                case 'login': {
                    console.log('Login request received')

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
                        title: 'Authorize',
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
        console.log('Got AJAX request from the client')
        const oobId = req.body.oob_id
        const objConnId = {}

        // const details = await provider.interactionDetails(req, res)
        // console.log('details in interaction/login', details)

        verify.setupConnectionListener(req.app.locals.agent, oobId, objConnId);
        verify.setUpProofDoneListener(req.app.locals.agent, objConnId, provider, req, res);
    });

    app.post('/interaction/:uid/confirm', setNoCache, async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { prompt: { name, details }, params, session: { accountId } } = interactionDetails;
            // assert.equal(name, 'consent');

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

    app.get('/connect', async function (req, res, next) {
        console.log('Got AJAX request from the client')
        const oobId = req.query.oob_id
        const objConnId = {}

        verify.setupConnectionListener(req.app.locals.agent, oobId, objConnId);
        verify.setUpProofDoneListener(req.app.locals.agent, objConnId, provider, req, res);
    });

/*
    app.post('/token', (req, res) => {
        console.log('sono in token')
        console.log(req.body)
        
        const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

        if(grant_type == 'authorization_code') {
            const response = {
                "access_token":"MnVV989mQUcEsTeDDNCVVrEdoTUDPDhCsFBVdiuRtVR",
                "expires_in":15,
                "scope":"openid",
                "token_type":"Bearer"
            }

            res.json(response)
        }

        /*
        if (client_id !== 'YOUR_CLIENT_ID' || client_secret !== 'YOUR_CLIENT_SECRET') {
            return res.status(401).json({ error: 'invalid_client' });
        }

        if (grant_type === 'authorization_code') {
            // Qui dovresti verificare il codice e generare un access_token
            const accessToken = 'GENERATED_ACCESS_TOKEN'; // Logica per generare il token
            const refreshToken = 'GENERATED_REFRESH_TOKEN'; // Logica per generare il refresh token

            return res.json({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: refreshToken,
            });
        } else {
            return res.status(400).json({ error: 'unsupported_grant_type' });
        }
    });*/

    app.use(provider.callback())
})