import {
    Agent,
    CredentialsModule,
    AutoAcceptProof,
    ConnectionEventTypes,
    ConnectionsModule,
    ConnectionStateChangedEvent,
    ConsoleLogger,
    CredentialEventTypes,
    CredentialExchangeRecord,
    CredentialState,
    CredentialStateChangedEvent,
    DidExchangeState,
    DidsModule,
    HttpOutboundTransport,
    LogLevel,
    OutOfBandRecord,
    ProofExchangeRecord,
    ProofEventTypes,
    ProofsModule,
    ProofState,
    ProofStateChangedEvent,
    V2CredentialProtocol,
    V2ProofProtocol,
    WsOutboundTransport
} from '@credo-ts/core';
import {agentDependencies, HttpInboundTransport} from '@credo-ts/node';
import {AskarModule} from '@credo-ts/askar';
import {
    CheqdAnonCredsRegistry,
    CheqdModule,
    CheqdModuleConfig,
} from '@credo-ts/cheqd';
import {ariesAskar} from '@hyperledger/aries-askar-nodejs';
import {
    AnonCredsCredentialFormatService,
    AnonCredsModule,
    AnonCredsProofFormatService
} from '@credo-ts/anoncreds';
import {anoncreds} from '@hyperledger/anoncreds-nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

const verifierConfig = {
    label: 'verifier-agent',
    walletConfig: {
        id: 'id_verifier',
        key: 'key_verifier',
    },
    endpoints: ['http://localhost:3003'],
    // logger: new ConsoleLogger(LogLevel.debug)
};

export const verifier = new Agent({
    config: verifierConfig,
    dependencies: agentDependencies,
    modules: {
        askar: new AskarModule({
            ariesAskar,
        }),
        connections: new ConnectionsModule({
            autoAcceptConnections: true
        }),
        cheqd: new CheqdModule(
            new CheqdModuleConfig({
                networks: [
                    {
                        network: 'testnet'
                    },
                ],
            })
        ),
        anoncreds: new AnonCredsModule({
            registries: [new CheqdAnonCredsRegistry()],
            anoncreds,
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
        }),
    },
})

verifier.registerOutboundTransport(new WsOutboundTransport())
verifier.registerOutboundTransport(new HttpOutboundTransport())
verifier.registerInboundTransport(new HttpInboundTransport({ port: 3003 }))

const createNewInvitation = async (agent: Agent) => {
    const outOfBandRecord = await agent.oob.createInvitation()

    return {
        oob: outOfBandRecord,
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'http://localhost:3003' }),
    }
}

export async function getInitializedAgent() {
    try {
        await verifier.initialize();
        return verifier;
    } catch (e) {
        console.log(e)
    }
}

export async function getInvitation(agent: Agent) {
    try {
        console.log('Creating the invitation for the holder...');
        const invitation = await createNewInvitation(agent);
        console.log('url: ' + invitation.invitationUrl)

        return invitation
    } catch (error) {
        console.error('Errore:', error);
    }
}

export function setupConnectionListener(agent: Agent, oobId: string, objConnId: any) {
    agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, async ({ payload }) => {
        if (payload.connectionRecord.state === DidExchangeState.Completed &&
                                                    payload.connectionRecord.outOfBandId == oobId) {

            const connectionID = payload.connectionRecord.id
            objConnId.connectionId = connectionID
            await sendProofRequest(agent, connectionID)
        }
    })
}

export function setUpProofDoneListener(agent: Agent, objConnId: any, provider:any, req: any, res: any) {
    agent.events.on<ProofStateChangedEvent>(ProofEventTypes.ProofStateChanged, async ({ payload }) => {
        console.log('current proof state', payload.proofRecord.state)

        if(payload.proofRecord.state === ProofState.Done && payload.proofRecord.isVerified &&
                                            payload.proofRecord.connectionId == objConnId.connectionId) {

            const proofData = await agent.proofs.getFormatData(payload.proofRecord.id);
            const presentation = await proofData.presentation
            const attrs = (presentation as any)?.anoncreds.requested_proof.revealed_attrs
            // console.log('revealedAttrs:', attrs)

            const data = {name: attrs.name.raw, age: attrs.age.raw}
            /*const tkn = jwt.sign(data, JWT_SECRET, {expiresIn: '1h'});
            console.log('jwt_token:', tkn) */

            const result = {
                "login": {
                    accountId: '50',
                },
            };
            
            req.session.customData = data

            console.log('sto per fare interactionFinished')
            await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
        }
    })
}

export async function sendProofRequest(agent: Agent, connectionRecordId: string) {
    console.log('Requesting proof...')

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
    }

    await agent.proofs.requestProof({
        protocolVersion: 'v2',
        connectionId: connectionRecordId,
        proofFormats: {
            anoncreds: {
                name: 'proof-request',
                version: '1.0',
                requested_attributes: proofAttribute,
            },
        },
    })
}

const credentialDefinitionId = 'did:cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec92389/resources/f7ecd49d-9a8f-41b9-963f-17a6a6a9236c'
