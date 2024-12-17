import {
    Agent,
    AutoAcceptCredential,
    ConnectionEventTypes,
    ConnectionsModule,
    ConnectionStateChangedEvent,
    ConsoleLogger,
    CredentialEventTypes,
    CredentialsModule,
    CredentialState,
    CredentialStateChangedEvent,
    DidDocument,
    DidExchangeState,
    DidsModule,
    HttpOutboundTransport,
    KeyType,
    LogLevel,
    OutOfBandRecord,
    V2CredentialProtocol,
    WsOutboundTransport
} from '@credo-ts/core';
import {agentDependencies, HttpInboundTransport} from '@credo-ts/node';
import { AskarModule } from '@credo-ts/askar';
import {ariesAskar} from '@hyperledger/aries-askar-nodejs';
import {
    AnonCredsCredentialFormatService,
    AnonCredsModule
} from '@credo-ts/anoncreds';
import {anoncreds} from '@hyperledger/anoncreds-nodejs';
import {
    CheqdAnonCredsRegistry,
    CheqdDidRegistrar,
    CheqdDidResolver,
    CheqdModule,
    CheqdModuleConfig,
    CheqdDidCreateOptions
} from '@credo-ts/cheqd';
import * as once from "./once";
import * as process from "process";

require('dotenv').config();

const issuerConfig = {
    label: process.env.ISSUER_LABEL,
    walletConfig: {
        id: process.env.ISSUER_WALLET_ID,
        key: process.env.ISSUER_WALLET_KEY
    },
    endpoints: [process.env.ISSUER_ENDPOINT],
    // logger: new ConsoleLogger(LogLevel.debug)
};


const issuer = new Agent({
    // @ts-ignore
    config: issuerConfig,
    dependencies: agentDependencies,
    modules: {
        askar: new AskarModule({
            ariesAskar,
        }),
        connections: new ConnectionsModule({
            autoAcceptConnections: true
        }),
        anoncreds: new AnonCredsModule({
            registries: [new CheqdAnonCredsRegistry()],
            anoncreds,
        }),
        cheqd: new CheqdModule(
            new CheqdModuleConfig({
                networks: [
                    {
                        // @ts-ignore
                        network: process.env.CHEQD_NETWORK,
                        // @ts-ignore
                        cosmosPayerSeed: process.env.ISSUER_COSMOS_SEED
                    },
                ],
            })
        ),
        dids: new DidsModule({
            registrars: [new CheqdDidRegistrar()],
            resolvers: [new CheqdDidResolver()],
        }),
        credentials: new CredentialsModule({
            credentialProtocols: [
                new V2CredentialProtocol({
                    credentialFormats: [new AnonCredsCredentialFormatService()],
                }),
            ],
        }),
    },
})

issuer.registerOutboundTransport(new WsOutboundTransport())
issuer.registerOutboundTransport(new HttpOutboundTransport())
// @ts-ignore
issuer.registerInboundTransport(new HttpInboundTransport({ port: process.env.ISSUER_PORT }))

const createNewInvitation = async () => {
    const outOfBandRecord = await issuer.oob.createInvitation()

    return {
        outOfBandRecord,
        // @ts-ignore
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: process.env.ISSUER_URL }),
    }
}

function startTimer(timeoutMs: number) {
    setTimeout(() => {
        console.log("Timeout");
        process.exit(0);
    }, timeoutMs);
}

async function offerCredential(connectionId: string, credentialDefinitionId: string) {
    return issuer.credentials.offerCredential({
        protocolVersion: 'v2',
        connectionId: connectionId,
        credentialFormats: {
            anoncreds: {
                credentialDefinitionId: credentialDefinitionId,
                attributes: [
                    {name: 'issuerDid', value: process.env.DID_ID || 'CHANGE_THE_ISSUER_DID'},
                    {name: 'holderDid', value: process.env.HOLDER_DID_ID || 'CHANGE_THE_HOLDER_DID'},
                    {name: 'givenName', value: 'Francesco'},
                    {name: 'familyName', value: 'XXXX'},
                    {name: 'dateOfBirth', value: '20/XX/XXXX'},
                    {name: 'phone', value: '+39366XXXXXXX'},
                    {name: 'email', value: 'francesco.XXX@gmail.com'},
                    {name: 'fiscalCode', value: 'GRGxxxxxxxxxxxxx'},
                    {name: 'gender', value: 'M'},
                ],
            },
        },
    })
}

const setupConnectionListener = (
    outOfBandRecord: OutOfBandRecord,
) => {
    issuer.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
        if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) {
            return
        }

        if (payload.connectionRecord.state === DidExchangeState.Completed) {
            startTimer(15000)
        }

        if (payload.connectionRecord.state === DidExchangeState.Completed) {
            try {
                const connectionID = payload.connectionRecord.id

                console.log('Offering credentials...')
                offerCredential(connectionID, credentialDefinitionID)

                issuer.events.on(CredentialEventTypes.CredentialStateChanged, async ({ payload }) => {
                    // @ts-ignore
                    console.log(payload.credentialRecord.state)
                    // @ts-ignore
                    switch(payload.credentialRecord.state) {
                        case CredentialState.RequestReceived:
                            // @ts-ignore
                            await issuer.credentials.acceptRequest({credentialRecordId: payload.credentialRecord.id})
                            break
                        case CredentialState.Done:
                            process.exit(0)
                    }
                })
            } catch (e) {
                console.log('Connection error!')
                process.exit(0)
            }
        }
    })
}



var credentialDefinitionID: string
const didID = process.env.DID_ID

async function main() {
    credentialDefinitionID = process.env.CREDENTIAL_DEFINITION_ID || 'value-unused-at-begin'

    try {
        console.log('Initializing issuer agent...')
        await issuer.initialize();

        // UNCOMMENT ONLY AT FIRST EXECUTION
        // console.log('Creating the DID...')
        // await once.createDid(issuer, didID).then(r => {})
        // console.log('Registering the schema...')
        // const schemaResult = await once.registerSchema(issuer, didID)
        // console.log('Defining credentials...');
        // credentialDefinitionID = await once.defineCredential(issuer, didID, schemaResult);
        // console.log('Credential definition id:', credentialDefinitionID)
        // process.exit(0)

        // COMMENT AT FIRST EXECUTION
        console.log('Creating an invitation for holder...');
        const { outOfBandRecord, invitationUrl } = await createNewInvitation();
        console.log(invitationUrl)

        console.log('Listening for connection changes...')
        setupConnectionListener(outOfBandRecord)
    } catch (error) {
        console.error('Errore:', error);
    }
}

main().then(r => {})