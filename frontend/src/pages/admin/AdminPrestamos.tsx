// src/pages/admin/AdminPrestamos.tsx
import { useEffect, useState, useMemo } from 'react';
import './AdminPrestamos.css';

const API        = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const POR_PAGINA = 10;

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

  // Filtrado de libros en el buscador del modal
  const librosFiltrados = useMemo(() =>
    busquedaLibro.trim().length < 2
      ? []
      : libros.filter(l =>
          `${l.libro_titulo} ${l.libro_autor}`
            .toLowerCase()
            .includes(busquedaLibro.toLowerCase())
        ).slice(0, 8),
    [busquedaLibro, libros]
  );

  const seleccionarLibro = (l: Libro) => {
    setLibroSelecto(l);
    setBusquedaLibro(l.libro_titulo);
    setMostrarDrop(false);
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

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="aprest-pagination">
              <button
                className="aprest-pg-btn"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                ‹ Anterior
              </button>
              <div className="aprest-pg-nums">
                {numeros.map((n, i) =>
                  n === '...'
                    ? <span key={`e${i}`} className="aprest-pg-ellipsis">…</span>
                    : <button
                        key={n}
                        className={`aprest-pg-num ${pagina === n ? 'active' : ''}`}
                        onClick={() => setPagina(n as number)}
                      >
                        {n}
                      </button>
                )}
              </div>
              <button
                className="aprest-pg-btn"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Registrar */}
      {modal?.tipo === 'registrar' && (
        <div className="aprest-backdrop" onClick={() => setModal(null)}>
          <div className="aprest-modal" onClick={e => e.stopPropagation()}>
            <button className="aprest-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="aprest-modal-title">Registrar préstamo</h2>
            <p className="aprest-modal-sub">Ingresa la matrícula del usuario y busca el libro.</p>

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
                <div className="aprest-libro-search-wrap">
                  <input
                    value={busquedaLibro}
                    onChange={e => {
                      setBusquedaLibro(e.target.value);
                      setLibroSelecto(null);
                      setMostrarDrop(true);
                    }}
                    onFocus={() => setMostrarDrop(true)}
                    placeholder="Escribe el título o autor…"
                    autoComplete="off"
                  />
                  {libroSelecto && (
                    <span className="aprest-libro-check">✓</span>
                  )}
                  {mostrarDrop && librosFiltrados.length > 0 && (
                    <div className="aprest-libro-dropdown">
                      {librosFiltrados.map(l => (
                        <button
                          key={l.libro_id}
                          className="aprest-libro-option"
                          onClick={() => seleccionarLibro(l)}
                        >
                          <span className="aplo-titulo">{l.libro_titulo}</span>
                          <span className="aplo-autor">{l.libro_autor}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {mostrarDrop && busquedaLibro.length >= 2 && librosFiltrados.length === 0 && (
                    <div className="aprest-libro-dropdown">
                      <p className="aprest-libro-empty">Sin resultados para "{busquedaLibro}"</p>
                    </div>
                  )}
                </div>
                {libroSelecto && (
                  <p className="aprest-libro-selecto">
                    📖 <strong>{libroSelecto.libro_titulo}</strong> — {libroSelecto.libro_autor}
                  </p>
                )}
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