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
    label: 'holder_sec',
    walletConfig: {
        id: 'holder_sec',
        key: process.env.WALLET_KEY || 'CHANGE_YOUR_WALLET_KEY'
    },
    endpoints: ['http://localhost:3002'],
    // logger: new ConsoleLogger(LogLevel.debug)
};
const holder = new Agent({
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
                    network: 'testnet',
                    cosmosPayerSeed: 'grab onion alien short practice pyramid where demise napkin phrase ill pitch',
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
holder.registerInboundTransport(new HttpInboundTransport({ port: 3002 }));
const receiveInvitation = async (invitationUrl) => {
    const { outOfBandRecord } = await holder.oob.receiveInvitationFromUrl(invitationUrl);
    return outOfBandRecord;
};
const setUpCredentialListener = () => {
    holder.events.on(CredentialEventTypes.CredentialStateChanged, async ({ payload }) => {
        console.log('Current state:', payload.credentialRecord.state);
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
                process.exit(0);
        }
    });
};
const setupProofRequestListener = () => {
    holder.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }) => {
        console.log('current proof state', payload.proofRecord.state);
        if (payload.proofRecord.state === ProofState.RequestReceived) {
            console.log('Trying to accept proof request...');
            await acceptProofRequest(payload.proofRecord);
        }
        else if (payload.proofRecord.state === ProofState.Done) {
            process.exit(0);
        }
    });
};
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
        console.log('Wrong credentials! Declining proof request...\n', e);
        await holder.proofs.declineRequest({
            proofRecordId: proofRecord.id,
            sendProblemReport: true,
            problemReportDescription: "Wrong proof attribute!"
        });
    }
}
const didID = process.env.DID_ID || 'CHANGE_YOUR_DID_ID';
async function main() {
    console.log('Initializing holder agent...');
    await holder.initialize();
    // UNCOMMENT ONLY AT FIRST EXECUTION
    // try {
    //     console.log('Creating the DID...')
    //     await once.createDid(holder, didID).then(r => {})
    //     process.exit(0)
    // } catch (error) {
    //     console.error('Errore:', error);
    // }
    // COMMENT AT FIRST EXECUTION
    rl.question("Inserisci l'url per aprire la connessione\n", async (invitationUrl) => {
        try {
            console.log('Accepting the invitation...');
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
