import { setGlobalOptions } from 'firebase-functions/v2';

// São Paulo: la región más cercana a Argentina (ROADMAP §8).
// Va en su propio módulo e importado primero: en ESM los imports se evalúan antes que el cuerpo de index.ts.
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });
