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

require('dotenv').config();

const issuerConfig = {
    label: 'issuer5_sec',
    walletConfig: {
        id: 'issuer5_sec',
        key: process.env.WALLET_KEY || 'CHANGE_YOUR_WALLET_KEY'
    },
    endpoints: ['http://localhost:3001'],
    // logger: new ConsoleLogger(LogLevel.debug)
};

const issuer = new Agent({
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
                        network: 'testnet',
                        cosmosPayerSeed: 'grab onion alien short practice pyramid where demise napkin phrase ill pitch'
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
issuer.registerInboundTransport(new HttpInboundTransport({ port: 3001 }))

const createNewInvitation = async () => {
    const outOfBandRecord = await issuer.oob.createInvitation()

    return {
        outOfBandRecord,
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'http://localhost:3001' }),
    }
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
                        console.log('Done')
                        process.exit(0)
                }
            })
        }
    })
}



var credentialDefinitionID: string
const didID = process.env.DID_ID || 'CHANGE_YOUR_DID_ID'

async function main() {
    credentialDefinitionID = 'did:cheqd:testnet:87874297-d824-40ea-8ae5-364a1ec90101/resources/dfde04c2-eeca-4cd5-8ff8-36cb028dd198'

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