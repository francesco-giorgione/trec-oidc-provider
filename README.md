# TreC-oidc-provider
Questa è la repo principale del progetto sviluppato durante la mia attività di tirocinio presso lo spin-off INNOVA4TECH, 
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
il loro avvio. Il README dell'issuer e dell'holder è reperibile nelle rispettive cartelle.


# Setup
Prima di avviare il verifier, si raccomanda di eseguire preventivamente il setup, in ordine, dell'holder e dell'issuer (vedi i 
rispettivi README).

Sono richieste le seguenti dipendenze
- `npm` versione 10.4.0
- `node` versione 18.x

## Provider OIDC
Per avviare il server, è necessario

a) generare nella path principale un file .env contenente le seguenti variabili d'ambiente:

| DEBUG            | SESSION_SECRET  | WALLET_KEY   | DID_ID                   | TREC_ID                            |
|------------------|-----------------|--------------|--------------------------|------------------------------------|
| oidc-provider:*  | \<your-secret\> | \<your-key\> | \<your-verifier-did-id\> | c_24f7d433899443d68ca84ad4913ec53f |

- DEBUG: il valore indicato abilita la stampa di messaggi di debug sul provider OIDC
- SESSION_SECRET: chiave per la cifratura dei cookie di sessione
- WALLET_KEY: chiave per la protezione del wallet dell'agente
- DID_ID: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec90063,
    le cifre dopo **testnet:** possono essere fissate in modo arbitario, ma devono essere univoche)
- TREC_ID: il valore indicato è l'id dell'app, concordato con FBK e inserito nell'access token


b) installare le dipendenze del progetto;
```
    npm install
```

c) modificare i seguenti ulteriori parametri di sicurezza (opzionale per l'avvio).

| PARAMETRO             | FILE        |
|-----------------------|-------------|
| provider.cookies.keys | provider.js |
| provider.jwks.keys    | provider.js |

d) nel file **verifier.ts**, modificare il valore di _const credentialDefinitionId_ (riga 269)
con l'id delle credenziali generate in fase di setup dell'issuer;

e) eseguire il comando di avvio:
```
    node index.js
```