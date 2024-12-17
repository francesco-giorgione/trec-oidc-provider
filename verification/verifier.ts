import {
    Agent,
    AutoAcceptProof,
    ConnectionEventTypes,
    ConnectionsModule,
    ConnectionStateChangedEvent,
    CredentialsModule,
    DidExchangeState,
    DidsModule,
    HttpOutboundTransport,
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
import {AnonCredsCredentialFormatService, AnonCredsModule, AnonCredsProofFormatService} from '@credo-ts/anoncreds';
import {anoncreds} from '@hyperledger/anoncreds-nodejs';


const createNewInvitation = async (agent: Agent) => {
    const outOfBandRecord = await agent.oob.createInvitation()
    
    return {
        oob: outOfBandRecord,
        // @ts-ignore
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: process.env.VERIFIER_ENDPOINT }),
    }
}

export async function getInitializedAgent() {
    const verifierConfig = {
        label: process.env.VERIFIER_LABEL,
        walletConfig: {
            id: process.env.VERIFIER_WALLET_ID,
            key: process.env.VERIFIER_WALLET_KEY,
        },
        endpoints: [process.env.VERIFIER_ENDPOINT],
        // logger: new ConsoleLogger(LogLevel.debug)
    };
    
    const verifier = new Agent({
        // @ts-ignore
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
                            // @ts-ignore
                            network: process.env.CHEQD_NETWORK,
                            cosmosPayerSeed: process.env.COSMOS_PAYER_SEED 
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
    // @ts-ignore
    verifier.registerInboundTransport(new HttpInboundTransport({ port: process.env.VERIFIER_PORT }))
    
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
        return await createNewInvitation(agent)
    } catch (error) {
        console.error('Error:', error);
    }
}

async function abort(provider: any, req: any, res: any, connTimeoutDict: any, connectionId: string, connection: boolean) {
    const description = connection ? 'opening connection' : 'exchanging proof'
    
    const result = {
        error: 'time_elapsed',
        error_description: 'Time for ' + description + ' elapsed'
    };
    delete connTimeoutDict[connectionId]
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
}

export function setupConnectionListener(agent: Agent, oobId: string, objConnId: any, provider: any, req: any, res: any,
                                        connTimeoutDict: any) {
    agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, async ({ payload }) => {
        console.log('Current connection state: ', payload.connectionRecord.state)
        const connectionId = payload.connectionRecord.id
        
        try {            
            if(payload.connectionRecord.outOfBandId == oobId) {
                if(payload.connectionRecord.state === DidExchangeState.RequestReceived) {
                    const timerId = setTimeout(async function() {
                        console.log('[Connection', connectionId, '] Timeout')
                        connTimeoutDict[connectionId][1] = true;
                        await abort(provider, req, res, connTimeoutDict, connectionId, true)
                    }, 30000)

                    // Fai partire il timer
                    connTimeoutDict[connectionId] = [timerId, false]
                    objConnId.connectionId = connectionId
                }

                if (payload.connectionRecord.state === DidExchangeState.Completed) {
                    // Se il timer non è scaduto
                    if(!connTimeoutDict[connectionId][1]) {
                        // Ferma il timer
                        clearTimeout(connTimeoutDict[connectionId][0])

                        delete connTimeoutDict[connectionId]
                        await sendProofRequest(agent, connectionId)
                    }
                }
            }
        } catch(e) {
            console.log('[Connection', connectionId, '] Error')
            await abort(provider, req, res, connTimeoutDict, connectionId, true)
        }
    })
}

export function setUpProofDoneListener(agent: Agent, objConnId: any, provider:any, req: any, res: any, 
                                       proofTimeoutDict: any) {
    agent.events.on<ProofStateChangedEvent>(ProofEventTypes.ProofStateChanged, async ({ payload }) => {
        console.log('Current proof state:', payload.proofRecord.state)
        const proofId = payload.proofRecord.id;
        
        try {
            if(payload.proofRecord.connectionId == objConnId.connectionId) {
                const proofData = await agent.proofs.getFormatData(proofId);
                const presentation = await proofData.presentation
                const attrs = (presentation as any)?.anoncreds.requested_proof.revealed_attrs

                let result = {}

                if(payload.proofRecord.state === ProofState.RequestSent) {
                    const timerId = setTimeout(async function() {
                        console.log('[Proof record', proofId + '] Timeout')
                        proofTimeoutDict[proofId][1] = true;
                        await abort(provider, req, res, proofTimeoutDict, proofId, false)
                    }, 30000)

                    // Fai partire il timer
                    proofTimeoutDict[proofId] = [timerId, false]
                }
                else if(payload.proofRecord.state === ProofState.Done && payload.proofRecord.isVerified) {
                    // Se il timer non è scaduto
                    if(!proofTimeoutDict[proofId][1]) {
                        // Ferma il timer
                        clearTimeout(proofTimeoutDict[proofId][0])

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

                        result = {
                            "login": {
                                accountId: attrs.holderDid.raw,
                            },
                        };

                        req.session.customData = data
                        await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
                    }
                }
                else if(payload.proofRecord.state === ProofState.Abandoned) {
                    // Ferma il timer
                    clearTimeout(proofTimeoutDict[proofId][0])
                    
                    result = {
                        login: req.session.accountId,
                        error: 'access_denied',
                        error_description: 'Proof declined or not verified',
                    };

                    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
                }
            }
        } catch (e) {
            console.log('[Proof record', proofId, '] Error')
            await abort(provider, req, res, proofTimeoutDict, proofId, true)
        }
    })
}

export async function sendProofRequest(agent: Agent, connectionRecordId: string) {
    const credentialDefinitionId = process.env.CREDENTIAL_DEFINITION_ID || 'credential-definition-id'
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


