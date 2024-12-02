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
exports.createDid = createDid;
exports.registerSchema = registerSchema;
exports.defineCredential = defineCredential;
const core_1 = require("@credo-ts/core");
function createDid(agent, didID) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield agent.wallet.createKey({
            keyType: core_1.KeyType.Ed25519,
        });
        // encode public key according to the verification method
        const ed25519PublicKeyBase58 = key.publicKeyBase58;
        // @ts-ignore
        const did = yield agent.dids.create({
            method: 'cheqd',
            secret: {},
            options: {},
            didDocument: new core_1.DidDocument({
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
    });
}
function registerSchema(issuer, didID) {
    return __awaiter(this, void 0, void 0, function* () {
        const schemaResult = yield issuer.modules.anoncreds.registerSchema({
            schema: {
                attrNames: ['issuerDid', 'holderDid', 'givenName', 'familyName', 'dateOfBirth', 'phone', 'email', 'fiscalCode', 'gender'],
                issuerId: didID,
                name: 'trec',
                version: '1.0.0',
            },
            options: {},
        });
        if (schemaResult.schemaState.state === 'failed') {
            throw new Error(`Error creating schema: ${schemaResult.schemaState.reason}`);
        }
        console.log('Created scheme:', schemaResult);
        return schemaResult;
    });
}
function defineCredential(issuer, didID, schemaResult) {
    return __awaiter(this, void 0, void 0, function* () {
        const credentialDefinitionResult = yield issuer.modules.anoncreds.registerCredentialDefinition({
            credentialDefinition: {
                tag: 'default',
                issuerId: didID,
                schemaId: schemaResult.schemaState.schemaId,
            },
            options: {
                supportRevocation: false,
            },
        });
        if (credentialDefinitionResult.credentialDefinitionState.state === 'failed') {
            throw new Error(`Error creating credential definition: ${credentialDefinitionResult.credentialDefinitionState.reason}`);
        }
        console.log('Credentials created', credentialDefinitionResult);
        return credentialDefinitionResult.credentialDefinitionState.credentialDefinitionId;
    });
}
