// src/pages/admin/AdminPrestamos.tsx
import { useEffect, useState } from 'react';
import './AdminPrestamos.css';

const API = 'http://localhost:8000/api';

interface Prestamo {
  prestamo_id:                    number;
  usuario_id:                     number;
  usuario_nombre:                 string;
  matricula_id:                   string;
  libro_id:                       number;
  libro_titulo:                   string;
  libro_autor:                    string;
  prestamo_fecha_salida:          string;
  prestamo_fecha_entrega_esperada:string;
  prestamo_fecha_devolucion_real: string | null;
  prestamo_estatus:               string;
  dias_retraso:                   number;
}

interface Libro {
  libro_id:    number;
  libro_titulo:string;
  libro_autor: string;
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

  // Form registrar
  const [matricula,  setMatricula]  = useState('');
  const [libroId,    setLibroId]    = useState('');

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

  const handleRegistrar = async () => {
    if (!matricula || !libroId) { mostrar('err', 'Completa todos los campos.'); return; }
    setProcesando(true);
    try {
      const r = await fetch(`${API}/admin/prestamos/`, {
        method: 'POST', headers,
        body: JSON.stringify({ matricula_id: matricula, libro_id: Number(libroId) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al registrar préstamo');
      mostrar('ok', 'Préstamo registrado correctamente');
      setModal(null);
      setMatricula(''); setLibroId('');
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setProcesando(false); }
  };

  const handleDevolver = async () => {
    if (modal?.tipo !== 'devolver') return;
    setProcesando(true);
    try {
      const r = await fetch(`${API}/admin/prestamos/${modal.prestamo.prestamo_id}/`, {
        method: 'PATCH', headers,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al registrar devolución');
      mostrar('ok', data.message);
      setModal(null);
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setProcesando(false); }
  };

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const estatusColor = (e: string) =>
    e === 'Activo' ? 'activo' : e === 'Devuelto' ? 'devuelto' : 'vencido';

  return (
    <div className="aprest-page">
      <div className="aprest-header">
        <div>
          <h1 className="aprest-title">Préstamos</h1>
          <p className="aprest-sub">{prestamos.length} préstamo(s) encontrado(s)</p>
        </div>
        <button className="aprest-btn-nuevo" onClick={() => setModal({ tipo: 'registrar' })}>
          + Registrar préstamo
        </button>
      </div>

      {msg && <div className={`aprest-notif ${msg.tipo}`}>{msg.texto}</div>}

      {/* Filtros */}
      <div className="aprest-filtros">
        <input
          className="aprest-search"
          placeholder="Buscar por nombre, matrícula o libro…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
        />
        <select className="aprest-select" value={estatus} onChange={e => setEstatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="Activo">Activos</option>
          <option value="Vencido">Vencidos</option>
          <option value="Devuelto">Devueltos</option>
        </select>
        <button className="aprest-btn-buscar" onClick={cargar}>Buscar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="aprest-loading"><div className="aprest-spinner" /><p>Cargando…</p></div>
      ) : prestamos.length === 0 ? (
        <div className="aprest-empty"><p>No se encontraron préstamos.</p></div>
      ) : (
        <div className="aprest-tabla-wrap">
          <table className="aprest-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Libro</th>
                <th>Salida</th>
                <th>Límite</th>
                <th>Devolución</th>
                <th>Estatus</th>
                <th>Retraso</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {prestamos.map(p => (
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
                    {p.dias_retraso > 0
                      ? <span className="aprest-retraso">{p.dias_retraso}d</span>
                      : <span className="td-muted">—</span>
                    }
                  </td>
                  <td>
                    {p.prestamo_estatus !== 'Devuelto' && (
                      <button
                        className="aprest-btn-devolver"
                        onClick={() => setModal({ tipo: 'devolver', prestamo: p })}
                      >
                        Devolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar */}
      {modal?.tipo === 'registrar' && (
        <div className="aprest-backdrop" onClick={() => setModal(null)}>
          <div className="aprest-modal" onClick={e => e.stopPropagation()}>
            <button className="aprest-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="aprest-modal-title">Registrar préstamo</h2>
            <p className="aprest-modal-sub">Ingresa la matrícula del usuario y selecciona el libro.</p>

            <div className="aprest-form">
              <div className="aprest-form-group">
                <label>Matrícula del usuario</label>
                <input
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ej. 2024UTT019"
                />
              </div>
              <div className="aprest-form-group">
                <label>Libro</label>
                <select value={libroId} onChange={e => setLibroId(e.target.value)}>
                  <option value="">Selecciona un libro…</option>
                  {libros.map(l => (
                    <option key={l.libro_id} value={l.libro_id}>
                      {l.libro_titulo} — {l.libro_autor}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="aprest-modal-btns">
              <button className="aprest-btn-confirmar" onClick={handleRegistrar} disabled={procesando}>
                {procesando ? 'Registrando…' : 'Confirmar préstamo'}
              </button>
              <button className="aprest-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolver */}
      {modal?.tipo === 'devolver' && (
        <div className="aprest-backdrop" onClick={() => setModal(null)}>
          <div className="aprest-modal aprest-modal-sm" onClick={e => e.stopPropagation()}>
            <button className="aprest-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="aprest-dev-ico">📚</div>
            <h2 className="aprest-modal-title">Registrar devolución</h2>

            <div className="aprest-dev-info">
              <div className="aprest-dev-row">
                <span>Libro</span>
                <strong>{modal.prestamo.libro_titulo}</strong>
              </div>
              <div className="aprest-dev-row">
                <span>Usuario</span>
                <strong>{modal.prestamo.usuario_nombre}</strong>
              </div>
              <div className="aprest-dev-row">
                <span>Límite</span>
                <strong>{fc(modal.prestamo.prestamo_fecha_entrega_esperada)}</strong>
              </div>
              {modal.prestamo.dias_retraso > 0 && (
                <div className="aprest-dev-alerta">
                  ⚠️ Este préstamo tiene <strong>{modal.prestamo.dias_retraso} día(s)</strong> de retraso.
                  Se aplicará una multa automáticamente.
                </div>
              )}
            </div>

            <div className="aprest-modal-btns">
              <button className="aprest-btn-confirmar" onClick={handleDevolver} disabled={procesando}>
                {procesando ? 'Procesando…' : 'Confirmar devolución'}
              </button>
              <button className="aprest-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}