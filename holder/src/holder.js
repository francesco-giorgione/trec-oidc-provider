import { Agent, AutoAcceptProof, ConnectionsModule, CredentialEventTypes, CredentialsModule, CredentialState, DidsModule, HttpOutboundTransport, ProofEventTypes, ProofsModule, ProofState, V2CredentialProtocol, V2ProofProtocol, WsOutboundTransport } from '@credo-ts/core';
import { agentDependencies, HttpInboundTransport } from '@credo-ts/node';
import { AskarModule } from '@credo-ts/askar';
import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
import { AnonCredsCredentialFormatService, AnonCredsModule, AnonCredsProofFormatService, } from '@credo-ts/anoncreds';
import { CheqdAnonCredsRegistry, CheqdDidRegistrar, CheqdDidResolver, CheqdModule, CheqdModuleConfig, } from '@credo-ts/cheqd';
import { anoncreds } from '@hyperledger/anoncreds-nodejs';
import * as readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
require('dotenv').config();
const holderConfig = {
    label: process.env.HOLDER_LABEL,
    walletConfig: {
        id: process.env.HOLDER_WALLET_ID,
        key: process.env.WALLET_KEY
    },
    endpoints: [process.env.HOLDER_ENDPOINT],
    // logger: new ConsoleLogger(LogLevel.debug)
};
const holder = new Agent({
    // @ts-ignore
    config: holderConfig,
    dependencies: agentDependencies,
    modules: {
        askar: new AskarModule({
            ariesAskar,
        }),
        connections: new ConnectionsModule({
            autoAcceptConnections: true
        }),
        cheqd: new CheqdModule(new CheqdModuleConfig({
            networks: [
                {
                    // @ts-ignore
                    network: process.env.CHEQD_NETWORK,
                    cosmosPayerSeed: process.env.HOLDER_COSMOS_SEED,
                },
            ],
        })),
        anoncreds: new AnonCredsModule({
            registries: [new CheqdAnonCredsRegistry()],
            anoncreds,
        }),
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
        proofs: new ProofsModule({
            autoAcceptProofs: AutoAcceptProof.ContentApproved,
            proofProtocols: [
                new V2ProofProtocol({
                    proofFormats: [new AnonCredsProofFormatService()],
                }),
            ],
        })
    },
});
holder.registerOutboundTransport(new WsOutboundTransport());
holder.registerOutboundTransport(new HttpOutboundTransport());
// @ts-ignore
holder.registerInboundTransport(new HttpInboundTransport({ port: process.env.HOLDER_PORT }));
const receiveInvitation = async (invitationUrl) => {
    const { outOfBandRecord } = await holder.oob.receiveInvitationFromUrl(invitationUrl);
    return outOfBandRecord;
};
const setUpCredentialListener = () => {
    holder.events.on(CredentialEventTypes.CredentialStateChanged, async ({ payload }) => {
        console.log('Current state:', payload.credentialRecord.state);
        try {
            switch (payload.credentialRecord.state) {
                case CredentialState.OfferReceived:
                    await holder.credentials.acceptOffer({ credentialRecordId: payload.credentialRecord.id });
                    break;
                case CredentialState.CredentialReceived:
                    console.log('Accepting credentials with record' + payload.credentialRecord.id);
                    await holder.credentials.acceptCredential({ credentialRecordId: payload.credentialRecord.id });
                    break;
                case CredentialState.Done:
                    console.log(`Credential for credential id ${payload.credentialRecord.id} is accepted`);
                    await delay(1000);
                    process.exit(0);
            }
        }
        catch (e) {
            console.log('Connection error!');
            process.exit(0);
        }
    });
};
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const setupProofRequestListener = () => {
    holder.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }) => {
        console.log('current proof state', payload.proofRecord.state);
        if (payload.proofRecord.state === ProofState.RequestReceived) {
            console.log('Trying to accept proof request...');
            await acceptProofRequest(payload.proofRecord);
        }
        else if (payload.proofRecord.state === ProofState.Done || payload.proofRecord.state === ProofState.Declined) {
            process.exit(0);
        }
    });
};
function startTimer(timeoutMs) {
    setTimeout(() => {
        console.log("Timeout");
        process.exit(0);
    }, timeoutMs);
}
async function acceptProofRequest(proofRecord) {
    try {
        const requestedCredentials = await holder.proofs.selectCredentialsForRequest({
            proofRecordId: proofRecord.id,
        });
        await holder.proofs.acceptRequest({
            proofRecordId: proofRecord.id,
            proofFormats: requestedCredentials.proofFormats,
        });
        console.log('Proof request accepted');
    }
    catch (e) {
        console.log('Wrong credentials or connection error! Declining proof request...\n', e);
        await holder.proofs.declineRequest({
            proofRecordId: proofRecord.id,
            sendProblemReport: true,
            problemReportDescription: "Wrong proof attribute!"
        });
    }
}
const didID = process.env.DID_ID;
async function main() {
    console.log('Initializing holder agent...');
    await holder.initialize();
    // UNCOMMENT ONLY AT FIRST EXECUTION
    // try {
    //     console.log('Creating the DID...')
    //     await once.createDid(holder, didID).then(r => {})
    //     process.exit(0)
    //     console.error('Errore:', error);
    // }
    // COMMENT AT FIRST EXECUTION
    rl.question("Inserisci l'url per aprire la connessione\n", async (invitationUrl) => {
        try {
            console.log('Accepting the invitation...');
            startTimer(15000);
            await receiveInvitation(invitationUrl);
            setUpCredentialListener();
            setupProofRequestListener();
        }
        catch (error) {
            console.error('Errore:', error);
        }
    });
}
main().then(r => { });
