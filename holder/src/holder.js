"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const cheqd_1 = require("@credo-ts/cheqd");
const anoncreds_nodejs_1 = require("@hyperledger/anoncreds-nodejs");
const readline = __importStar(require("readline"));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
require('dotenv').config();
const holderConfig = {
    label: 'holder_sec',
    walletConfig: {
        id: 'holder_sec',
        key: process.env.WALLET_KEY || 'CHANGE_YOUR_WALLET_KEY'
    },
    endpoints: ['http://localhost:3002'],
    // logger: new ConsoleLogger(LogLevel.debug)
};
const holder = new core_1.Agent({
    config: holderConfig,
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
                    network: 'testnet',
                    cosmosPayerSeed: 'grab onion alien short practice pyramid where demise napkin phrase ill pitch',
                },
            ],
        })),
        anoncreds: new anoncreds_1.AnonCredsModule({
            registries: [new cheqd_1.CheqdAnonCredsRegistry()],
            anoncreds: anoncreds_nodejs_1.anoncreds,
        }),
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
        proofs: new core_1.ProofsModule({
            autoAcceptProofs: core_1.AutoAcceptProof.ContentApproved,
            proofProtocols: [
                new core_1.V2ProofProtocol({
                    proofFormats: [new anoncreds_1.AnonCredsProofFormatService()],
                }),
            ],
        })
    },
});
holder.registerOutboundTransport(new core_1.WsOutboundTransport());
holder.registerOutboundTransport(new core_1.HttpOutboundTransport());
holder.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3002 }));
const receiveInvitation = (invitationUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const { outOfBandRecord } = yield holder.oob.receiveInvitationFromUrl(invitationUrl);
    return outOfBandRecord;
});
const setUpCredentialListener = () => {
    holder.events.on(core_1.CredentialEventTypes.CredentialStateChanged, (_a) => __awaiter(void 0, [_a], void 0, function* ({ payload }) {
        console.log('Current state:', payload.credentialRecord.state);
        try {
            switch (payload.credentialRecord.state) {
                case core_1.CredentialState.OfferReceived:
                    yield holder.credentials.acceptOffer({ credentialRecordId: payload.credentialRecord.id });
                    break;
                case core_1.CredentialState.CredentialReceived:
                    console.log('Accepting credentials with record' + payload.credentialRecord.id);
                    yield holder.credentials.acceptCredential({ credentialRecordId: payload.credentialRecord.id });
                    break;
                case core_1.CredentialState.Done:
                    console.log(`Credential for credential id ${payload.credentialRecord.id} is accepted`);
                    yield delay(1000);
                    process.exit(0);
            }
        }
        catch (e) {
            console.log('Connection error!');
            process.exit(0);
        }
    }));
};
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const setupProofRequestListener = () => {
    holder.events.on(core_1.ProofEventTypes.ProofStateChanged, (_a) => __awaiter(void 0, [_a], void 0, function* ({ payload }) {
        console.log('current proof state', payload.proofRecord.state);
        if (payload.proofRecord.state === core_1.ProofState.RequestReceived) {
            console.log('Trying to accept proof request...');
            yield acceptProofRequest(payload.proofRecord);
        }
        else if (payload.proofRecord.state === core_1.ProofState.Done) {
            process.exit(0);
        }
    }));
};
function startTimer(timeoutMs) {
    setTimeout(() => {
        console.log("Timeout");
        process.exit(0);
    }, timeoutMs);
}
function acceptProofRequest(proofRecord) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const requestedCredentials = yield holder.proofs.selectCredentialsForRequest({
                proofRecordId: proofRecord.id,
            });
            yield holder.proofs.acceptRequest({
                proofRecordId: proofRecord.id,
                proofFormats: requestedCredentials.proofFormats,
            });
            console.log('Proof request accepted');
        }
        catch (e) {
            console.log('Wrong credentials or connection error! Declining proof request...\n', e);
            yield holder.proofs.declineRequest({
                proofRecordId: proofRecord.id,
                sendProblemReport: true,
                problemReportDescription: "Wrong proof attribute!"
            });
        }
    });
}
const didID = process.env.DID_ID || 'CHANGE_YOUR_DID_ID';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Initializing holder agent...');
        yield holder.initialize();
        // UNCOMMENT ONLY AT FIRST EXECUTION
        // try {
        //     console.log('Creating the DID...')
        //     await once.createDid(holder, didID).then(r => {})
        //     process.exit(0)
        // } catch (error) {
        //     console.error('Errore:', error);
        // }
        // COMMENT AT FIRST EXECUTION
        rl.question("Inserisci l'url per aprire la connessione\n", (invitationUrl) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Accepting the invitation...');
                startTimer(15000);
                yield receiveInvitation(invitationUrl);
                setUpCredentialListener();
                setupProofRequestListener();
            }
            catch (error) {
                console.error('Errore:', error);
            }
        }));
    });
}
main().then(r => { });
