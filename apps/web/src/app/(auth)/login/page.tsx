'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowLeft, Eye, EyeOff, Lock, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSesion } from '@/features/auth/sesion';
import {
  bloqueadoHasta,
  intentosRestantes,
  limpiarIntentos,
  registrarFallo,
} from '@/features/auth/intentos';
import { firebase, usaEmuladores } from '@/lib/firebase/client';
import { NOMBRE_LOCAL } from '@/lib/local';

const esCredencialIncorrecta = (codigo: string) =>
  ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(codigo);

function mensajeDeError(codigo: string): string {
  if (esCredencialIncorrecta(codigo)) return 'El email o la contraseña no son correctos.';
  switch (codigo) {
    case 'auth/invalid-email':
      return 'Revisá el email.';
    case 'auth/user-disabled':
      return 'Esta cuenta está desactivada. Hablá con el dueño del local.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisá internet y probá de nuevo.';
    default:
      return 'No pudimos iniciar sesión. Probá de nuevo.';
  }
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Modo = 'entrar' | 'recuperar';

export default function LoginPage() {
  const sesion = useSesion();
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [bloqueo, setBloqueo] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    if (sesion.estado === 'lista') router.replace('/panel');
  }, [sesion.estado, router]);

  // Cuenta regresiva mientras dura el bloqueo.
  useEffect(() => {
    if (!bloqueo) return;
    const t = setInterval(() => {
      const n = Date.now();
      setAhora(n);
      if (n >= bloqueo) setBloqueo(null);
    }, 1000);
    return () => clearInterval(t);
  }, [bloqueo]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    const hasta = bloqueadoHasta(email);
    if (hasta) {
      setAhora(Date.now());
      setBloqueo(hasta);
      return;
    }
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(firebase().auth, email.trim(), contrasena);
      limpiarIntentos(email);
    } catch (err) {
      const codigo = err instanceof FirebaseError ? err.code : '';
      if (codigo === 'auth/too-many-requests' || esCredencialIncorrecta(codigo)) {
        const nuevoBloqueo = registrarFallo(email, codigo === 'auth/too-many-requests');
        if (nuevoBloqueo) {
          setAhora(Date.now());
          setBloqueo(nuevoBloqueo);
          return;
        }
        const quedan = intentosRestantes(email);
        setError(
          `${mensajeDeError(codigo)} ${
            quedan === 1 ? 'Te queda 1 intento' : `Te quedan ${quedan} intentos`
          } antes de esperar 10 minutos.`,
        );
      } else {
        setError(mensajeDeError(codigo));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function recuperar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (!email.trim()) {
      setError('Escribí tu email.');
      return;
    }
    setEnviando(true);
    try {
      const auth = firebase().auth;
      auth.languageCode = 'es'; // el mail de Firebase sale en español
      await sendPasswordResetEmail(auth, email.trim());
      // Con la contraseña nueva tiene que poder entrar sin esperar el bloqueo.
      limpiarIntentos(email);
      setBloqueo(null);
      setAviso(
        usaEmuladores
          ? 'Listo. Con emuladores el mail no se envía: el link aparece en la terminal y en la UI de Auth.'
          : `Si ${email.trim()} tiene cuenta, te llegó un mail con un link para elegir una contraseña nueva. Revisá también la carpeta de spam.`,
      );
    } catch (err) {
      const codigo = err instanceof FirebaseError ? err.code : '';
      setError(
        codigo === 'auth/invalid-email'
          ? 'Revisá el email.'
          : codigo === 'auth/too-many-requests'
            ? 'Pediste varios links seguidos. Esperá unos minutos y revisá tu mail.'
            : 'No pudimos mandar el mail. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  function irA(m: Modo) {
    setModo(m);
    setError(null);
    setAviso(null);
  }

  const campoEmail = (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setBloqueo(null);
        }}
      />
    </div>
  );

  if (modo === 'recuperar') {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Te mandamos un link a tu email para que elijas una contraseña nueva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aviso ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto size-10 text-emerald-600" aria-hidden />
              <p role="status" className="text-sm">
                {aviso}
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void recuperar(e)} className="space-y-4">
              {campoEmail}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviarme el link'}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <button
            type="button"
            onClick={() => irA('entrar')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver a entrar
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{NOMBRE_LOCAL}</CardTitle>
        <CardDescription>Entrá al panel del local con tu email y contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        {bloqueo ? (
          <div className="space-y-4 text-center" role="alert">
            <Lock className="mx-auto size-10 text-destructive" aria-hidden />
            <div>
              <p className="font-semibold">Demasiados intentos fallidos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Por seguridad, esperá{' '}
                <strong className="text-foreground tabular-nums">{mmss(bloqueo - ahora)}</strong> o
                recuperá tu contraseña.
              </p>
            </div>
            <Button className="w-full" onClick={() => irA('recuperar')}>
              Recuperar contraseña
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void entrar(e)} className="space-y-4">
            {campoEmail}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="contrasena">Contraseña</Label>
                <button
                  type="button"
                  onClick={() => irA('recuperar')}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  ¿La olvidaste?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={verContrasena ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena((v) => !v)}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verContrasena}
                  className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {verContrasena ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        )}
      </CardContent>
      {usaEmuladores && !bloqueo && (
        <CardFooter>
          <div className="w-full rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            <p className="mb-2">
              Usuarios de prueba (contraseña <strong>local123</strong>):
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {['dueno', 'encargado', 'mozo', 'cocina'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    setEmail(`${u}@local.test`);
                    setContrasena('local123');
                  }}
                  className="rounded-full border px-2.5 py-1 hover:bg-muted"
                >
                  {u}@local.test
                </button>
              ))}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
