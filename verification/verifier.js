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
exports.verifier = void 0;
exports.getInitializedAgent = getInitializedAgent;
exports.getInvitation = getInvitation;
exports.setupConnectionListener = setupConnectionListener;
exports.setUpProofDoneListener = setUpProofDoneListener;
exports.sendProofRequest = sendProofRequest;
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const cheqd_1 = require("@credo-ts/cheqd");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const anoncreds_1 = require("@credo-ts/anoncreds");
const anoncreds_nodejs_1 = require("@hyperledger/anoncreds-nodejs");
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const verifierConfig = {
    label: 'verifier-agent',
    walletConfig: {
        id: 'id_verifier',
        key: 'key_verifier',
    },
    endpoints: ['http://localhost:3003'],
    // logger: new ConsoleLogger(LogLevel.debug)
};
exports.verifier = new core_1.Agent({
    config: verifierConfig,
    dependencies: node_1.agentDependencies,
    modules: {
        askar: new askar_1.AskarModule({
            ariesAskar: aries_askar_nodejs_1.ariesAskar,
        }),
        connections: new core_1.ConnectionsModule({
            autoAcceptConnections: true
        }),
        cheqd: new cheqd_1.CheqdModule(new cheqd_1.CheqdModuleConfig({
            networks: [
                {
                    network: 'testnet'
                },
            ],
        })),
        anoncreds: new anoncreds_1.AnonCredsModule({
            registries: [new cheqd_1.CheqdAnonCredsRegistry()],
            anoncreds: anoncreds_nodejs_1.anoncreds,
        }),
        credentials: new core_1.CredentialsModule({
            credentialProtocols: [
                new core_1.V2CredentialProtocol({
                    credentialFormats: [new anoncreds_1.AnonCredsCredentialFormatService()],
                }),
            ],
        }),
        proofs: new core_1.ProofsModule({
            autoAcceptProofs: core_1.AutoAcceptProof.ContentApproved,
            proofProtocols: [
                new core_1.V2ProofProtocol({
                    proofFormats: [new anoncreds_1.AnonCredsProofFormatService()],
                }),
            ],
        }),
    },
});
exports.verifier.registerOutboundTransport(new core_1.WsOutboundTransport());
exports.verifier.registerOutboundTransport(new core_1.HttpOutboundTransport());
exports.verifier.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3003 }));
const createNewInvitation = (agent) => __awaiter(void 0, void 0, void 0, function* () {
    const outOfBandRecord = yield agent.oob.createInvitation();
    return {
        oob: outOfBandRecord,
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'http://localhost:3003' }),
    };
});
function getInitializedAgent() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.verifier.initialize();
            return exports.verifier;
        }
        catch (e) {
            console.log(e);
        }
    });
}
function getInvitation(agent) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Creating the invitation for the holder...');
            const invitation = yield createNewInvitation(agent);
            console.log('url: ' + invitation.invitationUrl);
            return invitation;
        }
        catch (error) {
            console.error('Errore:', error);
        }
    });
}
function setupConnectionListener(agent, oobId, objConnId) {
    agent.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, (_a) => __awaiter(this, [_a], void 0, function* ({ payload }) {
        if (payload.connectionRecord.state === core_1.DidExchangeState.Completed &&
            payload.connectionRecord.outOfBandId == oobId) {
            const connectionID = payload.connectionRecord.id;
            objConnId.connectionId = connectionID;
            yield sendProofRequest(agent, connectionID);
        }
    }));
}
function setUpProofDoneListener(agent, objConnId, provider, req, res) {
    agent.events.on(core_1.ProofEventTypes.ProofStateChanged, (_a) => __awaiter(this, [_a], void 0, function* ({ payload }) {
        console.log('current proof state', payload.proofRecord.state);
        if (payload.proofRecord.state === core_1.ProofState.Done && payload.proofRecord.isVerified &&
            payload.proofRecord.connectionId == objConnId.connectionId) {
            const proofData = yield agent.proofs.getFormatData(payload.proofRecord.id);
            const presentation = yield proofData.presentation;
            const attrs = presentation === null || presentation === void 0 ? void 0 : presentation.anoncreds.requested_proof.revealed_attrs;
            // console.log('revealedAttrs:', attrs)
            const data = { name: attrs.name.raw, age: attrs.age.raw };
            /*const tkn = jwt.sign(data, JWT_SECRET, {expiresIn: '1h'});
            console.log('jwt_token:', tkn) */
            const result = {
                "login": {
                    accountId: '50',
                },
            };
            req.session.customData = data;
            console.log('sto per fare interactionFinished');
            yield provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
        }
    }));
}
function sendProofRequest(agent, connectionRecordId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Requesting proof...');
        const proofAttribute = {
            name: {
                name: 'name',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            age: {
                name: 'age',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            }
        };
        yield agent.proofs.requestProof({
            protocolVersion: 'v2',
            connectionId: connectionRecordId,
            proofFormats: {
                anoncreds: {
                    name: 'proof-request',
                    version: '1.0',
                    requested_attributes: proofAttribute,
                },
            },
        });
    });
}
const credentialDefinitionId = 'did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec92389/resources/f7ecd49d-9a8f-41b9-963f-17a6a6a9236c';