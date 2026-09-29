'use client';

import { localEditableSchema, type LocalEditable } from '@app/shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bloque, Campo, InputPesos } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({ pedidos: true, pagos: true });

export function TabPedidos({ local }: { local: LocalEditable }) {
  return (
    <FormularioSeccion esquema={esquema} inicial={{ pedidos: local.pedidos, pagos: local.pagos }}>
      {(f) => {
        const p = f.valor.pedidos;
        const pg = f.valor.pagos;
        const setP = (c: Partial<typeof p>) => f.cambiar('pedidos', { ...p, ...c });
        const setPg = (c: Partial<typeof pg>) => f.cambiar('pagos', { ...pg, ...c });
        const tr = pg.transferencia;
        return (
          <>
            <Bloque
              titulo="Pedidos desde la web"
              descripcion="Apagado: la web funciona como carta (solo se puede escribir por WhatsApp). Encendido: el cliente arma el pedido con el carrito y lo envía."
            >
              <label className="flex items-center gap-3">
                <Switch checked={p.habilitados} onCheckedChange={(c) => setP({ habilitados: c })} />
                {p.habilitados
                  ? 'Se pueden hacer pedidos con el carrito'
                  : 'Solo carta (sin carrito)'}
              </label>
              <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
                <legend className="mb-2 text-sm font-medium">Formas de entrega</legend>
                {(
                  [
                    ['takeAway', 'Retiro en el local'],
                    ['delivery', 'Delivery'],
                    ['salon', 'Para comer en el local'],
                  ] as const
                ).map(([k, n]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={p.tipos[k]}
                      onCheckedChange={(c) => setP({ tipos: { ...p.tipos, [k]: c } })}
                    />{' '}
                    {n}
                  </label>
                ))}
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Tiempo estimado (minutos)"
                  error={f.errores['pedidos.tiempoEstimadoMin']}
                >
                  {(i) => (
                    <Input
                      id={i}
                      type="number"
                      min={0}
                      value={p.tiempoEstimadoMin}
                      onChange={(e) =>
                        setP({ tiempoEstimadoMin: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  )}
                </Campo>
                <Campo etiqueta="Pedido mínimo" ayuda="0 = sin mínimo.">
                  {(i) => (
                    <InputPesos
                      id={i}
                      valor={p.pedidoMinimo}
                      onCambio={(n) => setP({ pedidoMinimo: n })}
                    />
                  )}
                </Campo>
              </div>
            </Bloque>

            <Bloque titulo="Cómo te pagan">
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={pg.efectivo} onCheckedChange={(c) => setPg({ efectivo: c })} />{' '}
                Efectivo
              </label>
              <div className="space-y-3 rounded-lg border p-3">
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={tr.habilitado}
                    onCheckedChange={(c) => setPg({ transferencia: { ...tr, habilitado: c } })}
                  />{' '}
                  Transferencia
                </label>
                {tr.habilitado && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta="Alias">
                      {(i) => (
                        <Input
                          id={i}
                          value={tr.alias}
                          onChange={(e) =>
                            setPg({ transferencia: { ...tr, alias: e.target.value.trim() } })
                          }
                        />
                      )}
                    </Campo>
                    <Campo etiqueta="Titular">
                      {(i) => (
                        <Input
                          id={i}
                          value={tr.titular}
                          onChange={(e) =>
                            setPg({ transferencia: { ...tr, titular: e.target.value } })
                          }
                        />
                      )}
                    </Campo>
                    <Campo etiqueta="CBU (opcional)" error={f.errores['pagos.transferencia.cbu']}>
                      {(i) => (
                        <Input
                          id={i}
                          inputMode="numeric"
                          value={tr.cbu ?? ''}
                          onChange={(e) =>
                            setPg({
                              transferencia: {
                                ...tr,
                                cbu: e.target.value.replace(/\D/g, '') || undefined,
                              },
                            })
                          }
                        />
                      )}
                    </Campo>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Mercado Pago (cobro online desde la web) se activa en la próxima etapa, junto con
                los pedidos que entran al panel.
              </p>
            </Bloque>
          </>
        );
      }}
    </FormularioSeccion>
  );
}
