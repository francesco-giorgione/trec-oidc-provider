import { DidDocument, KeyType } from '@credo-ts/core';
export async function createDid(agent, didID) {
    const key = await agent.wallet.createKey({
        keyType: KeyType.Ed25519,
    });
    const ed25519PublicKeyBase58 = key.publicKeyBase58;
    const did = await agent.dids.create({
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
