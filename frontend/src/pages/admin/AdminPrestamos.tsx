// src/pages/admin/AdminPrestamos.tsx
import { useEffect, useState, useMemo } from 'react';
import './AdminPrestamos.css';

const API         = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const POR_PAGINA  = 10;

interface Prestamo {
  prestamo_id:                     number;
  usuario_id:                      number;
  usuario_nombre:                  string;
  matricula_id:                    string;
  libro_id:                        number;
  libro_titulo:                    string;
  libro_autor:                     string;
  prestamo_fecha_salida:           string;
  prestamo_fecha_entrega_esperada: string;
  prestamo_fecha_devolucion_real:  string | null;
  prestamo_estatus:                string;
  dias_retraso:                    number;
  prestamo_dias_plazo:             number | null;
}

interface Libro {
  libro_id:     number;
  libro_titulo: string;
  libro_autor:  string;
}

type Modal =
  | { tipo: 'registrar' }
  | { tipo: 'devolver'; prestamo: Prestamo };

export default function AdminPrestamos() {
  const [prestamos,  setPrestamos]  = useState<Prestamo[]>([]);
  const [libros,     setLibros]     = useState<Libro[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filtro,     setFiltro]     = useState('');
  const [estatus,    setEstatus]    = useState('');
  const [modal,      setModal]      = useState<Modal | null>(null);
  const [msg,        setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [pagina,     setPagina]     = useState(1);

  // Form registrar
  const [matricula,     setMatricula]     = useState('');
  const [busquedaLibro, setBusquedaLibro] = useState('');
  const [libroSelecto,  setLibroSelecto]  = useState<Libro | null>(null);
  const [mostrarDrop,   setMostrarDrop]   = useState(false);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estatus) params.append('estatus', estatus);
      if (filtro)  params.append('busqueda', filtro);
      const r = await fetch(`${API}/admin/prestamos/?${params}`, { headers });
      setPrestamos(await r.json());
      setPagina(1);
    } catch { mostrar('err', 'Error al cargar préstamos'); }
    finally { setLoading(false); }
  };

  const cargarLibros = async () => {
    const r = await fetch(`${API}/libros/`);
    setLibros(await r.json());
  };

  useEffect(() => { cargar(); cargarLibros(); }, []);
  useEffect(() => { cargar(); }, [estatus]);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 5000);
  };

  const seleccionarLibro = (l: Libro) => {
    setLibroSelecto(l);
    setBusquedaLibro(l.libro_titulo);
    setMostrarDrop(false);
  };

  // ──────────────────────────────────────────────────────────────
  // MANEJADOR UNIFICADO DE ACCIONES (Aceptar, Rechazar, Devolver)
  // ──────────────────────────────────────────────────────────────
  const handleAccionPrestamo = async (id: number, accion?: 'aceptar' | 'rechazar') => {
    setProcesando(true);
    try {
      const r = await fetch(`${API}/admin/prestamos/${id}/`, {
        method: 'PATCH',
        headers,
        body: accion ? JSON.stringify({ accion }) : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error en la operación');
      
      mostrar('ok', data.message || 'Operación realizada con éxito');
      setModal(null); 
      cargar();      
    } catch (e: any) {
      mostrar('err', e.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleRegistrar = async () => {
    if (!matricula || !libroSelecto) { mostrar('err', 'Completa todos los campos.'); return; }
    setProcesando(true);
    try {
      const r = await fetch(`${API}/admin/prestamos/`, {
        method: 'POST', headers,
        body: JSON.stringify({ matricula_id: matricula, libro_id: libroSelecto.libro_id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al registrar préstamo');
      mostrar('ok', 'Préstamo registrado correctamente');
      setModal(null);
      setMatricula(''); setBusquedaLibro(''); setLibroSelecto(null);
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setProcesando(false); }
  };

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  // FUNCIÓN DE COLOR DE ESTATUS CORREGIDA
  const estatusColor = (e: string) => {
    if (e === 'Activo') return 'activo';
    if (e === 'Devuelto') return 'devuelto';
    if (e === 'Solicitado') return 'solicitado';
    return 'vencido'; // Para 'Vencido' o 'Rechazado'
  };

  // Filtrado de libros (useMemo)
  const librosFiltrados = useMemo(() =>
    busquedaLibro.trim().length < 2 ? [] : libros.filter(l =>
      `${l.libro_titulo} ${l.libro_autor}`.toLowerCase().includes(busquedaLibro.toLowerCase())
    ).slice(0, 8), [busquedaLibro, libros]
  );

  // Paginación
  const totalPaginas = Math.ceil(prestamos.length / POR_PAGINA);
  const paginados    = prestamos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
    .reduce<(number | '...')[]>((acc, n, idx, arr) => {
      if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="aprest-page">
      <div className="aprest-header">
        <div>
          <h1 className="aprest-title">Gestión de Préstamos</h1>
          <p className="aprest-sub">{prestamos.length} registro(s) encontrados</p>
        </div>
        <button className="aprest-btn-nuevo" onClick={() => setModal({ tipo: 'registrar' })}>
          + Registrar préstamo directo
        </button>
      </div>

      {msg && <div className={`aprest-notif ${msg.tipo}`}>{msg.texto}</div>}

      <div className="aprest-filtros">
        <input
          className="aprest-search"
          placeholder="Buscar por matrícula o libro…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
        />
        <select className="aprest-select" value={estatus} onChange={e => setEstatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Solicitado">Solicitudes web</option>
          <option value="Activo">Activos</option>
          <option value="Vencido">Vencidos</option>
          <option value="Devuelto">Devueltos</option>
          <option value="Rechazado">Rechazados</option>
        </select>
        <button className="aprest-btn-buscar" onClick={cargar}>Filtrar</button>
      </div>

      {loading ? (
        <div className="aprest-loading"><div className="aprest-spinner" /><p>Cargando…</p></div>
      ) : prestamos.length === 0 ? (
        <div className="aprest-empty"><p>No hay préstamos con estos filtros.</p></div>
      ) : (
        <div className="aprest-tabla-wrap">
          <table className="aprest-tabla">
            <thead>
              <tr>
                <th>Usuario / Matrícula</th>
                <th>Libro / Autor</th>
                <th>Salida</th>
                <th>Límite</th>
                <th>Devolución</th>
                <th>Estatus</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(p => (
                <tr key={p.prestamo_id}>
                  <td>
                    <div className="td-bold">{p.usuario_nombre}</div>
                    <div className="td-muted">{p.matricula_id}</div>
                  </td>
                  <td>
                    <div className="td-bold">{p.libro_titulo}</div>
                    <div className="td-muted">{p.libro_autor}</div>
                  </td>
                  <td className="td-muted">{fc(p.prestamo_fecha_salida)}</td>
                  <td className="td-muted">{fc(p.prestamo_fecha_entrega_esperada)}</td>
                  <td className="td-muted">
                    {p.prestamo_fecha_devolucion_real ? fc(p.prestamo_fecha_devolucion_real) : '—'}
                  </td>
                  <td>
                    <span className={`aprest-pill ${estatusColor(p.prestamo_estatus)}`}>
                      {p.prestamo_estatus}
                    </span>
                  </td>
                  <td>
  {/* ACCIONES DINÁMICAS */}
  {p.prestamo_estatus === 'Solicitado' && (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button 
        className="aprest-btn-entregar" 
        onClick={() => handleAccionPrestamo(p.prestamo_id, 'aceptar')}
      >
        Entregar
      </button>
      <button 
        className="aprest-btn-rechazar" 
        onClick={() => handleAccionPrestamo(p.prestamo_id, 'rechazar')}
      >
        Rechazar
      </button>
    </div>
  )}

  {(p.prestamo_estatus === 'Activo' || p.prestamo_estatus === 'Vencido') && (
    <button
      className="aprest-btn-devolver"
      onClick={() => setModal({ tipo: 'devolver', prestamo: p })}
    >
      Devolver
    </button>
  )}

  {(p.prestamo_estatus === 'Devuelto' || p.prestamo_estatus === 'Rechazado') && (
    <span className="td-muted">Finalizado</span>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="aprest-pagination">
              <button className="aprest-pg-btn" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>‹</button>
              <div className="aprest-pg-nums">
                {numeros.map((n, i) => n === '...' 
                  ? <span key={i} className="aprest-pg-ellipsis">…</span>
                  : <button key={i} className={`aprest-pg-num ${pagina === n ? 'active' : ''}`} onClick={() => setPagina(n as number)}>{n}</button>
                )}
              </div>
              <button className="aprest-pg-btn" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>›</button>
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar Préstamo Directo */}
      {modal?.tipo === 'registrar' && (
        <div className="aprest-backdrop" onClick={() => setModal(null)}>
          <div className="aprest-modal" onClick={e => e.stopPropagation()}>
            <button className="aprest-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="aprest-modal-title">Registrar préstamo directo</h2>
            <div className="aprest-form">
              <div className="aprest-form-group">
                <label>Matrícula</label>
                <input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Ej. 2024UTT019" />
              </div>
              <div className="aprest-form-group">
                <label>Libro</label>
                <input value={busquedaLibro} onChange={e => {setBusquedaLibro(e.target.value); setLibroSelecto(null); setMostrarDrop(true);}} placeholder="Buscar libro..." />
                {mostrarDrop && librosFiltrados.length > 0 && (
                  <div className="aprest-libro-dropdown">
                    {librosFiltrados.map(l => (
                      <button key={l.libro_id} className="aprest-libro-option" onClick={() => seleccionarLibro(l)}>
                        {l.libro_titulo} - {l.libro_autor}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="aprest-modal-btns">
              <button className="aprest-btn-confirmar" onClick={handleRegistrar} disabled={procesando}>Confirmar</button>
              <button className="aprest-btn-cancelar" onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolver Libro */}
      {modal?.tipo === 'devolver' && (
        <div className="aprest-backdrop" onClick={() => setModal(null)}>
          <div className="aprest-modal aprest-modal-sm" onClick={e => e.stopPropagation()}>
            <h2 className="aprest-modal-title">Registrar devolución</h2>
            <div className="aprest-dev-info">
              <p><strong>Libro:</strong> {modal.prestamo.libro_titulo}</p>
              <p><strong>Usuario:</strong> {modal.prestamo.usuario_nombre}</p>
              {modal.prestamo.dias_retraso > 0 && (
                <div className="aprest-dev-alerta">⚠️ {modal.prestamo.dias_retraso} día(s) de retraso. Se aplicará multa.</div>
              )}
            </div>
            <div className="aprest-modal-btns">
              <button className="aprest-btn-confirmar" onClick={() => handleAccionPrestamo(modal.prestamo.prestamo_id)} disabled={procesando}>Confirmar Devolución</button>
              <button className="aprest-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}