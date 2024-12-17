# TreC-oidc-provider
Questa è la repo principale del progetto sviluppato durante la mia attività di tirocinio presso lo spin-off INNOVA4TECH
dell'Università degli Studi di Salerno, 
sotto la supervisione del prof. Christian Esposito e del dott. Biagio Boi.

# Struttura
Il contenuto di questa repo è l'implementazione di un provider OIDC per l'autenticazione SSI-based degli utenti: i token
di accesso sono rilasciati in seguito alla verifica di credenziali anonime verificabili fornite dall'utente.

Lo schema delle credenziali verificabili utilizzate è rapperesentato nella tabella seguente.

| issuerDid | holderDid | givenName | familyName | dateOfBirth | phone | email | fiscalCode | gender |
|-----------|-----------|-----------|------------|-------------|-------|-------|------------|--------|
|           |           |           |            |             |       |       |            |        |


Nello schema SSI, il provider funge da verifier. 

La repo contiene anche una cartella per ciascuno degli altri due agenti del sistema:
- l'issuer, per l'emissione delle credenziali verificabili;
- l'holder, per la ricezione delle credenziali verificabili e il loro inoltro al provider OIDC.

Per ciascuno dei tre agenti, è presente un README che ne fornisce le informazioni principali, comprese le istruzioni per
il loro avvio. I README dell'issuer e dell'holder sono reperibili nelle rispettive cartelle.


# Setup
Prima di eseguire le seguenti istruzioni, si raccomanda di eseguire **preventivamente** il setup, **in ordine**, dell'holder e dell'issuer (vedi i 
rispettivi README).

Sono richieste le seguenti dipendenze
- `npm` versione 10.4.0
- `node` versione 18.x

## Provider OIDC
Per avviare il server, è necessario eseguire le operazioni seguenti

a) Assegnare valori significativi alle variabili di ambiente contenute nel file `.env` della path principale del progetto.


`DEBUG`: il valore riportato nel sample abilita la stampa di messaggi di debug sul provider OIDC

`SESSION_SECRET`: chiave utilizzata per la cifratura dei cookie di sessione

`DID_ID`: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:**\[mainnet _or_ testnet\]**:92874297-d824-40ea-8ae5-364a1ec90063,
    le cifre dopo **testnet/mainnet:** possono essere fissate in modo arbitario, ma devono essere univoche)

`TREC_ID`: ID dell'app client; la mia implementazione utilizza **c_24f7d433899443d68ca84ad4913ec53f** (concordato con FBK)

`CLIENT_SECRET`: segreto utilizzato per autenticare il client durante l'interazione con il provider OIDC

`PROVIDER_URL`: dominio del provider OIDC, utilizzato per il recupero del JWKS; per la mia implementazione è **https://ssi.dlab.stream**
 (concordato con FBK)

`COOKIES_KEY`: chiave utilizzata per la firma dei cookie

`AUTH_ENDPOINT`: endpoint del provider OIDC da contattare per l'avvio del processo di autenticazione

`TOKEN_ENDPOINT`: endpoint del provider OIDC da contattare per il rilascio del token

`SCOPES`: specifica dei permessi richiesti; la mia implementazione utilizza il valore indicato nel sample

`TREC_REDIRECT_URI`: URL di callback da richiamare al termine del processo di autenticazione

`AT_TTL`: validità (in secondi) dell'access token

`ID_TTL`: validità (in secondi) dell'id token

`RT_TTL`: validità (in secondi) del refresh token

`CORS_ORIGIN`: URL dell'app client (da cui provengono le richieste del provider); è della forma **http://host:port**

`PORT`: porta del provider OIDC

`VERIFIER_LABEL`: etichetta del verifier

`VERIFIER_WALLET_ID`: ID del wallet del verifier

`VERIFIER_WALLET_KEY`: chiave a protezione del wallet del verifier

`VERIFIER_ENDPOINT`: endpoint del verifier; è della forma **http://host:port**

`VERIFIER_COSMOS_SEED`: frase mnemonica per l'accesso e la gestione del wallet Cosmos

`VERIFIER_PORT`: porta del verifier (diversa da `PORT`)

`CHEQD_NETWORK`: `mainnet` per usare la rete principale di Cosmos, `testnet` per usare la rete di test

`CREDENTIAL_DEFINITION_ID`: ID delle credenziali generate in fase di setup dell'issuer


b) Installare le dipendenze del progetto.
```
    npm install
```

c) **Soltanto per la prima esecuzione:** de-commentare il codice delle righe 56-60 del file `index.js` per creare il DID document
avente come ID il valore di `DID_ID` in `.env`. Tale operazione va evitata se si dispone già di un DID document. In ogni caso,
dopo l'eventuale esecuzione dell'operazione, bisogna **ri-commentare** le righe 56-60 del file `index.js`.

d) Modificare i seguenti ulteriori parametri di sicurezza (opzionale per l'avvio).

| PARAMETRO             | FILE        |
|-----------------------|-------------|
| provider.cookies.keys | provider.js |
| provider.jwks.keys    | provider.js |
| cookie.secure         | index.js    |


e) Ricompilare il file `verification/verifier.ts` tramite il comando `tsc`.

f) Eseguire il comando di avvio seguente.
```
    node index.js
```