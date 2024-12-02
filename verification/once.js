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
const core_1 = require("@credo-ts/core");
function createDid(agent, didID) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield agent.wallet.createKey({
            keyType: core_1.KeyType.Ed25519,
        });
        const ed25519PublicKeyBase58 = key.publicKeyBase58;
        const did = yield agent.dids.create({
            method: 'cheqd',
            secret: {},
            options: {},
            didDocument: new core_1.DidDocument({
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
    });
}
