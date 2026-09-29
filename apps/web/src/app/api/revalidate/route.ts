import { revalidateTag } from 'next/cache';
import { TAG_CARTA } from '@/features/sitio/datos';

/**
 * Lo llama la Function revalidarWeb cuando cambia la carta o el local.
 * expire: 0 → la próxima visita ya ve los datos nuevos (el dueño cambia algo, recarga y lo ve).
 */
export async function POST(req: Request) {
  const secreto = process.env.REVALIDATE_SECRET;
  if (!secreto || req.headers.get('x-revalidate-secret') !== secreto) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(TAG_CARTA, { expire: 0 });
  return Response.json({ ok: true });
}
