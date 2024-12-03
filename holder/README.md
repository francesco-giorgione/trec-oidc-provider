# Holder
Per avviare il server, è necessario

a) creare un nuovo progetto Express.js che includa l'intera cartella _holder_ della repo principale;

b) generare nella path principale del nuovo progetto un file .env contenente le seguenti variabili d'ambiente:

| WALLET_KEY   | DID_ID                 | 
|--------------|------------------------|
| \<your-key\> | \<your-holder-did-id\> |

- WALLET_KEY: chiave per la protezione del wallet dell'agente
- DID_ID: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec90063,
  le cifre dopo **testnet:** possono essere fissate in modo arbitario, ma devono essere univoche)

c) installare le dipendenze del progetto;
```
    npm install
```

d) nel file **src/holder.ts**, decommentare il codice dalle righe 181-187 e commentare il codice
delle righe 190-199;

e) eseguire il comando di avvio per la creazione del DID;
```
    npx tsx src/holder.ts
```

f) nel file **src/holder.ts**, commentare il codice dalle righe 181-187 e decommentare il codice
delle righe 190-199;

g) eseguire nuovamente il comando di avvio: l'holder è ora pronto per interagire con gli altri agenti tramite i link di 
invito.
```
    npx tsx src/holder.ts
```

Per successive interazioni con gli altri agenti, è sufficiente ripetere lo step _(g)_.

_Nota:_ il runtime `tsx` esegue automaticamente la compilazione del codice TypeScript. Pertanto, in seguito all'apportazione
di eventuali modifiche al codice, è sufficiente ri-eseguire il comando `npx tsx` affinché esse abbiano effetto.

