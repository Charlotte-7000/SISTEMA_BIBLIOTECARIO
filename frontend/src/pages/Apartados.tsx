// src/pages/Apartados.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApartados, cancelarApartado, type Apartado } from '../services/api';
import './Apartados.css';

const POR_PAGINA = 10

interface ModalData {
  apartado_id: number;
  libro_titulo: string;
  libro_autor: string;
  apartado_fecha: string;
  apartado_fecha_expiracion: string;
  dias_restantes: number;
}

export default function Apartados() {
  const navigate = useNavigate();

  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState<ModalData | null>(null);
  const [msg,       setMsg]       = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [pagina,    setPagina]    = useState(1);

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getApartados();
      setApartados(data);
    } catch {
      mostrar('err', 'Error al cargar apartados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleCancelar = async (id: number) => {
    try {
      await cancelarApartado(id);
      mostrar('ok', 'Apartado cancelado correctamente');
      setModal(null);
      cargar();
    } catch {
      mostrar('err', 'Error al cancelar el apartado');
    }
  };

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

  const fl = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

  const activos = apartados.filter(a => ['Pendiente', 'Asignado'].includes(a.apartado_estatus));
  const pasados = apartados.filter(a => !['Pendiente', 'Asignado'].includes(a.apartado_estatus));

  // ── Paginado historial ──
  const totalPaginas  = Math.ceil(pasados.length / POR_PAGINA);
  const pasadosPagina = pasados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const irPagina = (p: number) => {
    setPagina(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const urgClass = (d: number) =>
    d === 0 ? 'roja' : d === 1 ? 'amarilla' : 'verde';

  const urgText = (d: number) =>
    d === 0 ? '🔴 Expira hoy' : d === 1 ? '🟡 Expira mañana' : `🟢 ${d} días restantes`;

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
    <div className="apart-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Hero */}
      <div className="apart-hero">
        <div>
          <div className="apart-breadcrumb">Biblioteca WEB / Mis Apartados</div>
          <h1 className="apart-h1">Mis Apartados</h1>
          <p className="apart-subtitle">
            Puedes tener hasta <strong>3 apartados activos</strong> a la vez. Tendrás <strong>3 días</strong> para recoger el libro una vez asignado.
          </p>
        </div>
        <div className="apart-hero-stats">
          <div className="apart-stat">
            <span className="asn">{activos.length}</span>
            <span className="asl">Activos</span>
          </div>
          <div className="apart-stat-sep" />
          <div className="apart-stat">
            <span className="asn">{pasados.length}</span>
            <span className="asl">Historial</span>
          </div>
        </div>
      </div>

      {/* Alerta límite */}
      {activos.length >= 3 && (
        <div className="prest-alerta" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
          <div className="prest-alerta-ico" style={{ background: '#3b82f6' }}>i</div>
          <span>Has alcanzado el <strong>límite de 3 apartados activos</strong>. Cancela uno para poder apartar otro libro.</span>
        </div>
      )}

      {msg && (
        <div className={`apart-notif ${msg.tipo}`}>
          {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
        </div>
      )}

      {/* ← flex: 1 para que este bloque ocupe todo el espacio disponible */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div className="apart-loading">
            <div className="apart-spinner" />
            <p>Cargando…</p>
          </div>
        ) : (
          <>
            {/* Activos */}
            <section className="apart-section">
              <h2 className="apart-section-title">
                Activos <span className="apart-badge">{activos.length}</span>
              </h2>

              {activos.length === 0 ? (
                <div className="apart-empty">
                  <div className="apart-empty-ico">🔖</div>
                  <h3>Sin apartados activos</h3>
                  <p>Desde el catálogo puedes apartar un libro que esté prestado.</p>
                </div>
              ) : (
                <div className="apart-grid">
                  {activos.map(a => (
                    <button
                      key={a.apartado_id}
                      className={`apart-card urg-${urgClass(a.dias_restantes)}`}
                      onClick={() =>
                        setModal({
                          apartado_id: a.apartado_id,
                          libro_titulo: a.libro_titulo,
                          libro_autor: a.libro_autor,
                          apartado_fecha: a.apartado_fecha,
                          apartado_fecha_expiracion: a.apartado_fecha_expiracion,
                          dias_restantes: a.dias_restantes
                        })
                      }
                    >
                      <div className="apart-card-top">
                        <span className={`apart-urg-pill urg-${urgClass(a.dias_restantes)}`}>
                          {urgText(a.dias_restantes)}
                        </span>
                        <span className="apart-card-arrow">↗</span>
                      </div>
                      <h3 className="apart-card-titulo">{a.libro_titulo}</h3>
                      <p className="apart-card-autor">{a.libro_autor}</p>
                      <div className="apart-card-fechas">
                        <div>
                          <span className="afl">Apartado</span>
                          <span className="afv">{fc(a.apartado_fecha)}</span>
                        </div>
                        <div>
                          <span className="afl">Expira</span>
                          <span className="afv red">{fc(a.apartado_fecha_expiracion)}</span>
                        </div>
                      </div>
                      <div className="apart-card-cta">Ver detalles →</div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Historial */}
            {pasados.length > 0 && (
              <section className="apart-section">
                <h2 className="apart-section-title">
                  Historial <span className="apart-badge">{pasados.length}</span>
                </h2>

                <p className="prest-pag-info">
                  Mostrando {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, pasados.length)} de {pasados.length} apartados
                </p>

                <div className="apart-tabla-wrap">
                  <table className="apart-tabla">
                    <thead>
                      <tr>
                        <th>Libro</th>
                        <th>Autor</th>
                        <th>Apartado</th>
                        <th>Expiración</th>
                        <th>Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pasadosPagina.map(a => (
                        <tr key={a.apartado_id}>
                          <td className="td-bold">{a.libro_titulo}</td>
                          <td className="td-muted">{a.libro_autor}</td>
                          <td>{fc(a.apartado_fecha)}</td>
                          <td>{fc(a.apartado_fecha_expiracion)}</td>
                          <td>
                            <span className={`apart-pill ${a.apartado_estatus.toLowerCase()}`}>
                              {a.apartado_estatus === 'Convertido' ? 'Recogido' : a.apartado_estatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPaginas > 1 && <Paginador />}
              </section>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL ══ */}
      {modal && (
        <div className="apart-backdrop" onClick={() => setModal(null)}>
          <div className="apart-modal" onClick={e => e.stopPropagation()}>
            <button className="apart-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="apart-modal-icon">🔖</div>
            <p className="apart-modal-pre">Libro apartado</p>
            <h2 className="apart-modal-titulo">{modal.libro_titulo}</h2>
            <p className="apart-modal-autor">{modal.libro_autor}</p>

            <div className={`apart-dias-box urg-${urgClass(modal.dias_restantes)}`}>
              <span className="apart-dias-num">{modal.dias_restantes}</span>
              <span className="apart-dias-label">
                {modal.dias_restantes === 1 ? 'día restante' : 'días restantes'}
              </span>
            </div>

            <div className={`apart-aviso urg-${urgClass(modal.dias_restantes)}`}>
              {modal.dias_restantes === 0
                ? '⚠️ Tu apartado expira hoy. Pasa a recogerlo a la brevedad.'
                : modal.dias_restantes === 1
                ? '⚠️ Solo tienes 1 día. Recoge el libro mañana a más tardar.'
                : `Tienes hasta el ${fl(modal.apartado_fecha_expiracion)} para recoger el libro en biblioteca.`}
            </div>

            <div className="apart-modal-btns">
              <button className="apart-btn-cancelar" onClick={() => handleCancelar(modal.apartado_id)}>
                Cancelar apartado
              </button>
              <button className="apart-btn-cerrar" onClick={() => setModal(null)}>
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