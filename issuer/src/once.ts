
import {
    Agent,
    DidCommV1Service,
    DidCommV2Service,
    DidDocument,
    KeyType
} from '@credo-ts/core';
import {
    CheqdDidCreateOptions,
} from '@credo-ts/cheqd';

export async function createDid(agent: Agent, didID: string) {
    const key = await agent.wallet.createKey({
        keyType: KeyType.Ed25519,
    });

    // encode public key according to the verification method
    const ed25519PublicKeyBase58 = key.publicKeyBase58;

    // @ts-ignore
    const did = await agent.dids.create<CheqdDidCreateOptions>({
        method: 'cheqd',
        secret: {},
        options: {},
        didDocument: new DidDocument({
            // Sintassi standard
            id: didID,
            // controller = id --> possessore del DID ha pieno controllo su di esso
            controller: [didID],
            verificationMethod: [
                {
                    id: didID + '#' + key.fingerprint,
                    type: 'Ed25519VerificationKey2018',
                    // controller = did
                    controller: didID,
                    publicKeyBase58: ed25519PublicKeyBase58,
                },
            ],
            authentication: [didID + '#' + key.fingerprint],
        }),
    });

    console.log('Created DID:', did);
}

export async function registerSchema(issuer: Agent, didID: string) {
    const schemaResult = await issuer.modules.anoncreds.registerSchema({
        schema: {
            attrNames: ['issuerDid', 'holderDid', 'givenName', 'familyName', 'dateOfBirth', 'phone', 'email', 'fiscalCode', 'gender'],
            issuerId: didID,
            name: 'trec',
            version: '1.0.0',
        },
        options: {},
    })

    if (schemaResult.schemaState.state === 'failed') {
        throw new Error(`Error creating schema: ${schemaResult.schemaState.reason}`)
    }

    console.log('Created scheme:', schemaResult);
    return schemaResult
}

export async function defineCredential(issuer: Agent, didID: string, schemaResult: any) {
    const credentialDefinitionResult = await issuer.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: {
            tag: 'default',
            issuerId: didID,
            schemaId: schemaResult.schemaState.schemaId,
        },
        options: {
            supportRevocation: false,
        },
    })

    if (credentialDefinitionResult.credentialDefinitionState.state === 'failed') {
        throw new Error(
            `Error creating credential definition: ${credentialDefinitionResult.credentialDefinitionState.reason}`
        )
    }

    console.log('Credentials created', credentialDefinitionResult)
    return credentialDefinitionResult.credentialDefinitionState.credentialDefinitionId;
}

