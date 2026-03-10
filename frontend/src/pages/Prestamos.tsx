// src/pages/Prestamos.tsx
import { useEffect, useState } from 'react';
import {
  getPrestamos, devolverLibro, getMultas, pagarMulta,
  type Prestamo, type Multa,
} from '../services/api';
import './Prestamos.css';

type Tab = 'activos' | 'historial' | 'multas';

interface ModalPrestamo {
  prestamo: Prestamo;
}

export default function Prestamos() {
  const [prestamos,  setPrestamos]  = useState<Prestamo[]>([]);
  const [multas,     setMultas]     = useState<Multa[]>([]);
  const [tab,        setTab]        = useState<Tab>('activos');
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<ModalPrestamo | null>(null);
  const [devolviendo, setDevolviendo] = useState(false);
  const [msg,        setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([getPrestamos(), getMultas()]);
      setPrestamos(p); setMultas(m);
    } catch { mostrar('err', 'Error al cargar datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4500);
  };

  const handleDevolver = async (prestamo_id: number) => {
    setDevolviendo(true);
    try {
      await devolverLibro(prestamo_id);
      mostrar('ok', 'Libro devuelto correctamente.');
      setModal(null);
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setDevolviendo(false); }
  };

  const handlePagar = async (id: number) => {
    try {
      await pagarMulta(id);
      mostrar('ok', 'Multa pagada correctamente.');
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
  };

  const activos    = prestamos.filter(p => p.prestamo_estatus !== 'Devuelto');
  const historial  = prestamos.filter(p => p.prestamo_estatus === 'Devuelto');
  const pendientes = multas.filter(m => m.multa_estatus === 'Pendiente');

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const fl = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const diasHasta = (fecha: string) => {
    const hoy  = new Date(); hoy.setHours(0,0,0,0);
    const lim  = new Date(fecha + 'T00:00:00');
    return Math.ceil((lim.getTime() - hoy.getTime()) / 86400000);
  };

  return (
    <div className="prest-page">

      {/* Hero */}
      <div className="prest-hero">
        <div>
          <div className="prest-breadcrumb">Biblioteca WEB / Mis Préstamos</div>
          <h1 className="prest-h1">Mis Préstamos</h1>
          <p className="prest-subtitle">Gestiona tus libros prestados, consulta tu historial y revisa tus multas.</p>
        </div>
        <div className="prest-hero-stats">
          <div className="prest-stat"><span className="psn">{activos.length}</span><span className="psl">Activos</span></div>
          <div className="prest-stat-sep" />
          <div className="prest-stat"><span className="psn">{historial.length}</span><span className="psl">Devueltos</span></div>
          <div className="prest-stat-sep" />
          <div className="prest-stat">
            <span className={`psn ${pendientes.length > 0 ? 'red' : ''}`}>{pendientes.length}</span>
            <span className="psl">Multas</span>
          </div>
        </div>
      </div>

      {/* Alerta multas */}
      {pendientes.length > 0 && (
        <div className="prest-alerta" onClick={() => setTab('multas')}>
          <span className="prest-alerta-ico">!</span>
          <span>
            Tienes <strong>{pendientes.length}</strong> multa(s) pendiente(s).
            No puedes solicitar nuevos préstamos hasta pagarlas.
          </span>
          <span className="prest-alerta-link">Ver multas</span>
        </div>
      )}

      {msg && (
        <div className={`prest-notif ${msg.tipo}`}>
          {msg.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="prest-tabs-wrap">
        <div className="prest-tabs">
          {([
            { id: 'activos',   label: 'Activos',   count: activos.length,   danger: false },
            { id: 'historial', label: 'Historial',  count: historial.length, danger: false },
            { id: 'multas',    label: 'Multas',     count: pendientes.length, danger: true  },
          ] as { id: Tab; label: string; count: number; danger: boolean }[]).map(t => (
            <button
              key={t.id}
              className={`prest-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`prest-tab-badge ${t.danger ? 'danger' : ''}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="prest-loading"><div className="prest-spinner" /><p>Cargando...</p></div>
      ) : (
        <div className="prest-content">

          {/* Activos */}
          {tab === 'activos' && (
            activos.length === 0 ? (
              <div className="prest-empty">
                <div className="prest-empty-ico">—</div>
                <h3>Sin préstamos activos</h3>
                <p>Solicita un préstamo desde el catálogo de libros.</p>
              </div>
            ) : (
              <div className="prest-lista">
                {activos.map(p => {
                  const dias = diasHasta(p.prestamo_fecha_entrega_esperada);
                  const urgente = dias <= 2 && dias >= 0;
                  return (
                    <button
                      key={p.prestamo_id}
                      className={`prest-card ${p.dias_retraso > 0 ? 'vencido' : urgente ? 'urgente' : ''}`}
                      onClick={() => setModal({ prestamo: p })}
                    >
                      <div className="prest-card-left">
                        <div className="prest-card-info">
                          <div className="prest-card-top-row">
                            <h3>{p.libro_titulo}</h3>
                            {p.dias_retraso > 0 && (
                              <span className="prest-tag vencido">Vencido · {p.dias_retraso}d retraso</span>
                            )}
                            {urgente && p.dias_retraso === 0 && (
                              <span className="prest-tag urgente">
                                {dias === 0 ? 'Vence hoy' : `Vence en ${dias}d`}
                              </span>
                            )}
                          </div>
                          <p className="prest-autor">{p.libro_autor}</p>
                          <div className="prest-fechas">
                            <span>Salida: {fc(p.prestamo_fecha_salida)}</span>
                            <span className="prest-sep">·</span>
                            <span>Límite: {fc(p.prestamo_fecha_entrega_esperada)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="prest-card-right">
                        <span className={`prest-pill ${p.prestamo_estatus.toLowerCase()}`}>
                          {p.prestamo_estatus}
                        </span>
                        <span className="prest-card-ver">Ver detalle</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* Historial */}
          {tab === 'historial' && (
            historial.length === 0 ? (
              <div className="prest-empty">
                <div className="prest-empty-ico">—</div>
                <h3>Sin historial</h3>
                <p>Aquí aparecerán los libros que hayas devuelto.</p>
              </div>
            ) : (
              <div className="prest-tabla-wrap">
                <table className="prest-tabla">
                  <thead>
                    <tr>
                      <th>Libro</th><th>Autor</th><th>Salida</th><th>Devuelto</th><th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(p => (
                      <tr key={p.prestamo_id}>
                        <td className="td-bold">{p.libro_titulo}</td>
                        <td className="td-muted">{p.libro_autor}</td>
                        <td>{fc(p.prestamo_fecha_salida)}</td>
                        <td>{p.prestamo_fecha_devolucion_real ? fc(p.prestamo_fecha_devolucion_real) : '—'}</td>
                        <td><span className="prest-pill devuelto">Devuelto</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Multas */}
          {tab === 'multas' && (
            multas.length === 0 ? (
              <div className="prest-empty">
                <div className="prest-empty-ico">—</div>
                <h3>Sin multas</h3>
                <p>No tienes multas registradas.</p>
              </div>
            ) : (
              <div className="prest-lista">
                {multas.map(m => (
                  <div key={m.multa_id} className={`prest-multa-card ${m.multa_estatus === 'Pendiente' ? 'pendiente' : 'pagada'}`}>
                    <div className="prest-multa-left">
                      <div>
                        <h3>{m.libro_titulo}</h3>
                        <p className="prest-autor">{m.multa_motivo}</p>
                      </div>
                    </div>
                    <div className="prest-multa-right">
                      <span className="prest-multa-monto">${parseFloat(m.multa_monto).toFixed(2)} MXN</span>
                      <span className={`prest-pill ${m.multa_estatus.toLowerCase()}`}>{m.multa_estatus}</span>
                      {m.multa_estatus === 'Pendiente' && (
                        <button className="prest-btn-pagar" onClick={() => handlePagar(m.multa_id)}>Pagar multa</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ══ MODAL detalle préstamo ══ */}
      {modal && (() => {
        const p    = modal.prestamo;
        const dias = diasHasta(p.prestamo_fecha_entrega_esperada);
        const multaEstimada = p.dias_retraso > 0 ? p.dias_retraso * 5 : 0;

        return (
          <div className="prest-backdrop" onClick={() => setModal(null)}>
            <div className="prest-modal" onClick={e => e.stopPropagation()}>

              <button className="prest-modal-x" onClick={() => setModal(null)}>✕</button>

              {/* Encabezado */}
              <p className="prest-modal-pre">Préstamo activo</p>
              <h2 className="prest-modal-titulo">{p.libro_titulo}</h2>
              <p className="prest-modal-autor">{p.libro_autor}</p>

              {/* Estado visual días */}
              {p.dias_retraso > 0 ? (
                <div className="prest-dias-box rojo">
                  <span className="prest-dias-num">{p.dias_retraso}</span>
                  <span className="prest-dias-label">días de retraso</span>
                </div>
              ) : (
                <div className={`prest-dias-box ${dias <= 2 ? 'amarillo' : 'verde'}`}>
                  <span className="prest-dias-num">{Math.max(dias, 0)}</span>
                  <span className="prest-dias-label">{dias === 1 ? 'día restante' : 'días restantes'}</span>
                </div>
              )}

              {/* Fechas */}
              <div className="prest-modal-fechas">
                <div className="prest-mf-item">
                  <span className="prest-mf-label">Fecha de salida</span>
                  <span className="prest-mf-val">{fl(p.prestamo_fecha_salida)}</span>
                </div>
                <div className="prest-mf-sep" />
                <div className="prest-mf-item">
                  <span className="prest-mf-label">Fecha límite de entrega</span>
                  <span className="prest-mf-val">{fl(p.prestamo_fecha_entrega_esperada)}</span>
                </div>
              </div>

              {/* Aviso multa */}
              {p.dias_retraso > 0 ? (
                <div className="prest-aviso rojo">
                  <strong>Multa acumulada: ${multaEstimada.toFixed(2)} MXN.</strong>{" "}
                  Al devolver el libro, el sistema generará automáticamente una multa por los {p.dias_retraso} día(s) de retraso a razón de $5.00 por día.
                  Deberás pagarla antes de solicitar un nuevo préstamo.
                </div>
              ) : dias <= 2 ? (
                <div className="prest-aviso amarillo">
                  <strong>Atención:</strong> Tu plazo de entrega vence{" "}
                  {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`}.
                  Si no devuelves el libro a tiempo, el sistema generará automáticamente
                  una multa de <strong>$5.00 MXN por cada día de retraso</strong>.
                </div>
              ) : (
                <div className="prest-aviso verde">
                  Recuerda entregar el libro antes del{" "}
                  <strong>{fl(p.prestamo_fecha_entrega_esperada)}</strong>.
                  Si no se entrega en ese plazo, el sistema generará automáticamente
                  una multa de <strong>$5.00 MXN por cada día de retraso</strong>.
                </div>
              )}

              {/* Acciones */}
              <div className="prest-modal-btns">
                <button
                  className="prest-btn-devolver-modal"
                  disabled={devolviendo}
                  onClick={() => handleDevolver(p.prestamo_id)}
                >
                  {devolviendo ? 'Procesando...' : 'Registrar devolución'}
                </button>
                <button className="prest-btn-cerrar" onClick={() => setModal(null)}>
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}