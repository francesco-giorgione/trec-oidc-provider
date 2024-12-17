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
const createNewInvitation = (agent) => __awaiter(void 0, void 0, void 0, function* () {
    const outOfBandRecord = yield agent.oob.createInvitation();
    return {
        oob: outOfBandRecord,
        // @ts-ignore
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: process.env.VERIFIER_ENDPOINT }),
    };
});
function getInitializedAgent() {
    return __awaiter(this, void 0, void 0, function* () {
        const verifierConfig = {
            label: process.env.VERIFIER_LABEL,
            walletConfig: {
                id: process.env.VERIFIER_WALLET_ID,
                key: process.env.VERIFIER_WALLET_KEY,
            },
            endpoints: [process.env.VERIFIER_ENDPOINT],
            // logger: new ConsoleLogger(LogLevel.debug)
        };
        const verifier = new core_1.Agent({
            // @ts-ignore
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
                            // @ts-ignore
                            network: process.env.CHEQD_NETWORK,
                            cosmosPayerSeed: process.env.COSMOS_PAYER_SEED
                        },
                    ],
                })),
                dids: new core_1.DidsModule({
                    registrars: [new cheqd_1.CheqdDidRegistrar()],
                    resolvers: [new cheqd_1.CheqdDidResolver()],
                }),
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
        verifier.registerOutboundTransport(new core_1.WsOutboundTransport());
        verifier.registerOutboundTransport(new core_1.HttpOutboundTransport());
        // @ts-ignore
        verifier.registerInboundTransport(new node_1.HttpInboundTransport({ port: process.env.VERIFIER_PORT }));
        try {
            yield verifier.initialize();
            return verifier;
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
            return yield createNewInvitation(agent);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
function abort(provider, req, res, connTimeoutDict, connectionId, connection) {
    return __awaiter(this, void 0, void 0, function* () {
        const description = connection ? 'opening connection' : 'exchanging proof';
        const result = {
            error: 'time_elapsed',
            error_description: 'Time for ' + description + ' elapsed'
        };
        delete connTimeoutDict[connectionId];
        yield provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    });
}
function setupConnectionListener(agent, oobId, objConnId, provider, req, res, connTimeoutDict) {
    agent.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, (_a) => __awaiter(this, [_a], void 0, function* ({ payload }) {
        console.log('Current connection state: ', payload.connectionRecord.state);
        const connectionId = payload.connectionRecord.id;
        try {
            if (payload.connectionRecord.outOfBandId == oobId) {
                if (payload.connectionRecord.state === core_1.DidExchangeState.RequestReceived) {
                    const timerId = setTimeout(function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            console.log('[Connection', connectionId, '] Timeout');
                            connTimeoutDict[connectionId][1] = true;
                            yield abort(provider, req, res, connTimeoutDict, connectionId, true);
                        });
                    }, 30000);
                    // Fai partire il timer
                    connTimeoutDict[connectionId] = [timerId, false];
                    objConnId.connectionId = connectionId;
                }
                if (payload.connectionRecord.state === core_1.DidExchangeState.Completed) {
                    // Se il timer non è scaduto
                    if (!connTimeoutDict[connectionId][1]) {
                        // Ferma il timer
                        clearTimeout(connTimeoutDict[connectionId][0]);
                        delete connTimeoutDict[connectionId];
                        yield sendProofRequest(agent, connectionId);
                    }
                }
            }
        }
        catch (e) {
            console.log('[Connection', connectionId, '] Error');
            yield abort(provider, req, res, connTimeoutDict, connectionId, true);
        }
    }));
}
function setUpProofDoneListener(agent, objConnId, provider, req, res, proofTimeoutDict) {
    agent.events.on(core_1.ProofEventTypes.ProofStateChanged, (_a) => __awaiter(this, [_a], void 0, function* ({ payload }) {
        console.log('Current proof state:', payload.proofRecord.state);
        const proofId = payload.proofRecord.id;
        try {
            if (payload.proofRecord.connectionId == objConnId.connectionId) {
                const proofData = yield agent.proofs.getFormatData(proofId);
                const presentation = yield proofData.presentation;
                const attrs = presentation === null || presentation === void 0 ? void 0 : presentation.anoncreds.requested_proof.revealed_attrs;
                let result = {};
                if (payload.proofRecord.state === core_1.ProofState.RequestSent) {
                    const timerId = setTimeout(function () {
                        return __awaiter(this, void 0, void 0, function* () {
                            console.log('[Proof record', proofId + '] Timeout');
                            proofTimeoutDict[proofId][1] = true;
                            yield abort(provider, req, res, proofTimeoutDict, proofId, false);
                        });
                    }, 30000);
                    // Fai partire il timer
                    proofTimeoutDict[proofId] = [timerId, false];
                }
                else if (payload.proofRecord.state === core_1.ProofState.Done && payload.proofRecord.isVerified) {
                    // Se il timer non è scaduto
                    if (!proofTimeoutDict[proofId][1]) {
                        // Ferma il timer
                        clearTimeout(proofTimeoutDict[proofId][0]);
                        const data = {
                            issuerDid: attrs.issuerDid.raw,
                            givenName: attrs.givenName.raw,
                            familyName: attrs.familyName.raw,
                            dateOfBirth: attrs.dateOfBirth.raw,
                            phone: attrs.phone.raw,
                            email: attrs.email.raw,
                            fiscalCode: attrs.fiscalCode.raw,
                            gender: attrs.gender.raw,
                        };
                        result = {
                            "login": {
                                accountId: attrs.holderDid.raw,
                            },
                        };
                        req.session.customData = data;
                        yield provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
                    }
                }
                else if (payload.proofRecord.state === core_1.ProofState.Abandoned) {
                    // Ferma il timer
                    clearTimeout(proofTimeoutDict[proofId][0]);
                    result = {
                        login: req.session.accountId,
                        error: 'access_denied',
                        error_description: 'Proof declined or not verified',
                    };
                    yield provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
                }
            }
        }
        catch (e) {
            console.log('[Proof record', proofId, '] Error');
            yield abort(provider, req, res, proofTimeoutDict, proofId, true);
        }
    }));
}
function sendProofRequest(agent, connectionRecordId) {
    return __awaiter(this, void 0, void 0, function* () {
        const credentialDefinitionId = process.env.CREDENTIAL_DEFINITION_ID || 'credential-definition-id';
        console.log('Requesting proof...');
        const proofAttribute = {
            issuerDid: {
                name: 'issuerDid',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            holderDid: {
                name: 'holderDid',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            givenName: {
                name: 'givenName',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            familyName: {
                name: 'familyName',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            dateOfBirth: {
                name: 'dateOfBirth',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            phone: {
                name: 'phone',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            email: {
                name: 'email',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            fiscalCode: {
                name: 'fiscalCode',
                restrictions: [
                    {
                        cred_def_id: credentialDefinitionId
                    },
                ],
            },
            gender: {
                name: 'gender',
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
