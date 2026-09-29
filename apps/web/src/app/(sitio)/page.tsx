import { obtenerSitio } from '@/features/sitio/datos';
import { datosEstructurados } from '@/features/sitio/json-ld';
import { ProveedorTienda } from '@/features/carrito/tienda';
import { Pie } from '@/components/publico/pie';
import { BarraPedido } from '@/components/publico/tienda/accesos-carrito';
import { BannerFecha } from '@/components/publico/tienda/banner-fecha';
import { Cabecera } from '@/components/publico/tienda/cabecera';
import { Hojas } from '@/components/publico/tienda/hojas';
import { InfoLocal } from '@/components/publico/tienda/info-local';
import { Menu, type GrupoCarta } from '@/components/publico/tienda/menu';
import { Portada } from '@/components/publico/tienda/portada';
import { PromosBento } from '@/components/publico/tienda/promos-bento';

/**
 * Web del local con experiencia de app de pedidos: portada compacta, promos, carta con "+",
 * hoja de producto, carrito y envío por WhatsApp (en la Fase 2, crearPedido).
 */
export default async function Inicio() {
  const datos = await obtenerSitio();
  if (!datos) return null; // el layout ya muestra "Volvemos pronto"
  const { local, categorias, productos, promos } = datos;

  const visible = (tipo: string) => local.web.secciones.some((s) => s.tipo === tipo && s.visible);
  const horario = {
    zonaHoraria: local.zonaHoraria,
    horarios: local.horarios,
    cierresEspeciales: local.cierresEspeciales ?? [],
  };
  const grupos: GrupoCarta[] = categorias
    .map((categoria) => ({
      categoria,
      productos: productos.filter((p) => p.categoriaId === categoria.id),
    }))
    .filter((g) => g.productos.length > 0);

  const anclas = [
    ...(visible('promos') && promos.length > 0 ? [{ href: '#promos', texto: 'Promos' }] : []),
    { href: '#carta', texto: 'Carta' },
    { href: '#info', texto: 'Info' },
  ];

  return (
    <ProveedorTienda
      datos={{
        nombreLocal: local.nombreCorto,
        whatsapp: local.contacto.whatsapp,
        mensajeWhatsApp: local.web.mensajeWhatsApp || 'Hola, quiero hacer un pedido.',
        horario,
        pedidos: local.pedidos,
        pagos: local.pagos,
        categorias,
        productos,
        promos,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(datosEstructurados(local, grupos)).replace(/</g, '\\u003c'),
        }}
      />
      <a
        href="#carta"
        className="sr-only z-50 rounded-full bg-marca px-4 py-2 font-semibold text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar a la carta
      </a>

      <Cabecera
        nombre={local.nombre}
        logoUrl={local.marca.logoUrl}
        horario={horario}
        anclas={anclas}
        conCarrito={local.pedidos.habilitados}
      />

      <main>
        <Portada
          titulo={local.web.hero.titulo || local.nombreCorto}
          bajada={local.web.hero.bajada}
          descripcion={local.descripcionCorta}
          localidad={local.direccion.localidad}
          heroDesktopUrl={local.marca.heroDesktopUrl}
          heroMovilUrl={local.marca.heroMovilUrl}
          horario={horario}
          pedidos={local.pedidos}
        />

        <BannerFecha banner={local.banner} zonaHoraria={local.zonaHoraria} />

        {visible('promos') && promos.length > 0 && (
          <section aria-labelledby="titulo-promos" className="px-4 pt-12 md:px-6 md:pt-16">
            <div id="promos" className="mx-auto max-w-6xl scroll-mt-28">
              <div className="mb-5 flex items-end justify-between">
                <h2 id="titulo-promos" className="font-titulos text-3xl md:text-4xl">
                  Promos del día
                </h2>
                <span className="text-xs font-semibold tracking-[0.25em] text-marca uppercase">
                  Ofertas
                </span>
              </div>
              <PromosBento promos={promos} zonaHoraria={local.zonaHoraria} />
            </div>
          </section>
        )}

        <section aria-labelledby="titulo-carta" className="px-4 pt-12 md:px-6 md:pt-20">
          <div id="carta" className="mx-auto max-w-6xl scroll-mt-24">
            <h2 id="titulo-carta" className="mb-2 font-titulos text-3xl md:text-4xl">
              La carta
            </h2>
            <Menu grupos={grupos} nota={local.web.notaCarta} />
          </div>
        </section>

        <InfoLocal
          nombre={local.nombre}
          nosotros={local.web.nosotros}
          galeria={local.web.galeria}
          direccion={local.direccion}
          horarios={local.horarios}
          mostrarNosotros={visible('nosotros')}
          mostrarGaleria={visible('galeria')}
          mostrarUbicacion={visible('ubicacion')}
        />
      </main>

      <Pie
        nombre={local.nombre}
        descripcion={local.descripcionCorta}
        logoUrl={local.marca.logoUrl}
        contacto={local.contacto}
        horarios={local.horarios}
        anclas={anclas}
      />

      <BarraPedido />
      <Hojas />
    </ProveedorTienda>
  );
}
