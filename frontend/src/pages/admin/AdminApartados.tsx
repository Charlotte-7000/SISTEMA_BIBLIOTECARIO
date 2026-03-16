// src/pages/admin/AdminApartados.tsx
import { useState, useEffect } from 'react'
import './AdminApartados.css';

const API        = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const POR_PAGINA = 10;

interface Apartado {
  apartado_id:               number;
  usuario_id:                number;
  usuario_nombre:            string;
  matricula_id:              string;
  libro_id:                  number;
  libro_titulo:              string;
  libro_autor:               string;
  apartado_fecha:            string;
  apartado_fecha_expiracion: string;
  apartado_estatus:          'Pendiente' | 'Asignado' | 'Cancelado' | 'Convertido';
  dias_restantes:            number;
}

export default function AdminApartados() {
  const [apartados,  setApartados]  = useState<Apartado[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filtro,     setFiltro]     = useState('');
  const [estatus,    setEstatus]    = useState('');
  const [modal,      setModal]      = useState<Apartado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [msg,        setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [pagina,     setPagina]     = useState(1);

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estatus) params.append('estatus', estatus);
      if (filtro)  params.append('busqueda', filtro);
      const r = await fetch(`${API}/admin/apartados/?${params}`, { headers });
      setApartados(await r.json());
      setPagina(1);
    } catch { mostrar('err', 'Error al cargar apartados'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { cargar(); }, [estatus]);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleCancelar = async () => {
    if (!modal) return;
    setProcesando(true);
    try {
      const r = await fetch(`${API}/admin/apartados/${modal.apartado_id}/`, {
        method: 'PATCH', headers,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al cancelar apartado');
      mostrar('ok', 'Apartado cancelado correctamente');
      setModal(null);
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setProcesando(false); }
  };

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const urgClass = (d: number, est: string) => {
    if (est !== 'Pendiente' && est !== 'Asignado') return '';
    return d === 0 ? 'roja' : d === 1 ? 'amarilla' : 'verde';
  };

  const estatusColor = (e: string) =>
    e === 'Pendiente'  ? 'pendiente'  :
    e === 'Asignado'   ? 'asignado'   :
    e === 'Cancelado'  ? 'cancelado'  : 'convertido';

  const esActivo = (est: string) => est === 'Pendiente' || est === 'Asignado';

  // Paginación
  const totalPaginas = Math.ceil(apartados.length / POR_PAGINA);
  const paginados    = apartados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const numeros = Array.from({ length: totalPaginas }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
    .reduce<(number | '...')[]>((acc, n, idx, arr) => {
      if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="aapart-page">
      <div className="aapart-header">
        <div>
          <h1 className="aapart-title">Apartados</h1>
          <p className="aapart-sub">{apartados.length} apartado(s) encontrado(s)</p>
        </div>
      </div>

      {msg && <div className={`aapart-notif ${msg.tipo}`}>{msg.texto}</div>}

      {/* Filtros */}
      <div className="aapart-filtros">
        <input
          className="aapart-search"
          placeholder="Buscar por nombre, matrícula o libro…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && cargar()}
        />
        <select className="aapart-select" value={estatus} onChange={e => setEstatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="Pendiente">Pendientes</option>
          <option value="Asignado">Asignados</option>
          <option value="Cancelado">Cancelados</option>
          <option value="Convertido">Convertidos</option>
        </select>
        <button className="aapart-btn-buscar" onClick={cargar}>Buscar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="aapart-loading"><div className="aapart-spinner" /><p>Cargando…</p></div>
      ) : apartados.length === 0 ? (
        <div className="aapart-empty"><p>No se encontraron apartados.</p></div>
      ) : (
        <div className="aapart-tabla-wrap">
          <table className="aapart-tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Libro</th>
                <th>Apartado</th>
                <th>Expira</th>
                <th>Días restantes</th>
                <th>Estatus</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginados.map(a => (
                <tr key={a.apartado_id}>
                  <td>
                    <div className="td-bold">{a.usuario_nombre}</div>
                    <div className="td-muted">{a.matricula_id}</div>
                  </td>
                  <td>
                    <div className="td-bold">{a.libro_titulo}</div>
                    <div className="td-muted">{a.libro_autor}</div>
                  </td>
                  <td className="td-muted">{fc(a.apartado_fecha)}</td>
                  <td className="td-muted">{fc(a.apartado_fecha_expiracion)}</td>
                  <td>
                    {esActivo(a.apartado_estatus) ? (
                      <span className={`aapart-dias urg-${urgClass(a.dias_restantes, a.apartado_estatus)}`}>
                        {a.dias_restantes === 0 ? 'Hoy' : `${a.dias_restantes}d`}
                      </span>
                    ) : (
                      <span className="td-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`aapart-pill ${estatusColor(a.apartado_estatus)}`}>
                      {a.apartado_estatus}
                    </span>
                  </td>
                  <td>
                    {esActivo(a.apartado_estatus) && (
                      <button className="aapart-btn-cancelar" onClick={() => setModal(a)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="aapart-pagination">
              <button
                className="aapart-pg-btn"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                ‹ Anterior
              </button>
              <div className="aapart-pg-nums">
                {numeros.map((n, i) =>
                  n === '...'
                    ? <span key={`e${i}`} className="aapart-pg-ellipsis">…</span>
                    : <button
                        key={n}
                        className={`aapart-pg-num ${pagina === n ? 'active' : ''}`}
                        onClick={() => setPagina(n as number)}
                      >
                        {n}
                      </button>
                )}
              </div>
              <button
                className="aapart-pg-btn"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar cancelación */}
      {modal && (
        <div className="aapart-backdrop" onClick={() => setModal(null)}>
          <div className="aapart-modal" onClick={e => e.stopPropagation()}>
            <button className="aapart-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="aapart-modal-ico">🔖</div>
            <h2 className="aapart-modal-title">¿Cancelar apartado?</h2>

            <div className="aapart-dev-info">
              <div className="aapart-dev-row">
                <span>Libro</span>
                <strong>{modal.libro_titulo}</strong>
              </div>
              <div className="aapart-dev-row">
                <span>Usuario</span>
                <strong>{modal.usuario_nombre}</strong>
              </div>
              <div className="aapart-dev-row">
                <span>Matrícula</span>
                <strong>{modal.matricula_id}</strong>
              </div>
              <div className="aapart-dev-row">
                <span>Expira</span>
                <strong>{fc(modal.apartado_fecha_expiracion)}</strong>
              </div>
            </div>

            <p className="aapart-modal-aviso">
              Esta acción cancelará el apartado y liberará el libro para otros usuarios.
            </p>

            <div className="aapart-modal-btns">
              <button className="aapart-btn-confirmar" onClick={handleCancelar} disabled={procesando}>
                {procesando ? 'Cancelando…' : 'Sí, cancelar apartado'}
              </button>
              <button className="aapart-btn-cerrar" onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}