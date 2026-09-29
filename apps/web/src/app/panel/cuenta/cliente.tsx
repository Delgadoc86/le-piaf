'use client';

import { useState, type FormEvent } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bloque, EncabezadoPagina } from '@/components/panel/ui-panel';
import { useSesion } from '@/features/auth/sesion';
import { NOMBRE_ROL } from '@/features/panel/menu';
import { firebase, usaEmuladores } from '@/lib/firebase/client';

const MINIMO = 8;

/** Datos de la sesión y cambio de contraseña (pide la actual: Firebase exige reautenticar). */
export default function CuentaPage() {
  const sesion = useSesion();
  if (sesion.estado !== 'lista') return null;
  const email = sesion.usuario.email ?? '';

  return (
    <div className="max-w-xl space-y-6">
      <EncabezadoPagina titulo="Mi cuenta" descripcion="Tus datos para entrar al panel." />
      <Bloque titulo="Sesión">
        <p className="text-sm">
          <span className="text-muted-foreground">Email:</span> <strong>{email}</strong>
        </p>
        {sesion.rol && (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Rol:</span> {NOMBRE_ROL[sesion.rol]}
          </p>
        )}
      </Bloque>
      <CambiarContrasena email={email} />
    </div>
  );
}

function CambiarContrasena({ email }: { email: string }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const problema =
    nueva && nueva.length < MINIMO
      ? `Tiene que tener al menos ${MINIMO} caracteres.`
      : repetir && nueva !== repetir
        ? 'Las dos contraseñas nuevas no coinciden.'
        : nueva && nueva === actual
          ? 'La nueva tiene que ser distinta de la actual.'
          : null;
  const puede = actual && nueva.length >= MINIMO && nueva === repetir && !problema && !enviando;

  async function cambiar(e: FormEvent) {
    e.preventDefault();
    if (!puede) return;
    setEnviando(true);
    setError(null);
    setOk(null);
    try {
      const usuario = firebase().auth.currentUser;
      if (!usuario) throw new Error('Sin sesión');
      await reauthenticateWithCredential(usuario, EmailAuthProvider.credential(email, actual));
      await updatePassword(usuario, nueva);
      setActual('');
      setNueva('');
      setRepetir('');
      setOk('Listo, cambiaste tu contraseña. La próxima vez entrá con la nueva.');
    } catch (err) {
      const codigo = err instanceof FirebaseError ? err.code : '';
      setError(
        ['auth/invalid-credential', 'auth/wrong-password'].includes(codigo)
          ? 'La contraseña actual no es correcta.'
          : codigo === 'auth/too-many-requests'
            ? 'Demasiados intentos. Esperá unos minutos o pedí un link por mail.'
            : codigo === 'auth/weak-password'
              ? 'La contraseña nueva es muy débil.'
              : 'No pudimos cambiar la contraseña. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  async function mandarLink() {
    setError(null);
    setOk(null);
    try {
      const auth = firebase().auth;
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, email);
      setOk(
        usaEmuladores
          ? 'Con emuladores el mail no se envía: el link aparece en la UI de Auth.'
          : `Te mandamos un link a ${email} para elegir una contraseña nueva.`,
      );
    } catch {
      setError('No pudimos mandar el mail. Probá de nuevo en unos minutos.');
    }
  }

  const tipo = ver ? 'text' : 'password';
  return (
    <Bloque
      titulo="Cambiar contraseña"
      descripcion={`Usá al menos ${MINIMO} caracteres. Mejor si mezcla letras y números.`}
    >
      <form onSubmit={(e) => void cambiar(e)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="actual">Contraseña actual</Label>
          <Input
            id="actual"
            type={tipo}
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nueva">Contraseña nueva</Label>
            <Input
              id="nueva"
              type={tipo}
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="repetir">Repetila</Label>
            <Input
              id="repetir"
              type={tipo}
              autoComplete="new-password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-pressed={ver}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {ver ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {ver ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
        {problema && <p className="text-sm text-amber-700 dark:text-amber-300">{problema}</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {ok && (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
            {ok}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void mandarLink()}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ¿No te acordás de la actual? Mandame un link por mail
          </button>
          <Button type="submit" disabled={!puede}>
            {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </form>
    </Bloque>
  );
}
