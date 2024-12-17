# Issuer
Sono richieste le seguenti dipendenze
- `npm` versione 10.4.0
- `node` versione 18.x

Per avviare il server, è necessario eseguire le operazioni seguenti.

a) Creare un nuovo progetto Express.js che includa l'intera cartella _issuer_ della repo principale.

b) Assegnare valori significativi alle variabili di ambiente contenute nel file `.env` della path principale del progetto.

`ISSUER_WALLET_KEY`: chiave per la protezione del wallet dell'issuer

`DID_ID`: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:**testnet/mainnet**:92874297-d824-40ea-8ae5-364a1ec90063,
le cifre dopo **testnet (o mainnet):** possono essere fissate in modo arbitario, ma devono essere univoche)

`HOLDER_DID_ID`: ID del DID dell'holder (**importante:** deve coincidere con il valore della variabile d'ambiente `DID_ID` nel progetto per l'holder)

`ISSUER_LABEL`: label dell'issuer

`ISSUER_WALLET_ID`: ID del wallet dell'issuer

`ISSUER_ENDPOINT`: endpoint dell'issuer; è della forma **http://host:port**

`CHEQD_NETWORK`: `mainnet` per usare la rete principale di Cosmos, `testnet` per usare la rete di test

`ISSUER_COSMOS_SEED`: frase mnemonica per l'accesso e la gestione del wallet Cosmos 

`ISSUER_PORT`: porta dell'issuer

`ISSUER_URL`: URL dell'issuer

`CREDENTIAL_DEFINITION_ID`: ID della credential definition delle credenziali emesse (vedi punto _f_ per maggiori dettagli)


c) Installare le dipendenze del progetto.
```
    npm install
```

d) Nel file **src/issuer.ts**, decommentare il codice delle righe 193-200 e commentare il codice
delle righe 203-208.

e) Eseguire il comando di avvio per la creazione del DID, dello schema di credenziali e della _credential definition_
(l'id di quest'ultima è l'ultimo valore stampato in console prima della terminazione).
```
    npx tsx src/holder.ts
```

f) Sostituire con il nuovo _credentialDefinitionId_ nella variabile d'ambiente `CREDENTIAL_DEFINITION_ID`.

g) Nel progetto del verifier (progetto principale), sostituire con il nuovo _credentialDefinitionId_ il valore della 
variabile d'ambiente `CREDENTIAL_DEFINITION_ID`.

h) Nel file **src/issuer.ts**, commentare il codice delle righe 193-200 e decommentare il codice
delle righe 203-208;

i) Eseguire nuovamente il comando di avvio: l'issuer è ora pronto per interagire con l'holder.
```
    npx tsx src/holder.ts
```

Per successive interazioni con l'holder, è sufficiente ripetere lo step _(i)_.

_Nota:_ il runtime `tsx` esegue automaticamente la compilazione del codice TypeScript. Pertanto, in seguito all'apportazione
di eventuali modifiche al codice, è sufficiente ri-eseguire il comando `npx tsx` affinché esse abbiano effetto.