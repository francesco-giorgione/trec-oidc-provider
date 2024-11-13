
async function myFindAccount(ctx, accountId) {
    console.log('Account ID: ', accountId)
    let customData = ctx.req.session.customData

    if (customData === undefined) {
        const oldSessionId = Object.keys(ctx.req.sessionStore.sessions)[0]
        const oldSession = JSON.parse(ctx.req.sessionStore.sessions[oldSessionId])
        customData = oldSession.customData
    }

    console.log('customData:', customData)

    return {
        accountId: accountId,
        async claims(use, scope, claims, rejected) {
            return {
                sub: accountId,
                trec: {
                    name:   customData.name,
                    age:  customData.age
                }
            }
        }
    }
}

async function getOidcProvider() {
    const { Provider } = await import('oidc-provider');
    const provider = new Provider('http://localhost:5000', {
        audiences: async (ctx, token, client) => {
            return 'my-global-audience';
        },
        claims: {
            address: ['address'],
            email: ['email', 'email_verified'],
            phone: ['phone_number', 'phone_number_verified'],
            profile: ['name', 'age'],
        },
        clients: [
            {
                allow_refresh_tokens: true,
                client_id: 'c_24f7d433899443d68ca84ad4913ec53f',
                client_secret: 'test_secret',
                redirect_uris: ['http://localhost:4200/auth/aac/callback'],
                response_types: ['code'],
                grant_types: ['authorization_code',],
                pkce: true,
                token_endpoint_auth_method: 'client_secret_post',
            },
        ],
        features: {
            introspection: { enabled: true },   // da cambiare in true
            revocation: { enabled: true },
            devInteractions: { enabled: false }, // da cambiare in false
        },
        findAccount: myFindAccount,
        interactions: {
            url(ctx, interaction) { // eslint-disable-line no-unused-vars
                return `/interaction/${interaction.uid}`;
            },
        },
        issueRefreshToken: async (ctx, client, code) => {return true},
        jwks: {
            keys: [
                {
                    kty: "RSA",
                    n: "1zcjmznY7AUhiRDcoE5IyS5G7vQA2xoNwH5LwvlzbQNLIY-3LSe_IC3rxtZO4U7N6nqsG1PqlZKyEJNt0hsUxP9qxjD2UsJ76FPI3B-WXNzX24fau-A6Q4xNIilsloWzMTddvpdo21hNP9GeV9vJb2_QFGGEJehNucXWJaa5DqqTuUtQkR1jS45e8RYUntfzkH8iooq0SeIMCX7zbWRBvmB6Oy90xv5XEkBR1LzaIYIzV-OZKCcMpBN2RgJBrTVV3yJwIylQMH8NHEafhYg_x0oYkMukGqidq0r5RsC7Y_l1FGWk08g6Ag8TOACNJel-VaI0cvYmay8PLux2IoQrrw",
                    e: "AQAB",
                    d: "HRv_0eq_dMpg4H7fs0MYxIq2Mh3eJm8zYE-fhGNkgbXfVKPGspyHVR1A9dJeNaAIvr1m8q9QByPMt-yTqcaF8aYGgCt2iyJzy1csejGU5JdDucAkuCK6XrvnDEbZbCabYn3K9-Ys2vY_mfE1X0wtcR2I4dOAIfcg2Y7GdK3vUT9GUuWszGS6fYZGVs4PA3S8vGvXy3pTPMYWyxTxKTC_DRBqN3fP6RVQtErOtJt1E-oH5YzNLiapybYoc3NfQVqc-M_qHP9N1liQ-xuK6y9SjgZrXmTlq0qn3SBaYWpZ1wZn2qBkv8kCmmnYRo_Jjg4gN3E1W9ZzyXMOJ6dCR4-DAQ",
                    p: "9FQV9FN1dzobpTop_g-ZbS7KQelf2JOsYp5pciJ2qpZXqJja2fi6KMzEGE3ZC6bGtE6dgsvszIW8stlknV6QRWSL0KSUtwpUErxOeh2D331XzqYxY1sSjyYbbpZBurINS4FfooGFTfJdhb8PSHojRSheILRwHTPFLmme1rW4oy8",
                    q: "4X8G6UJC8UnAUdnWBQPAoeZG40PdKR3IRxZbvkhv_rSblmLD5_TOAE5gBNQejCkk1fxwzHfIivu7ndMRLdczqc7_ZDJ61SbyE067cx67hRwznPEI-eac1FCFoJszQNhr-mmmnjCiD2XeFahhZ7J0axfzM0Knbo72Xs0Fe6Xs34E",
                    dp: "pcI-Oso8USz9AHWbc5_FqUsrMNhRjC9zrlxmkWZMN6NTyTAamfKi6XcyOoLmE3-MI1uKhOgwuPiqcnQGTLWRD2MNb_mYYy4Ap81VOIe5pe_1mF8r9ooc5z0lMzuBUFXnqygUZ72TYLRjOo_KoJMsRokCgxGnVkh_J-PEPUp__0U",
                    dq: "MsZsovd1pWlK8eNQKr7mkE4O5juwwAJhx4gETnt3JG48nodMv51DCZScUFoHKt5U2g5Gw_Ow54K5g1c0hhLwIitnHIO1XuuvFKPk144zAU0RXiR0Nfk0lSYwgLKRvuc8oR1LFFG1HCx-7neEv1nSlw7Eh2VZ2C4-0afutSHujYE",
                    qi: "Yky-1nxFWXtMm6RRRb3X_hY3BKisPUVSsAV-nHnb7lbvMUNPLfI0zQTIHrn7PHbd1YR0Wq1VSVdftx_l9Nsjso9pVLyHJo3D0fp9s53kvS0jX2kDcmildQqTxlsnppXEuNERcwgq8YTzoH1NOyxSNfyNMPJXJ6BJQOMh1ZSn8H4",
                    ext: true,
                    kid: "7285973004cdfae9ff0967e52bb786",
                    alg: "RS256",
                    use: "sig"
                }
            ]
        },
        routes: {
            authorization: '/auth',
            token: '/token',
            userinfo: '/me',
        },
        scopes: ['offline_access openid profile email profile.trec.me'],
        ttl: {
            AccessToken:    15,
            IdToken:        3600,
            RefreshToken:   60*60*24*30
        }
    });

    provider.on('error', (error) => {
        console.error('Errore generale:', error);
    });

    provider.on('server_error', (error) => {
        console.error('Errore di server:', error);
    });

    provider.on('interaction.error', (ctx, error) => {
        console.error('Errore di interazione:', error);
        console.log('Dettagli del contesto:', ctx);
    });

    return provider
}

module.exports = getOidcProvider