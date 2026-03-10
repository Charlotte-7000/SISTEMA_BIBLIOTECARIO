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
  usuario_nombre_acceso: string;
  matricula_id: string;
  usuario_rol: string;
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
  multa_monto: string;
  multa_motivo: string;
  multa_estatus: 'Pendiente' | 'Pagada';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function login(usuario_nombre_acceso: string, usuario_password: string) {
  const r = await fetch(`${BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_nombre_acceso, usuario_password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Credenciales incorrectas');
  return d as { token: string; usuario: Usuario };
}

export async function registro(data: {
  usuario_nombre: string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  usuario_nombre_acceso: string;
  usuario_password: string;
  matricula_id: string;
  usuario_rol: string;
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

export async function devolverLibro(prestamo_id: number) {
  const r = await fetch(`${BASE}/prestamos/${prestamo_id}/`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error al devolver');
  return d as Prestamo;
}

// ── APARTADOS ─────────────────────────────────────────────────────────────────

export async function getApartados() {
  const r = await fetch(`${BASE}/apartados/`, { headers: headers() });
  if (!r.ok) throw new Error('Error al obtener apartados');
  return r.json() as Promise<Apartado[]>;
}

export async function crearApartado(libro_id: number) {
  const r = await fetch(`${BASE}/apartados/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ libro_id }),
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

export async function pagarMulta(multa_id: number) {
  const r = await fetch(`${BASE}/multas/${multa_id}/`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Error al pagar multa');
  return d as Multa;
}