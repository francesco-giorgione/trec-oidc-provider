import {
    Agent,
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
    
    const ed25519PublicKeyBase58 = key.publicKeyBase58;
    
    const did = await agent.dids.create<CheqdDidCreateOptions>({
        method: 'cheqd',
        secret: {},
        options: {},
        didDocument: new DidDocument({
            id: didID,
            controller: [didID],
            verificationMethod: [
                {
                    id: didID + '#' + key.fingerprint,
                    type: 'Ed25519VerificationKey2018',
                    controller: didID,
                    publicKeyBase58: ed25519PublicKeyBase58,
                },
            ],
            authentication: [didID + '#' + key.fingerprint],
        }),
    });

    console.log('Created DID:', did);
}