# Issuer
Sono richieste le seguenti dipendenze
- `npm` versione 10.4.0
- `node` versione 18.x

Per avviare il server, è necessario

a) creare un nuovo progetto Express.js che includa l'intera cartella _issuer_ della repo principale;

b) generare nella path principale del nuovo progetto un file .env contenente le seguenti variabili d'ambiente:

| WALLET_KEY   | DID_ID                 | HOLDER_DID_ID          |
|--------------|------------------------|------------------------|
| \<your-key\> | \<your-issuer-did-id\> | \<your-holder-did-id\> |

- WALLET_KEY: chiave per la protezione del wallet dell'agente
- DID_ID: ID del DID che si vuole creare per l'agente (deve essere della forma cheqd:testnet:92874297-d824-40ea-8ae5-364a1ec90063,
  le cifre dopo **testnet:** possono essere fissate in modo arbitario, ma devono essere univoche)
- HOLDER_DID_ID: ID del DID dell'agente holder (deve coincidere con il valore della variabile d'ambiente DID_ID nel progetto per l'holder)

c) installare le dipendenze del progetto;
```
    npm install
```

d) nel file **src/issuer.ts**, decommentare il codice delle righe 171-178 e commentare il codice
delle righe 181-186;

e) eseguire il comando di avvio per la creazione del DID, dello schema di credenziali e della _credential definition_
(l'id di quest'ultima è l'ultimo valore stampato in console prima della terminazione);
```
    npx tsx src/holder.ts
```

f) sostituire con il nuovo _credentialDefinitionId_ il valore di _const credentialDefinitionId_ a riga 164;

g) nel progetto del verifier (progetto principale), sostituire con il nuovo _credentialDefinitionId_ il valore di _const credentialDefinitionId_ a riga 269
del file **verification/verifier.ts**; se il provider OIDC è già in esecuzione, è necessario ricompilare **src/verifier.ts** tramite il comando `tsc`,
per poi riavviare il server.

h) nel file **src/issuer.ts**, commentare il codice delle righe 171-178 e decommentare il codice
delle righe 181-186;

i) eseguire nuovamente il comando di avvio: l'issuer è ora pronto per interagire con l'holder.
```
    npx tsx src/holder.ts
```

Per successive interazioni con l'holder, è sufficiente ripetere lo step _(i)_.

_Nota:_ il runtime `tsx` esegue automaticamente la compilazione del codice TypeScript. Pertanto, in seguito all'apportazione
di eventuali modifiche al codice, è sufficiente ri-eseguire il comando `npx tsx` affinché esse abbiano effetto.