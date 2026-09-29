'use client';

import { DOC_LOCAL, type LocalEditable } from '@app/shared';
import { EncabezadoPagina } from '@/components/panel/ui-panel';
import { Contacto } from '@/components/panel/configuracion/contacto';
import { Horarios } from '@/components/panel/configuracion/horarios';
import { useSesion } from '@/features/auth/sesion';
import { useDocumento } from '@/features/panel/firestore';

/** Configuración mínima: contacto, redes y horarios. El diseño y los textos de la web no se tocan acá. */
export default function ConfiguracionPage() {
  const sesion = useSesion();
  const { datos: local, cargando, error } = useDocumento<LocalEditable>(DOC_LOCAL);

  if (sesion.estado === 'lista' && sesion.rol !== 'dueno') {
    return <p className="text-muted-foreground">Solo el dueño puede cambiar la configuración.</p>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Contacto, redes y horarios del local."
      />
      {error && <p className="text-destructive">{error}</p>}
      {cargando || !local ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <Contacto local={local} />
          <Horarios local={local} />
        </>
      )}
    </div>
  );
}
