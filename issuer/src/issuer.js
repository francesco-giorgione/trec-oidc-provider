"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const anoncreds_1 = require("@credo-ts/anoncreds");
const anoncreds_nodejs_1 = require("@hyperledger/anoncreds-nodejs");
const cheqd_1 = require("@credo-ts/cheqd");
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
const issuer = new core_1.Agent({
    config: issuerConfig,
    dependencies: node_1.agentDependencies,
    modules: {
        askar: new askar_1.AskarModule({
            ariesAskar: aries_askar_nodejs_1.ariesAskar,
        }),
        connections: new core_1.ConnectionsModule({
            autoAcceptConnections: true
        }),
        anoncreds: new anoncreds_1.AnonCredsModule({
            registries: [new cheqd_1.CheqdAnonCredsRegistry()],
            anoncreds: anoncreds_nodejs_1.anoncreds,
        }),
        cheqd: new cheqd_1.CheqdModule(new cheqd_1.CheqdModuleConfig({
            networks: [
                {
                    network: 'testnet',
                    cosmosPayerSeed: 'grab onion alien short practice pyramid where demise napkin phrase ill pitch'
                },
            ],
        })),
        dids: new core_1.DidsModule({
            registrars: [new cheqd_1.CheqdDidRegistrar()],
            resolvers: [new cheqd_1.CheqdDidResolver()],
        }),
        credentials: new core_1.CredentialsModule({
            credentialProtocols: [
                new core_1.V2CredentialProtocol({
                    credentialFormats: [new anoncreds_1.AnonCredsCredentialFormatService()],
                }),
            ],
        }),
    },
});
issuer.registerOutboundTransport(new core_1.WsOutboundTransport());
issuer.registerOutboundTransport(new core_1.HttpOutboundTransport());
issuer.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3001 }));
const createNewInvitation = () => __awaiter(void 0, void 0, void 0, function* () {
    const outOfBandRecord = yield issuer.oob.createInvitation();
    return {
        outOfBandRecord,
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'http://localhost:3001' }),
    };
});
function offerCredential(connectionId, credentialDefinitionId) {
    return __awaiter(this, void 0, void 0, function* () {
        return issuer.credentials.offerCredential({
            protocolVersion: 'v2',
            connectionId: connectionId,
            credentialFormats: {
                anoncreds: {
                    credentialDefinitionId: credentialDefinitionId,
                    attributes: [
                        { name: 'issuerDid', value: process.env.DID_ID || 'CHANGE_THE_ISSUER_DID' },
                        { name: 'holderDid', value: process.env.HOLDER_DID_ID || 'CHANGE_THE_HOLDER_DID' },
                        { name: 'givenName', value: 'Francesco' },
                        { name: 'familyName', value: 'XXXX' },
                        { name: 'dateOfBirth', value: '20/XX/XXXX' },
                        { name: 'phone', value: '+39366XXXXXXX' },
                        { name: 'email', value: 'francesco.XXX@gmail.com' },
                        { name: 'fiscalCode', value: 'GRGxxxxxxxxxxxxx' },
                        { name: 'gender', value: 'M' },
                    ],
                },
            },
        });
    });
}
const setupConnectionListener = (outOfBandRecord) => {
    issuer.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
        if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) {
            return;
        }
        if (payload.connectionRecord.state === core_1.DidExchangeState.Completed) {
            const connectionID = payload.connectionRecord.id;
            console.log('Offering credentials...');
            offerCredential(connectionID, credentialDefinitionID);
            issuer.events.on(core_1.CredentialEventTypes.CredentialStateChanged, (_a) => __awaiter(void 0, [_a], void 0, function* ({ payload }) {
                // @ts-ignore
                console.log(payload.credentialRecord.state);
                // @ts-ignore
                switch (payload.credentialRecord.state) {
                    case core_1.CredentialState.RequestReceived:
                        // @ts-ignore
                        yield issuer.credentials.acceptRequest({ credentialRecordId: payload.credentialRecord.id });
                        break;
                    case core_1.CredentialState.Done:
                        console.log('Done');
                        process.exit(0);
                }
            }));
        }
    });
};
var credentialDefinitionID;
const didID = process.env.DID_ID || 'CHANGE_YOUR_DID_ID';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        credentialDefinitionID = 'did:cheqd:testnet:87874297-d824-40ea-8ae5-364a1ec90101/resources/dfde04c2-eeca-4cd5-8ff8-36cb028dd198';
        try {
            console.log('Initializing issuer agent...');
            yield issuer.initialize();
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
            const { outOfBandRecord, invitationUrl } = yield createNewInvitation();
            console.log(invitationUrl);
            console.log('Listening for connection changes...');
            setupConnectionListener(outOfBandRecord);
        }
        catch (error) {
            console.error('Errore:', error);
        }
    });
}
main().then(r => { });
