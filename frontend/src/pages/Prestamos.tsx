// src/pages/Prestamos.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrestamos, getMultas, type Prestamo, type Multa } from '../services/api';
import './Prestamos.css';

type Tab = 'activos' | 'historial' | 'multas';

interface ModalData {
  prestamo: Prestamo;
}

const POR_PAGINA = 10

export default function Prestamos() {
  const navigate = useNavigate();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [multas,    setMultas]    = useState<Multa[]>([]);
  const [tab,       setTab]       = useState<Tab>('activos');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<ModalData | null>(null);
  const [msg,       setMsg]       = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [pagina,    setPagina]    = useState(1);

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const cargar = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([getPrestamos(), getMultas()]);
      setPrestamos(p);
      setMultas(m);
    } catch {
      mostrar('err', 'Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [tab]);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const fl = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const diasRestantes = (p: Prestamo): number => {
    if (p.prestamo_estatus !== 'Activo') return 0;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const exp = new Date(p.prestamo_fecha_entrega_esperada + 'T00:00:00');
    return Math.max(Math.ceil((exp.getTime() - hoy.getTime()) / 86400000), 0);
  };

  const colorBox  = (d: number) => d === 0 ? 'rojo' : d <= 2 ? 'amarillo' : 'verde';
  const colorPill = (p: Prestamo) =>
    p.prestamo_estatus === 'Vencido' ? 'vencido' :
    p.prestamo_estatus === 'Devuelto' ? 'devuelto' : 'activo';

  const activos   = prestamos.filter(p => p.prestamo_estatus === 'Activo');
  const historial = prestamos.filter(p => p.prestamo_estatus !== 'Activo');
  const multasAct = multas.filter(m => m.multa_estatus === 'Activa');

  const totalPaginas    = Math.ceil(historial.length / POR_PAGINA);
  const historialPagina = historial.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const irPagina = (p: number) => {
    setPagina(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const Paginador = () => (
    <div className="libros-paginador">
      <button className="pag-btn" onClick={() => irPagina(pagina - 1)} disabled={pagina === 1}>
        ← Anterior
      </button>
      <div className="pag-nums">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, idx) =>
            p === '...'
              ? <span key={`ellipsis-${idx}`} className="pag-ellipsis">…</span>
              : <button
                  key={p}
                  className={`pag-num ${pagina === p ? 'activo' : ''}`}
                  onClick={() => irPagina(p as number)}
                >
                  {p}
                </button>
          )
        }
      </div>
      <button className="pag-btn" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>
        Siguiente →
      </button>
    </div>
  );

  return (
    // ← flex column + min-height para que el footer siempre quede abajo
    <div className="prest-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="prest-hero">
        <div>
          <div className="prest-breadcrumb">Biblioteca WEB / Mis Préstamos</div>
          <h1 className="prest-h1">Mis Préstamos</h1>
          <p className="prest-subtitle">
            Puedes tener hasta <strong>3 préstamos activos</strong> a la vez. Elige entre <strong>3, 5 o 7 días</strong> de plazo al solicitar.
          </p>
        </div>
        <div className="prest-hero-stats">
          <div className="prest-stat">
            <span className="psn">{activos.length}</span>
            <span className="psl">Activos</span>
          </div>
          <div className="prest-stat-sep" />
          <div className="prest-stat">
            <span className={`psn${multasAct.length > 0 ? ' red' : ''}`}>{multasAct.length}</span>
            <span className="psl">Multas</span>
          </div>
          <div className="prest-stat-sep" />
          <div className="prest-stat">
            <span className="psn">{historial.length}</span>
            <span className="psl">Historial</span>
          </div>
        </div>
      </div>

      {/* ── Alerta bloqueo ── */}
      {multasAct.length > 0 && (
        <div className="prest-alerta">
          <div className="prest-alerta-ico">!</div>
          <span>
            Tienes <strong>{multasAct.length} multa(s) activa(s)</strong>. Tu cuenta puede estar bloqueada temporalmente.
          </span>
          <span className="prest-alerta-link" onClick={() => setTab('multas')}>Ver multas →</span>
        </div>
      )}

      {/* ── Límite de préstamos ── */}
      {activos.length >= 3 && (
        <div className="prest-alerta" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
          <div className="prest-alerta-ico" style={{ background: '#3b82f6' }}>i</div>
          <span>Has alcanzado el <strong>límite de 3 préstamos activos</strong>. Devuelve uno para solicitar otro.</span>
        </div>
      )}

      {msg && (
        <div className={`prest-notif ${msg.tipo}`}>
          {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="prest-tabs-wrap">
        <div className="prest-tabs">
          <button className={`prest-tab${tab === 'activos' ? ' active' : ''}`} onClick={() => setTab('activos')}>
            Activos
            {activos.length > 0 && <span className="prest-tab-badge">{activos.length}</span>}
          </button>
          <button className={`prest-tab${tab === 'historial' ? ' active' : ''}`} onClick={() => setTab('historial')}>
            Historial
            {historial.length > 0 && <span className="prest-tab-badge">{historial.length}</span>}
          </button>
          <button className={`prest-tab${tab === 'multas' ? ' active' : ''}`} onClick={() => setTab('multas')}>
            Multas
            {multasAct.length > 0 && <span className="prest-tab-badge danger">{multasAct.length}</span>}
          </button>
        </div>
      </div>

      {/* ← flex: 1 para empujar el footer hacia abajo */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div className="prest-loading">
            <div className="prest-spinner" />
            <p>Cargando…</p>
          </div>
        ) : (
          <div className="prest-content">

            {/* ── Tab: Activos ── */}
            {tab === 'activos' && (
              <>
                {activos.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">📚</div>
                    <h3>Sin préstamos activos</h3>
                    <p>Desde el catálogo puedes solicitar un préstamo de cualquier libro disponible.</p>
                  </div>
                ) : (
                  <div className="prest-lista">
                    {activos.map(p => {
                      const dias = diasRestantes(p);
                      return (
                        <button
                          key={p.prestamo_id}
                          className={`prest-card${p.prestamo_estatus === 'Vencido' ? ' vencido' : dias <= 2 ? ' urgente' : ''}`}
                          onClick={() => setModal({ prestamo: p })}
                        >
                          <div className="prest-card-left">
                            <div className="prest-card-top-row">
                              <h3>{p.libro_titulo}</h3>
                              {p.prestamo_estatus === 'Vencido' && (
                                <span className="prest-tag vencido">Vencido</span>
                              )}
                              {p.prestamo_estatus === 'Activo' && dias <= 2 && (
                                <span className="prest-tag urgente">
                                  {dias === 0 ? 'Vence hoy' : `${dias} día${dias > 1 ? 's' : ''}`}
                                </span>
                              )}
                            </div>
                            <p className="prest-autor">{p.libro_autor}</p>
                            <div className="prest-fechas">
                              <span>Salida: {fc(p.prestamo_fecha_salida)}</span>
                              <span className="prest-sep">·</span>
                              <span>Entrega: {fc(p.prestamo_fecha_entrega_esperada)}</span>
                              {p.prestamo_dias_plazo && (
                                <>
                                  <span className="prest-sep">·</span>
                                  <span>Plazo: {p.prestamo_dias_plazo} días</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="prest-card-right">
                            <span className={`prest-pill ${colorPill(p)}`}>{p.prestamo_estatus}</span>
                            <span className="prest-card-ver">Ver detalles →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Tab: Historial ── */}
            {tab === 'historial' && (
              <>
                {historial.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">📋</div>
                    <h3>Sin historial</h3>
                    <p>Aquí aparecerán tus préstamos devueltos o vencidos.</p>
                  </div>
                ) : (
                  <>
                    <p className="prest-pag-info">
                      Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, historial.length)} de {historial.length} préstamos
                    </p>
                    <div className="prest-tabla-wrap">
                      <table className="prest-tabla">
                        <thead>
                          <tr>
                            <th>Libro</th>
                            <th>Autor</th>
                            <th>Salida</th>
                            <th>Entrega esperada</th>
                            <th>Devolución real</th>
                            <th>Plazo</th>
                            <th>Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historialPagina.map(p => (
                            <tr key={p.prestamo_id}>
                              <td className="td-bold">{p.libro_titulo}</td>
                              <td className="td-muted">{p.libro_autor}</td>
                              <td>{fc(p.prestamo_fecha_salida)}</td>
                              <td>{fc(p.prestamo_fecha_entrega_esperada)}</td>
                              <td>{p.prestamo_fecha_devolucion_real ? fc(p.prestamo_fecha_devolucion_real) : '—'}</td>
                              <td>{p.prestamo_dias_plazo ? `${p.prestamo_dias_plazo} días` : '—'}</td>
                              <td>
                                <span className={`prest-pill ${colorPill(p)}`}>{p.prestamo_estatus}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPaginas > 1 && <Paginador />}
                  </>
                )}
              </>
            )}

            {/* ── Tab: Multas ── */}
            {tab === 'multas' && (
              <>
                {multas.length === 0 ? (
                  <div className="prest-empty">
                    <div className="prest-empty-ico">✅</div>
                    <h3>Sin multas</h3>
                    <p>¡Excelente! No tienes multas registradas.</p>
                  </div>
                ) : (
                  <div className="prest-lista">
                    {multas.map(m => (
                      <div
                        key={m.multa_id}
                        className={`prest-multa-card ${m.multa_estatus === 'Activa' ? 'pendiente' : 'pagada'}`}
                      >
                        <div className="prest-multa-left">
                          <h3>{m.libro_titulo}</h3>
                          <p className="prest-autor" style={{ margin: '2px 0 6px' }}>{m.multa_motivo}</p>
                          <p className="prest-multa-fechas">
                            {fc(m.multa_fecha_inicio)} — {fc(m.multa_fecha_fin)}
                          </p>
                        </div>
                        <div className="prest-multa-right">
                          <span className={`prest-pill ${m.multa_estatus === 'Activa' ? 'pendiente' : 'pagada'}`}>
                            {m.multa_estatus}
                          </span>
                          <span className="prest-multa-bloqueo">
                            {m.multa_dias_bloqueo} día{m.multa_dias_bloqueo !== 1 ? 's' : ''} de bloqueo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>

      {/* ── Modal detalle préstamo activo ── */}
      {modal && (
        <div className="prest-backdrop" onClick={() => setModal(null)}>
          <div className="prest-modal" onClick={e => e.stopPropagation()}>
            <button className="prest-modal-x" onClick={() => setModal(null)}>✕</button>

            <p className="prest-modal-pre">Préstamo activo</p>
            <h2 className="prest-modal-titulo">{modal.prestamo.libro_titulo}</h2>
            <p className="prest-modal-autor">{modal.prestamo.libro_autor}</p>

            {(() => {
              const dias  = diasRestantes(modal.prestamo);
              const color = colorBox(dias);
              return (
                <>
                  <div className={`prest-dias-box ${color}`}>
                    <span className="prest-dias-num">
                      {modal.prestamo.prestamo_estatus === 'Vencido' ? modal.prestamo.dias_retraso : dias}
                    </span>
                    <span className="prest-dias-label">
                      {modal.prestamo.prestamo_estatus === 'Vencido'
                        ? `día${modal.prestamo.dias_retraso !== 1 ? 's' : ''} de retraso`
                        : dias === 1 ? 'día restante' : 'días restantes'}
                    </span>
                  </div>

                  <div className={`prest-aviso ${color}`}>
                    {modal.prestamo.prestamo_estatus === 'Vencido'
                      ? `⚠️ Este préstamo está vencido con ${modal.prestamo.dias_retraso} día(s) de retraso. Devuélvelo en biblioteca a la brevedad.`
                      : dias === 0
                      ? '⚠️ Tu préstamo vence hoy. Devuélvelo antes de que cierre la biblioteca.'
                      : dias <= 2
                      ? `⚠️ Solo te quedan ${dias} día(s). Devuelve el libro pronto.`
                      : `Tienes hasta el ${fl(modal.prestamo.prestamo_fecha_entrega_esperada)} para devolver el libro.`
                    }
                  </div>
                </>
              );
            })()}

            <div className="prest-modal-fechas">
              <div className="prest-mf-item">
                <span className="prest-mf-label">Fecha de salida</span>
                <span className="prest-mf-val">{fl(modal.prestamo.prestamo_fecha_salida)}</span>
              </div>
              <div className="prest-mf-sep" />
              <div className="prest-mf-item">
                <span className="prest-mf-label">Entrega esperada</span>
                <span className="prest-mf-val">{fl(modal.prestamo.prestamo_fecha_entrega_esperada)}</span>
              </div>
            </div>

            {modal.prestamo.prestamo_dias_plazo && (
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                Plazo elegido: <strong>{modal.prestamo.prestamo_dias_plazo} días</strong>
              </p>
            )}

            <div className="prest-modal-aviso-admin">
              ℹ️ Para devolver el libro, acércate al mostrador de la biblioteca con tu credencial.
            </div>

            <div className="prest-modal-btns">
              <button className="prest-btn-cerrar" onClick={() => setModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <footer className="home-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-logo-row">
              <div className="footer-logo-icon">B</div>
              <span className="footer-logo-text">Biblioteca WEB</span>
            </div>
            <p className="footer-tagline">
              Tu portal de acceso al conocimiento académico. Préstamos, apartados y recursos digitales en un solo lugar.
            </p>
          </div>
          <div>
            <p className="footer-heading">Navegación</p>
            {[["Catálogo", "/libros"], ["Préstamos", "/prestamos"], ["Apartados", "/apartados"]].map(([l, r]) => (
              <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Cuenta</p>
            {usuario
              ? [["Mis préstamos", "/prestamos"], ["Mis apartados", "/apartados"]].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
              : [["Iniciar sesión", "/login"], ["Registrarse", "/registro"]].map(([l, r]) => (
                  <p key={l} className="footer-link" onClick={() => navigate(r)}>{l}</p>
                ))
            }
          </div>
          <div>
            <p className="footer-heading">Boletín informativo</p>
            <p className="footer-desc">Recibe novedades directamente en tu correo institucional.</p>
            <div className="newsletter-row">
              <input className="newsletter-input" placeholder="tu@alumno.web.mx" />
              <button className="newsletter-btn">Suscribir</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Biblioteca WEB · Todos los derechos reservados</span>
          <span>Privacidad · Términos de uso · Accesibilidad</span>
        </div>
      </footer>

    </div>
  );
}