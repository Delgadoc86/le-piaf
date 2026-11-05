'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ArrowLeft, Eye, EyeOff, Lock, MailCheck, ShieldCheck } from 'lucide-react';
import { DOC_LOCAL, type Local } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSesion } from '@/features/auth/sesion';
import {
  bloqueadoHasta,
  intentosRestantes,
  limpiarIntentos,
  registrarFallo,
} from '@/features/auth/intentos';
import { useDocumento } from '@/features/panel/firestore';
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
  const local = useDocumento<Local>(DOC_LOCAL);

  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [bloqueo, setBloqueo] = useState<number | null>(null);
  const [ahora, setAhora] = useState(0);

  const nombreLocal = local.datos?.nombre || NOMBRE_LOCAL;
  const logoUrl = local.datos?.marca?.logoUrl || '/icons/icon-512.png';

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
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, email.trim());
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
    <div className="space-y-1.5">
      <Label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Email
      </Label>
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
        placeholder="tu@correo.com"
        className="h-11 rounded-xl border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-600 focus-visible:border-orange-500/80 focus-visible:ring-orange-500/20"
      />
    </div>
  );

  return (
    <div className="w-full max-w-md space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500">
      {/* Tarjeta de Login Premium */}
      <div className="relative rounded-3xl border border-slate-800/90 bg-slate-900/90 p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl space-y-6">
        {/* Cabecera de Marca del Local */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto flex size-20 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/90 p-2.5 shadow-xl shadow-black/50 ring-1 ring-white/10 transition-transform duration-300 hover:scale-105">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={nombreLocal}
                width={80}
                height={80}
                className="h-full w-full object-contain"
                priority
              />
            ) : (
              <span className="text-2xl font-black tracking-tight text-white">
                {nombreLocal.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold text-slate-300 shadow-inner">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Terminal Privada · Acceso Exclusivo</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {nombreLocal}
            </h1>
            <p className="text-xs text-slate-400">
              {modo === 'recuperar'
                ? 'Recuperación de credenciales del personal'
                : 'Sistema integral de gestión de mostrador, cocina y caja'}
            </p>
          </div>
        </div>

        {/* Modo Recuperar Contraseña */}
        {modo === 'recuperar' ? (
          <div className="space-y-4">
            {aviso ? (
              <div className="space-y-4 rounded-2xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-center">
                <MailCheck className="mx-auto size-10 text-emerald-400" aria-hidden />
                <p role="status" className="text-xs font-medium text-emerald-200">
                  {aviso}
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void recuperar(e)} className="space-y-4">
                {campoEmail}
                {error && (
                  <p role="alert" className="text-xs font-semibold text-rose-400">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold tracking-wide shadow-lg shadow-orange-950/40 transition-all active:scale-[0.99] disabled:opacity-50"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando…' : 'Enviarme el link'}
                </Button>
              </form>
            )}
            <button
              type="button"
              onClick={() => irA('entrar')}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors w-full pt-1"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Volver a entrar
            </button>
          </div>
        ) : (
          /* Modo Ingreso Normal */
          <div>
            {bloqueo ? (
              <div className="space-y-4 text-center rounded-2xl border border-rose-900/40 bg-rose-950/20 p-5" role="alert">
                <Lock className="mx-auto size-10 text-rose-400" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-rose-200">Demasiados intentos fallidos</p>
                  <p className="mt-1 text-xs text-rose-300/80">
                    Por seguridad, esperá{' '}
                    <strong className="text-rose-100 tabular-nums">{mmss(bloqueo - ahora)}</strong> o
                    recuperá tu contraseña.
                  </p>
                </div>
                <Button
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                  onClick={() => irA('recuperar')}
                >
                  Recuperar contraseña
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => void entrar(e)} className="space-y-4">
                {campoEmail}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="contrasena" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Contraseña
                    </Label>
                    <button
                      type="button"
                      onClick={() => irA('recuperar')}
                      className="text-xs font-medium text-slate-400 hover:text-orange-400 transition-colors"
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
                      placeholder="••••••••"
                      className="h-11 rounded-xl border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-600 focus-visible:border-orange-500/80 focus-visible:ring-orange-500/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVerContrasena((v) => !v)}
                      aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={verContrasena}
                      className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
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
                  <p role="alert" className="text-xs font-semibold text-rose-400">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold tracking-wide shadow-lg shadow-orange-950/40 transition-all active:scale-[0.99] disabled:opacity-50"
                  disabled={enviando}
                >
                  {enviando ? 'Verificando credenciales…' : 'Ingresar al Panel'}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Accesos rápidos de desarrollo (solo en emuladores locales) */}
      {usaEmuladores && !bloqueo && modo === 'entrar' && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-center text-xs text-slate-400 backdrop-blur-md">
          <p className="mb-2.5 font-semibold text-slate-300">
            Accesos de prueba local (contraseña <strong className="text-slate-100">local123</strong>):
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
                className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                {u}@local.test
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pie institucional sobrio */}
      <footer className="text-center text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="size-3.5 text-slate-400" />
        <span>Conexión cifrada y acceso protegido</span>
      </footer>
    </div>
  );
}
