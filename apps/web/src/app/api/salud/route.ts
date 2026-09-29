/**
 * Chequeo de salud del servidor: ¿arranca Firebase Admin y lee la base? Sirve para diagnosticar
 * deploys (p. ej. variables de entorno o dependencias que faltan en Vercel). No devuelve secretos.
 */
export async function GET() {
  const variables = {
    FIREBASE_SERVICE_ACCOUNT_JSON: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    REVALIDATE_SECRET: Boolean(process.env.REVALIDATE_SECRET),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
  };
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const local = await adminDb.doc('local/datos').get();
    return Response.json({ ok: true, variables, localExiste: local.exists, node: process.version });
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return Response.json(
      { ok: false, variables, node: process.version, error: error.slice(0, 300) },
      { status: 500 },
    );
  }
}
