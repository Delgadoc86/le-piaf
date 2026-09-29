'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Eye, EyeOff } from 'lucide-react';
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
import { firebase, usaEmuladores } from '@/lib/firebase/client';
import { NOMBRE_LOCAL } from '@/lib/local';

function mensajeDeError(e: unknown): string {
  const codigo = e instanceof FirebaseError ? e.code : '';
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'El email o la contraseña no son correctos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google antes de terminar.';
    case 'auth/invalid-email':
      return 'Revisá el email.';
    default:
      return 'No pudimos iniciar sesión. Probá de nuevo.';
  }
}

export default function LoginPage() {
  const sesion = useSesion();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (sesion.estado === 'lista') router.replace('/panel');
  }, [sesion.estado, router]);

  async function ejecutar(accion: () => Promise<unknown>) {
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await accion();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const entrar = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(() => signInWithEmailAndPassword(firebase().auth, email.trim(), contrasena));
  };

  const entrarConGoogle = () =>
    void ejecutar(() => signInWithPopup(firebase().auth, new GoogleAuthProvider()));

  const recuperar = () => {
    if (!email.trim()) {
      setError('Escribí tu email arriba y tocá de nuevo "¿Olvidaste tu contraseña?".');
      return;
    }
    void ejecutar(async () => {
      await sendPasswordResetEmail(firebase().auth, email.trim());
      setAviso(
        usaEmuladores
          ? 'Listo. Con emuladores el mail no se envía: el link aparece en la terminal y en la UI de Auth.'
          : 'Si el email tiene cuenta, te mandamos un link para elegir una contraseña nueva.',
      );
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{NOMBRE_LOCAL}</CardTitle>
        <CardDescription>Entrá al panel del local.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={entrar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
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
          {aviso && (
            <p role="status" className="text-sm text-muted-foreground">
              {aviso}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <Button variant="outline" className="w-full" onClick={entrarConGoogle} disabled={enviando}>
          Entrar con Google
        </Button>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <button
          type="button"
          onClick={recuperar}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
        {usaEmuladores && (
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
        )}
      </CardFooter>
    </Card>
  );
}
