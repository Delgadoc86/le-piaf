'use client';

/**
 * Actualización masiva de precios: alcance, % o monto, redondeo y VISTA PREVIA antes/después.
 * La vista previa usa planAjuste (packages/shared), el mismo cálculo que aplica la Function.
 */
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  ajustePreciosInputSchema,
  formatARS,
  MULTIPLOS_REDONDEO,
  planAjuste,
  type CategoriaDatos,
  type MultiploRedondeo,
  type ProductoDatos,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ajustarPrecios } from '@/features/panel/carta';
import { cn } from '@/lib/utils';
import { Bloque, IndicadorGuardado, useGuardado } from '../ui-panel';

type Producto = ProductoDatos & { id: string };
type Categoria = CategoriaDatos & { id: string };

export function TabPrecios({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const [alcance, setAlcance] = useState<'todo' | 'categorias' | 'productos'>('todo');
  const [ids, setIds] = useState<string[]>([]);
  const [tipo, setTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [valor, setValor] = useState('10');
  const [multiplo, setMultiplo] = useState<MultiploRedondeo>(100);
  const [modo, setModo] = useState<'cercano' | 'arriba' | 'abajo'>('cercano');
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const { estado, guardar, guardando } = useGuardado();

  const numero = Number(valor.replace(',', '.'));
  const input = ajustePreciosInputSchema.safeParse({
    alcance,
    ids: alcance === 'todo' ? [] : ids,
    ajuste: { tipo, valor: tipo === 'monto' ? Math.round(numero) : numero },
    multiplo,
    modo,
  });
  const plan = useMemo(
    () => (input.success ? planAjuste(productos, input.data) : []),
    [input, productos],
  );
  const nombre = (id: string) => productos.find((p) => p.id === id)?.nombre ?? id;

  function alternar(id: string) {
    setIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  async function aplicar() {
    if (!input.success) return;
    setConfirmar(false);
    await guardar(async () => {
      const n = await ajustarPrecios(input.data);
      setResultado(`Listo: ${n} producto${n === 1 ? '' : 's'} actualizado${n === 1 ? '' : 's'}.`);
    });
  }

  const opcion = (activo: boolean) =>
    cn(
      'rounded-md border px-3 py-1.5 text-sm',
      activo ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <Bloque titulo="1. ¿A qué productos?">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['todo', 'Toda la carta'],
                ['categorias', 'Algunas categorías'],
                ['productos', 'Algunos productos'],
              ] as const
            ).map(([a, t]) => (
              <button
                key={a}
                type="button"
                className={opcion(alcance === a)}
                onClick={() => {
                  setAlcance(a);
                  setIds([]);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {alcance !== 'todo' && (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {(alcance === 'categorias' ? categorias : productos).map((x) => (
                <label
                  key={x.id}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={ids.includes(x.id)}
                    onChange={() => alternar(x.id)}
                  />
                  {x.nombre}
                </label>
              ))}
            </div>
          )}
        </Bloque>

        <Bloque titulo="2. ¿Cuánto?">
          <div className="flex gap-2">
            <button
              type="button"
              className={opcion(tipo === 'porcentaje')}
              onClick={() => setTipo('porcentaje')}
            >
              Porcentaje
            </button>
            <button
              type="button"
              className={opcion(tipo === 'monto')}
              onClick={() => setTipo('monto')}
            >
              Monto fijo
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d,.-]/g, ''))}
              className="w-32 tabular-nums"
              aria-label={tipo === 'porcentaje' ? 'Porcentaje' : 'Monto en pesos'}
            />
            <span className="text-sm text-muted-foreground">
              {tipo === 'porcentaje' ? '% (negativo para bajar)' : 'pesos (negativo para bajar)'}
            </span>
          </div>
        </Bloque>

        <Bloque titulo="3. Redondeo">
          <div className="flex flex-wrap gap-2">
            {MULTIPLOS_REDONDEO.map((m) => (
              <button
                key={m}
                type="button"
                className={opcion(multiplo === m)}
                onClick={() => setMultiplo(m)}
              >
                {m === 1 ? 'Sin redondeo' : `a $${m}`}
              </button>
            ))}
          </div>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as typeof modo)}
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
            aria-label="Sentido del redondeo"
          >
            <option value="cercano">Al más cercano</option>
            <option value="arriba">Siempre hacia arriba</option>
            <option value="abajo">Siempre hacia abajo</option>
          </select>
        </Bloque>
      </div>

      <Bloque
        titulo="Vista previa"
        descripcion="Así quedan los precios. Nada cambia hasta que apliques."
      >
        {!input.success ? (
          <p className="text-sm text-destructive">
            {input.error.issues[0]?.message ?? 'Revisá los datos.'}
          </p>
        ) : plan.length === 0 ? (
          <p className="text-sm text-muted-foreground">Con estos valores ningún precio cambia.</p>
        ) : (
          <>
            <div className="max-h-[28rem] overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 text-right font-medium">Antes</th>
                    <th className="w-6" />
                    <th className="px-3 py-2 text-right font-medium">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.flatMap((c) => {
                    const filas = [
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-1.5">{nombre(c.id)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">
                          {formatARS(c.antes.precio)}
                        </td>
                        <td>
                          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                          {formatARS(c.despues.precio)}
                        </td>
                      </tr>,
                    ];
                    c.despues.variantes.forEach((v, i) =>
                      filas.push(
                        <tr key={`${c.id}-${v.id}`}>
                          <td className="px-3 py-1 pl-7 text-muted-foreground">↳ {v.nombre}</td>
                          <td className="px-3 py-1 text-right text-muted-foreground tabular-nums">
                            {formatARS(c.antes.variantes[i]?.precio ?? 0)}
                          </td>
                          <td />
                          <td className="px-3 py-1 text-right tabular-nums">
                            {formatARS(v.precio)}
                          </td>
                        </tr>,
                      ),
                    );
                    return filas;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {resultado && estado.tipo !== 'error' ? (
                <span className="text-sm text-emerald-600">{resultado}</span>
              ) : (
                <IndicadorGuardado estado={estado} />
              )}
              <Button
                onClick={() => {
                  setResultado(null);
                  setConfirmar(true);
                }}
                disabled={guardando}
              >
                Aplicar a {plan.length} producto{plan.length === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        )}
      </Bloque>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar el cambio de precios?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizan {plan.length} productos y la web los muestra en segundos. Queda
              registrado quién lo hizo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void aplicar()}>Aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
