'use client';

/**
 * Sesión del staff: usuario de Firebase Auth + su rol en el local (custom claim { rol }).
 * Cuando una Function cambia el rol, sube usuarios/{uid}.claimsVersion y acá se refresca el token.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ROLES, type ClaimsLocal, type Rol } from '@app/shared';
import { firebase } from '@/lib/firebase/client';

type Sesion =
  | { estado: 'cargando' }
  | { estado: 'anonimo' }
  /** rol null = tiene cuenta (p. ej. entró con Google) pero no es parte del equipo. */
  | { estado: 'lista'; usuario: User; rol: Rol | null };

type ValorSesion = Sesion & { cerrarSesion: () => Promise<void> };

const ContextoSesion = createContext<ValorSesion | null>(null);

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

      const { rol } = (await usuario.getIdTokenResult()).claims as ClaimsLocal;
      setSesion({ estado: 'lista', usuario, rol: rol && ROLES.includes(rol) ? rol : null });

      // Si cambia el rol (me invitaron, me cambiaron de puesto), refrescar el token.
      dejarDeEscucharPerfil = onSnapshot(
        doc(db, 'usuarios', usuario.uid),
        (snap) => {
          const version = snap.get('claimsVersion') as number | undefined;
          if (versionVista !== undefined && version !== versionVista) void usuario.getIdToken(true);
          versionVista = version ?? 0;
        },
        () => undefined, // sin perfil todavía: nada que escuchar
      );
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
