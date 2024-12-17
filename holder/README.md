# Holder
Sono richieste le seguenti dipendenze
- `npm` versione 10.4.0
- `node` versione 18.x

Per avviare il server, è necessario eseguire le operazioni seguenti.

a) Creare un nuovo progetto Express.js che includa l'intera cartella _holder_ della repo principale.

b) Assegnare valori significativi alle variabili di ambiente contenute nel file `.env` della path principale del progetto.

`WALLET KEY`: chiave per la protezione del wallet dell'holder

`DID_ID`: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:**testnet/mainnet**:92874297-d824-40ea-8ae5-364a1ec90063,
  le cifre dopo **testnet (o mainnet):** possono essere fissate in modo arbitario, ma devono essere univoche)

`HOLDER_LABEL`: etichetta dell'holder

`HOLDER_WALLET_ID`: ID del wallet dell'holder

`HOLDER_ENDPOINT`: endpoint dell'holder; è della forma **http://host_port**

`CHEQD_NETWORK`: `mainnet` per usare la rete principale di Cosmos, `testnet` per usare la rete di test

`HOLDER_COSMOS_SEED`: frase mnemonica per l'accesso e la gestione del wallet Cosmos

`HOLDER_PORT`: porta dell'holder

c) Installare le dipendenze del progetto;
```
    npm install
```

d) nel file **src/holder.ts**, decommentare il codice delle righe 203-209 e commentare il codice
delle righe 212-222;

e) eseguire il comando di avvio per la creazione del DID;
```
    npx tsx src/holder.ts
```

f) nel file **src/holder.ts**, commentare il codice delle righe 203-209 e decommentare il codice
delle righe 212-222;

g) eseguire nuovamente il comando di avvio: l'holder è ora pronto per interagire con gli altri agenti tramite i link di 
invito.
```
    npx tsx src/holder.ts
```

Per successive interazioni con gli altri agenti, è sufficiente ripetere lo step _(g)_.

_Nota:_ il runtime `tsx` esegue automaticamente la compilazione del codice TypeScript. Pertanto, in seguito all'apportazione
di eventuali modifiche al codice, è sufficiente ri-eseguire il comando `npx tsx` affinché esse abbiano effetto.

