'use client';

/**
 * Generador de QR de la carta: QR con el logo al centro, descarga en PNG e impresión
 * (1 tarjeta grande o 4 por hoja A4). "Guardar como PDF" sale del diálogo de impresión.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import { DOC_LOCAL, type LocalEditable } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bloque, Campo, EncabezadoPagina } from '@/components/panel/ui-panel';
import { useDocumento } from '@/features/panel/firestore';
import { cn } from '@/lib/utils';

/** El logo pasa por el optimizador de Next (mismo origen: así el canvas se puede exportar). Next 16 solo acepta q=75 por defecto. */
const logoMismoOrigen = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=384&q=75`;

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = mal;
    img.src = src;
  });
}

/** QR en canvas (corrección alta) con el logo sobre un recuadro del color de la marca. */
async function generarQR(
  url: string,
  opciones: { logo?: string; fondoLogo: string; color: string; lado: number },
) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: opciones.lado,
    color: { dark: opciones.color, light: '#ffffff' },
  });
  if (opciones.logo) {
    try {
      const img = await cargarImagen(logoMismoOrigen(opciones.logo));
      const ctx = canvas.getContext('2d')!;
      const caja = opciones.lado * 0.26;
      const x = (opciones.lado - caja) / 2;
      ctx.fillStyle = opciones.fondoLogo;
      ctx.beginPath();
      ctx.roundRect(x, x, caja, caja, caja * 0.18);
      ctx.fill();
      const escala = Math.min((caja * 0.8) / img.width, (caja * 0.8) / img.height);
      const [w, h] = [img.width * escala, img.height * escala];
      ctx.drawImage(img, (opciones.lado - w) / 2, (opciones.lado - h) / 2, w, h);
    } catch {
      // Sin logo si no se pudo cargar: el QR sigue sirviendo.
    }
  }
  return canvas.toDataURL('image/png');
}

export default function QrPage() {
  const { datos: local } = useDocumento<LocalEditable>(DOC_LOCAL);
  // Por defecto, la dirección de este sitio (en producción, el dominio del local). El panel solo se
  // renderiza en el navegador (después de validar la sesión), así que window existe.
  const [url, setUrl] = useState(
    () =>
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window === 'undefined' ? '' : window.location.origin),
  );
  const titulo = 'Escaneá y mirá la carta';
  const [porHoja, setPorHoja] = useState<1 | 4>(1);
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!url || !local) return;
    let vigente = true;
    void generarQR(url, {
      logo: local.marca.logoUrl,
      fondoLogo: local.marca.colorFondo,
      color: '#000000',
      lado: 1024,
    }).then((d) => vigente && setQr(d));
    return () => {
      vigente = false;
    };
  }, [url, local]);

  async function descargar() {
    if (!local) return;
    const grande = await generarQR(url, {
      logo: local.marca.logoUrl,
      fondoLogo: local.marca.colorFondo,
      color: '#000000',
      lado: 2048,
    });
    const a = document.createElement('a');
    a.href = grande;
    a.download = `qr-carta-${(local.nombreCorto || 'local').toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  const tarjeta = (chica: boolean) =>
    local && (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl text-center',
          chica ? 'gap-2 p-5' : 'gap-4 p-10',
        )}
        style={{ background: local.marca.colorFondo, color: local.marca.colorTexto }}
      >
        {local.marca.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- se imprime: img simple, sin optimizador
          <img
            src={logoMismoOrigen(local.marca.logoUrl)}
            alt={local.nombre}
            className={chica ? 'h-10' : 'h-20'}
          />
        )}
        <p
          className={cn('font-semibold', chica ? 'text-sm' : 'text-2xl')}
          style={{ color: local.marca.colorPrimario }}
        >
          {titulo}
        </p>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el navegador
          <img
            src={qr}
            alt="Código QR de la carta"
            className={cn('rounded-xl bg-white p-2', chica ? 'w-40' : 'w-72')}
          />
        )}
        <p className={cn('opacity-80', chica ? 'text-[10px]' : 'text-sm')}>
          {url.replace(/^https?:\/\//, '')}
        </p>
      </div>
    );

  return (
    <div className="max-w-5xl">
      {/* Al imprimir, solo sale la hoja con las tarjetas. */}
      <style>{`@media print{@page{size:A4;margin:10mm}body *{visibility:hidden}#hoja-qr,#hoja-qr *{visibility:visible}#hoja-qr{position:absolute;inset:0}}`}</style>
      <EncabezadoPagina
        titulo="QR de la carta"
        descripcion="Para las mesas, la vidriera o el mostrador. Lleva a la web con la carta y los pedidos."
      />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Bloque titulo="Opciones">
            <Campo
              etiqueta="Dirección que abre el QR"
              ayuda="Cuando esté el dominio del local, poné ese."
            >
              {(i) => <Input id={i} value={url} onChange={(e) => setUrl(e.target.value.trim())} />}
            </Campo>
            <fieldset className="flex gap-2">
              <legend className="mb-2 text-sm font-medium">Al imprimir</legend>
              {([1, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPorHoja(n)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm',
                    porHoja === n
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  {n === 1 ? '1 grande' : '4 por hoja (mesas)'}
                </button>
              ))}
            </fieldset>
          </Bloque>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void descargar()} disabled={!qr}>
              <Download className="size-4" /> Descargar PNG
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!qr}>
              <Printer className="size-4" /> Imprimir o guardar PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Para PDF: en el diálogo de impresión elegí “Guardar como PDF”. Probá escanear el QR con
            el celular antes de imprimir.
          </p>
        </div>

        <div
          id="hoja-qr"
          className={cn('grid gap-4', porHoja === 4 ? 'grid-cols-2' : 'grid-cols-1')}
        >
          {Array.from({ length: porHoja }, (_, i) => (
            <div key={i}>{tarjeta(porHoja === 4)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
