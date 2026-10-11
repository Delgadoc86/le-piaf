'use client';

import { ExternalLink } from 'lucide-react';
import type { CategoriaDatos, ProductoDatos } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EncabezadoPagina } from '@/components/panel/ui-panel';
import { TabCategorias } from '@/components/panel/carta/tab-categorias';
import { TabPrecios } from '@/components/panel/carta/tab-precios';
import { TabProductos } from '@/components/panel/carta/tab-productos';
import { useColeccion } from '@/features/panel/firestore';

export default function CartaPage() {
  const productos = useColeccion<ProductoDatos>('productos');
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const cantidades = productos.datos.reduce<Record<string, number>>(
    (a, p) => ({ ...a, [p.categoriaId]: (a[p.categoriaId] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <EncabezadoPagina
        titulo="Carta"
        descripcion="Productos, categorías y precios. Lo que guardás se ve en la web a los pocos segundos."
        acciones={
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener">
              <ExternalLink className="size-4" /> Ver la web
            </a>
          </Button>
        }
      />
      {(productos.error || categorias.error) && (
        <p className="mb-4 text-destructive">{productos.error ?? categorias.error}</p>
      )}
      {productos.cargando || categorias.cargando ? (
        <p className="text-muted-foreground">Cargando la carta…</p>
      ) : (
        <Tabs defaultValue="productos">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="productos">Productos ({productos.datos.length})</TabsTrigger>
            <TabsTrigger value="categorias">Categorías ({categorias.datos.length})</TabsTrigger>
            <TabsTrigger value="precios">Aumento de precios</TabsTrigger>
          </TabsList>
          <TabsContent value="productos" className="mt-5">
            <TabProductos productos={productos.datos} categorias={categorias.datos} />
          </TabsContent>
          <TabsContent value="categorias" className="mt-5">
            <TabCategorias categorias={categorias.datos} cantidades={cantidades} />
          </TabsContent>
          <TabsContent value="precios" className="mt-5">
            <TabPrecios productos={productos.datos} categorias={categorias.datos} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
