// src/services/api.ts

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
  };
}

// ── TIPOS ─────────────────────────────────────────────────────────────────────

export interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  usuario_aPaterno: string;
  matricula_id: string;
  usuario_bloqueado_hasta: string | null;
  esta_bloqueado: boolean;
  dias_bloqueo_restantes: number;
}

export interface Libro {
  libro_id: number;
  libro_titulo: string;
  libro_autor: string;
  libro_isbn: string;
  libro_ejemplares: number;
  libro_descripcion: string;
  categoria_id: number;
  categoria_nombre: string;
  editorial_id: number;
  editorial_nombre: string;
}

export interface Categoria {
  categoria_id: number;
  categoria_nombre: string;
}

export interface Prestamo {
  prestamo_id: number;
  libro_id: number;
  libro_titulo: string;
  libro_autor: string;
  prestamo_fecha_salida: string;
  prestamo_fecha_entrega_esperada: string;
  prestamo_fecha_devolucion_real: string | null;
  prestamo_estatus: 'Activo' | 'Devuelto' | 'Vencido';
  dias_retraso: number;
}

export interface Apartado {
  apartado_id: number;
  libro_id: number;
  libro_titulo: string;
  libro_autor: string;
  apartado_fecha: string;
  apartado_fecha_expiracion: string;
  apartado_estatus: 'Activo' | 'Cancelado' | 'Convertido';
  dias_restantes: number;
}

export interface Multa {
  multa_id: number;
  prestamo_id: number;
  libro_titulo: string;
  multa_dias_bloqueo: number;
  multa_motivo: string;
  multa_fecha_inicio: string;
  multa_fecha_fin: string;
  multa_estatus: 'Activa' | 'Cumplida';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function login(matricula_id: string, usuario_password: string) {
  const r = await fetch(`${BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricula_id, usuario_password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Credenciales incorrectas');
  return d as { token: string; usuario: Usuario };
}

export async function registro(data: {
  usuario_nombre: string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id: string;
  usuario_password: string;
}) {
  const r = await fetch(`${BASE}/registro/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d;
}

// ── LIBROS ────────────────────────────────────────────────────────────────────

export async function getLibros(busqueda = '', categoria = '') {
  const params = new URLSearchParams();
  if (busqueda)  params.append('busqueda',  busqueda);
  if (categoria) params.append('categoria', categoria);
  const r = await fetch(`${BASE}/libros/?${params}`);
  if (!r.ok) throw new Error('Error al obtener libros');
  return r.json() as Promise<Libro[]>;
}

export async function getCategorias() {
  const r = await fetch(`${BASE}/categorias/`);
  if (!r.ok) throw new Error('Error al obtener categorías');
  return r.json() as Promise<Categoria[]>;
}

// ── PRÉSTAMOS ─────────────────────────────────────────────────────────────────

export async function getPrestamos() {
  const r = await fetch(`${BASE}/prestamos/`, { headers: headers() });
  if (!r.ok) throw new Error('Error al obtener préstamos');
  return r.json() as Promise<Prestamo[]>;
}

export async function crearPrestamo(libro_id: number) {
  const r = await fetch(`${BASE}/prestamos/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ libro_id }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error al crear préstamo');
  return d as Prestamo;
}

// ── APARTADOS ─────────────────────────────────────────────────────────────────

export async function getApartados() {
  const r = await fetch(`${BASE}/apartados/`, { headers: headers() });
  if (!r.ok) throw new Error('Error al obtener apartados');
  return r.json() as Promise<Apartado[]>;
}

export async function crearApartado(libro_id: number, dias_apartado: 3 | 5 | 7 = 3) {
  const r = await fetch(`${BASE}/apartados/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ libro_id, dias_apartado }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error al crear apartado');
  return d as Apartado;
}

export async function cancelarApartado(apartado_id: number) {
  const r = await fetch(`${BASE}/apartados/${apartado_id}/`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error al cancelar');
  return d as Apartado;
}

// ── MULTAS ────────────────────────────────────────────────────────────────────

export async function getMultas() {
  const r = await fetch(`${BASE}/multas/`, { headers: headers() });
  if (!r.ok) throw new Error('Error al obtener multas');
  return r.json() as Promise<Multa[]>;
}