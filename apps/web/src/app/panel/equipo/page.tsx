'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { invitarMiembroInputSchema, type InvitarMiembroInput, type Miembro, type Rol } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSesion } from '@/features/auth/sesion';
import { NOMBRE_LOCAL } from '@/lib/local';
import { NOMBRE_ROL } from '@/features/panel/menu';
import { firebase } from '@/lib/firebase/client';

type MiembroConId = Miembro & { id: string };
const ROLES_INVITABLES: Exclude<Rol, 'dueno'>[] = ['encargado', 'mozo', 'cocina'];

export default function EquipoPage() {
  const sesion = useSesion();
  const [miembros, setMiembros] = useState<MiembroConId[]>([]);
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'mozo' as Rol });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ nombre: string; link: string | null } | null>(null);

  const esDueno = sesion.estado === 'lista' && sesion.rol === 'dueno';
  useEffect(() => {
    if (!esDueno) return;
    const q = query(collection(firebase().db, 'miembros'), orderBy('nombre'));
    return onSnapshot(q, (snap) => setMiembros(snap.docs.map((d) => ({ ...(d.data() as Miembro), id: d.id }))));
  }, [esDueno]);

  if (!esDueno) {
    return <p className="text-muted-foreground">Solo el dueño administra el equipo.</p>;
  }

  async function invitar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    const datos = invitarMiembroInputSchema.safeParse(form);
    if (!datos.success) {
      setError('Revisá el nombre y el email.');
      return;
    }
    setEnviando(true);
    try {
      const fn = httpsCallable<InvitarMiembroInput, { esNuevo: boolean; linkContrasena: string | null }>(
        firebase().functions,
        'invitarMiembro',
      );
      const { data } = await fn(datos.data);
      setResultado({ nombre: form.nombre, link: data.linkContrasena });
      setForm({ nombre: '', email: '', rol: 'mozo' });
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'No pudimos invitar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Equipo</h1>
        <p className="text-muted-foreground">Quiénes usan el panel de {NOMBRE_LOCAL}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {miembros.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant={m.activo ? 'secondary' : 'outline'}>
                  {NOMBRE_ROL[m.rol]}
                  {!m.activo && ' · inactivo'}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitar</CardTitle>
          <CardDescription>
            Si la persona no tiene cuenta, te damos un link para que elija su contraseña. Mandáselo por WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invitar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <select
                id="rol"
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {ROLES_INVITABLES.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={enviando} className="w-full">
                {enviando ? 'Invitando…' : 'Invitar'}
              </Button>
            </div>
          </form>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {resultado && (
            <div role="status" className="mt-4 space-y-2 rounded-md border p-3 text-sm">
              <p>✅ {resultado.nombre} ya es parte del equipo.</p>
              {resultado.link && (
                <p className="break-all text-muted-foreground">
                  Link para elegir contraseña: <a className="underline" href={resultado.link}>{resultado.link}</a>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
