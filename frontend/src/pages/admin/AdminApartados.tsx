// src/pages/admin/AdminApartados.tsx
import { useEffect, useState } from 'react';
import './AdminApartados.css';

const API = 'http://localhost:8000/api';

interface Apartado {
  apartado_id:              number;
  usuario_id:               number;
  usuario_nombre:           string;
  matricula_id:             string;
  libro_id:                 number;
  libro_titulo:             string;
  libro_autor:              string;
  apartado_fecha:           string;
  apartado_fecha_expiracion:string;
  apartado_estatus:         string;
  dias_restantes:           number;
}

export default function AdminApartados() {
  const [apartados,  setApartados]  = useState<Apartado[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filtro,     setFiltro]     = useState('');
  const [estatus,    setEstatus]    = useState('');
  const [modal,      setModal]      = useState<Apartado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [msg,        setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

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

  const urgClass = (d: number, estatus: string) => {
    if (estatus !== 'Activo') return '';
    return d === 0 ? 'roja' : d === 1 ? 'amarilla' : 'verde';
  };

  const estatusColor = (e: string) =>
    e === 'Activo' ? 'activo' : e === 'Cancelado' ? 'cancelado' : 'convertido';

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
          <option value="Activo">Activos</option>
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
              {apartados.map(a => (
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
                    {a.apartado_estatus === 'Activo' ? (
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
                    {a.apartado_estatus === 'Activo' && (
                      <button className="aapart-btn-cancelar" onClick={() => setModal(a)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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