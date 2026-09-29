'use client';

import { ExternalLink } from 'lucide-react';
import { DOC_LOCAL, type LocalEditable } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EncabezadoPagina } from '@/components/panel/ui-panel';
import { TabHorarios } from '@/components/panel/configuracion/tab-horarios';
import { TabLocal } from '@/components/panel/configuracion/tab-local';
import { TabMarca } from '@/components/panel/configuracion/tab-marca';
import { TabPedidos } from '@/components/panel/configuracion/tab-pedidos';
import { TabWeb } from '@/components/panel/configuracion/tab-web';
import { useSesion } from '@/features/auth/sesion';
import { useDocumento } from '@/features/panel/firestore';

export default function ConfiguracionPage() {
  const sesion = useSesion();
  const { datos: local, cargando, error } = useDocumento<LocalEditable>(DOC_LOCAL);

  if (sesion.estado === 'lista' && sesion.rol !== 'dueno') {
    return (
      <p className="text-muted-foreground">
        Solo el dueño puede cambiar la configuración del local.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <EncabezadoPagina
        titulo="Configuración"
        descripcion="Datos, horarios, marca y textos de la web. Cada pestaña se guarda por separado."
        acciones={
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener">
              <ExternalLink className="size-4" /> Ver la web
            </a>
          </Button>
        }
      />
      {error && <p className="text-destructive">{error}</p>}
      {cargando || !local ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <Tabs defaultValue="local">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="local">Local</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="marca">Marca</TabsTrigger>
            <TabsTrigger value="web">Web</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos y pagos</TabsTrigger>
          </TabsList>
          <TabsContent value="local" className="mt-5">
            <TabLocal local={local} />
          </TabsContent>
          <TabsContent value="horarios" className="mt-5">
            <TabHorarios local={local} />
          </TabsContent>
          <TabsContent value="marca" className="mt-5">
            <TabMarca local={local} />
          </TabsContent>
          <TabsContent value="web" className="mt-5">
            <TabWeb local={local} />
          </TabsContent>
          <TabsContent value="pedidos" className="mt-5">
            <TabPedidos local={local} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
