import { describe, expect, it } from 'vitest';
import { localEditableSchema } from './esquemas.js';
import { localPorDefecto } from './plantillas.js';

describe('localPorDefecto', () => {
  it('genera un local que pasa el esquema', () => {
    const r = localEditableSchema.safeParse(localPorDefecto({ nombre: 'La Birra de Juan' }));
    expect(r.error?.issues).toBeUndefined();
  });
});
