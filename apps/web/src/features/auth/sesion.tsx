'use client';

/**
 * Sesión del staff: usuario de Firebase Auth + custom claims + locales a los que tiene acceso.
 * Cuando una Function cambia los claims, sube usuarios/{uid}.claimsVersion y acá se refresca el token.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { ClaimsMiMenu, Rol } from '@mimenu/shared';
import { firebase } from '@/lib/firebase/client';

export interface LocalDeSesion {
  id: string;
  nombre: string;
  slug: string;
  /** null = acceso de superadmin sin rol propio en el local. */
  rol: Rol | null;
}

type Sesion =
  | { estado: 'cargando' }
  | { estado: 'anonimo' }
  | {
      estado: 'lista';
      usuario: User;
      claims: ClaimsMiMenu;
      esSA: boolean;
      locales: LocalDeSesion[];
    };

type ValorSesion = Sesion & { cerrarSesion: () => Promise<void> };

const ContextoSesion = createContext<ValorSesion | null>(null);

async function leerLocales(claims: ClaimsMiMenu): Promise<LocalDeSesion[]> {
  const { db } = firebase();
  const propios = Object.entries(claims.l ?? {});
  const locales: LocalDeSesion[] = await Promise.all(
    propios.map(async ([id, rol]) => {
      const snap = await getDoc(doc(db, 'locales', id));
      return { id, rol, nombre: (snap.get('nombre') as string) ?? id, slug: (snap.get('slug') as string) ?? id };
    }),
  );
  // El superadmin ve todos los locales (soporte).
  if (claims.sa) {
    const todos = await getDocs(collection(db, 'locales'));
    for (const d of todos.docs) {
      if (!locales.some((l) => l.id === d.id)) {
        locales.push({ id: d.id, rol: null, nombre: d.get('nombre') as string, slug: d.get('slug') as string });
      }
    }
  }
  return locales.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Crea usuarios/{uid} la primera vez que alguien entra (p. ej. con Google). */
async function asegurarPerfil(usuario: User): Promise<void> {
  const { db } = firebase();
  const ref = doc(db, 'usuarios', usuario.uid);
  if ((await getDoc(ref)).exists() || !usuario.email) return;
  await setDoc(ref, {
    email: usuario.email,
    nombre: (usuario.displayName || usuario.email.split('@')[0] || 'Usuario').slice(0, 80),
    creadoEn: serverTimestamp(),
  });
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>({ estado: 'cargando' });

  useEffect(() => {
    const { auth, db } = firebase();
    let dejarDeEscucharPerfil: (() => void) | undefined;
    let versionVista: number | undefined;

    const dejarDeEscucharAuth = onIdTokenChanged(auth, async (usuario) => {
      dejarDeEscucharPerfil?.();
      dejarDeEscucharPerfil = undefined;
      if (!usuario) {
        versionVista = undefined;
        setSesion({ estado: 'anonimo' });
        return;
      }

      const token = await usuario.getIdTokenResult();
      const claims = token.claims as ClaimsMiMenu;
      const locales = await leerLocales(claims);
      setSesion({ estado: 'lista', usuario, claims, esSA: claims.sa === true, locales });

      await asegurarPerfil(usuario).catch(() => undefined);
      // Si cambian los claims (me sumaron a un local, me cambiaron el rol), refrescar el token.
      dejarDeEscucharPerfil = onSnapshot(doc(db, 'usuarios', usuario.uid), (snap) => {
        const version = snap.get('claimsVersion') as number | undefined;
        if (versionVista !== undefined && version !== versionVista) void usuario.getIdToken(true);
        versionVista = version ?? 0;
      });
    });

    return () => {
      dejarDeEscucharAuth();
      dejarDeEscucharPerfil?.();
    };
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({ ...sesion, cerrarSesion: () => signOut(firebase().auth) }),
    [sesion],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion() tiene que usarse dentro de <SesionProvider>');
  return valor;
}
