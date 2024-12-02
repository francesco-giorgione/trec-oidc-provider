import {
    Agent,
    CredentialsModule,
    AutoAcceptProof,
    ConnectionEventTypes,
    ConnectionsModule,
    ConnectionStateChangedEvent,
    ConsoleLogger,
    DidExchangeState,
    DidsModule,
    HttpOutboundTransport,
    LogLevel,
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
    CheqdDidRegistrar,
    CheqdDidResolver,
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

const verifierConfig = {
    label: 'verifier_sec',
    walletConfig: {
        id: 'verifier_sec',
        key: process.env.WALLET_KEY || 'CHANGE_YOUR_WALLET_KEY',
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
            // console.log(JSON.stringify(presentation, null, 2));

            const attrs = (presentation as any)?.anoncreds.requested_proof.revealed_attrs
            console.log('revealedAttrs:', attrs)

            const data = {
                issuerDid: attrs.issuerDid.raw,
                givenName: attrs.givenName.raw,
                familyName: attrs.familyName.raw,
                dateOfBirth: attrs.dateOfBirth.raw,
                phone: attrs.phone.raw,
                email: attrs.email.raw,
                fiscalCode: attrs.fiscalCode.raw,
                gender: attrs.gender.raw,
            }

            const result = {
                "login": {
                    accountId: attrs.holderDid.raw,
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

const credentialDefinitionId = 'did:cheqd:testnet:87874297-d824-40ea-8ae5-364a1ec90101/resources/dfde04c2-eeca-4cd5-8ff8-36cb028dd198'


