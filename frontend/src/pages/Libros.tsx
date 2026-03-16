// src/pages/Libros.tsx
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getLibros, getCategorias, crearApartado, crearPrestamo, type Libro, type Categoria } from "../services/api"
import "./Libros.css"

const POR_PAGINA = 12

interface ModalApartado {
  libro: Libro
  tipo: 'apartar' | 'prestar'
}

// ── Paleta de colores para portadas generadas ──
const COVER_PALETTES = [
  { bg: ['#1e3a5f', '#2d6a9f'], text: '#e8f4fd' },
  { bg: ['#2d1b4e', '#6b35a0'], text: '#f0e8ff' },
  { bg: ['#1a3a2a', '#2d7a50'], text: '#e8f5ee' },
  { bg: ['#3a1a1a', '#9a3030'], text: '#fde8e8' },
  { bg: ['#1a2a3a', '#2d5a8a'], text: '#e8f0fd' },
  { bg: ['#2a2a1a', '#7a7020'], text: '#fdfae8' },
  { bg: ['#1a3a3a', '#207a7a'], text: '#e8fdfd' },
  { bg: ['#3a2a1a', '#9a6020'], text: '#fdf0e8' },
]

const getPalette = (titulo: string) => {
  const sum = titulo.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COVER_PALETTES[sum % COVER_PALETTES.length]
}

const abreviar = (txt: string, max: number) =>
  txt.length > max ? txt.slice(0, max).trim() + '…' : txt

// ── Componente de portada ──
function BookCover({ libro, size = 'md' }: { libro: Libro; size?: 'sm' | 'md' | 'lg' }) {
  const [imgOk, setImgOk] = useState<boolean | null>(null)
  const palette = getPalette(libro.libro_titulo)

  const coverUrl = libro.libro_isbn
    ? `https://covers.openlibrary.org/b/isbn/${libro.libro_isbn.replace(/-/g, '')}-M.jpg`
    : null

  const heights: Record<string, number> = { sm: 120, md: 180, lg: 240 }
  const h = heights[size]

  return (
    <div className={`book-cover book-cover-${size}`} style={{ height: h }}>
      {coverUrl && imgOk !== false && (
        <img
          src={coverUrl}
          alt={libro.libro_titulo}
          className={`book-cover-img${imgOk ? ' loaded' : ''}`}
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
        />
      )}

      {(imgOk === false || !coverUrl) && (
        <div
          className="book-cover-generated"
          style={{
            background: `linear-gradient(145deg, ${palette.bg[0]}, ${palette.bg[1]})`,
            color: palette.text,
          }}
        >
          <div className="bcg-spine" style={{ background: palette.bg[0] }} />
          <div className="bcg-content">
            <div className="bcg-deco">
              <div className="bcg-circle" style={{ borderColor: palette.text + '30' }} />
              <div className="bcg-line" style={{ background: palette.text + '40' }} />
              <div className="bcg-line short" style={{ background: palette.text + '30' }} />
            </div>
            <p className="bcg-titulo">{abreviar(libro.libro_titulo, size === 'lg' ? 60 : 40)}</p>
            <p className="bcg-autor">{abreviar(libro.libro_autor, 30)}</p>
          </div>
          <div className="bcg-bottom-bar" style={{ background: palette.bg[0] + 'aa' }} />
        </div>
      )}

      {coverUrl && imgOk === null && (
        <div className="book-cover-shimmer" />
      )}
    </div>
  )
}

export default function Libros() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [libros,       setLibros]     = useState<Libro[]>([])
  const [categorias,   setCategorias] = useState<Categoria[]>([])
  const [busqueda,     setBusqueda]   = useState(searchParams.get("busqueda") || "")
  const [categoria,    setCategoria]  = useState("")
  const [cargando,     setCargando]   = useState(true)
  const [error,        setError]      = useState("")
  const [modal,        setModal]      = useState<ModalApartado | null>(null)
  const [accionando,   setAccionando] = useState(false)
  const [msg,          setMsg]        = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [diasPrestamo, setDiasPrestamo] = useState<3 | 5 | 7>(7)
  const [pagina,       setPagina]     = useState(1)

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    setError("")
    setPagina(1)
    getLibros(busqueda, categoria)
      .then(data => { setLibros(data); setCargando(false) })
      .catch(() => { setError("No se pudieron cargar los libros"); setCargando(false) })
  }, [busqueda, categoria])

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleApartar = async () => {
    if (!modal) return
    if (!usuario) { navigate("/login"); return }
    setAccionando(true)
    try {
      await crearApartado(modal.libro.libro_id)
      mostrar('ok', `"${modal.libro.libro_titulo}" apartado correctamente. El sistema tiene hasta 5 días para asignártelo y luego tendrás 3 días para recogerlo.`)
      setModal(null)
      getLibros(busqueda, categoria).then(setLibros)
    } catch (e: any) {
      mostrar('err', e.message)
      setModal(null)
    } finally {
      setAccionando(false)
    }
  }

  const handlePrestar = async () => {
    if (!modal) return
    if (!usuario) { navigate("/login"); return }
    setAccionando(true)
    try {
      await crearPrestamo(modal.libro.libro_id, diasPrestamo)
      mostrar('ok', `Préstamo de "${modal.libro.libro_titulo}" creado. Tienes ${diasPrestamo} días para devolverlo.`)
      setModal(null)
      setDiasPrestamo(7)
      getLibros(busqueda, categoria).then(setLibros)
    } catch (e: any) {
      mostrar('err', e.message)
      setModal(null)
    } finally {
      setAccionando(false)
    }
  }

  const abrirModal = (libro: Libro, tipo: 'apartar' | 'prestar') => {
    if (!usuario) { navigate("/login"); return }
    setDiasPrestamo(7)
    setModal({ libro, tipo })
  }

  const totalPaginas = Math.ceil(libros.length / POR_PAGINA)
  const librosPagina = libros.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const irPagina = (p: number) => {
    setPagina(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="libros-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="libros-hero">
        <div className="libros-hero-content">
          <div className="libros-breadcrumb">Biblioteca WEB / Catálogo</div>
          <h1 className="libros-h1">Catálogo de libros</h1>
          <p className="libros-subtitle">Encuentra tu próxima lectura entre nuestra colección</p>
        </div>
        <div className="libros-hero-right">
          {usuario && (
            <div className="libros-usuario-pill">
              <div className="libros-usuario-avatar">{usuario.usuario_nombre[0]}</div>
              <div>
                <span className="libros-usuario-nombre">{usuario.usuario_nombre}</span>
                <span className="libros-usuario-rol">{usuario.usuario_rol}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notif */}
      {msg && (
        <div className={`libros-notif ${msg.tipo}`}>
          {msg.tipo === 'ok' ? '✓' : '⚠'} {msg.texto}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="libros-filtros-wrap">
        <div className="libros-filtros">
          <div className="filtro-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="filtro-input"
              type="text"
              placeholder="Buscar por título o autor…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="filtro-clear" onClick={() => setBusqueda("")}>✕</button>
            )}
          </div>
          <select
            className="filtro-select"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.categoria_id} value={cat.categoria_id}>
                {cat.categoria_nombre}
              </option>
            ))}
          </select>
          <div className="filtro-results">
            {!cargando && (
              <span>
                {libros.length} resultado{libros.length !== 1 ? 's' : ''}
                {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="libros-content" style={{ flex: 1 }}>
        {error && (
          <div className="libros-error-state">
            <span>⚠️</span><p>{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="libros-loading">
            <div className="libros-spinner" />
            <p>Cargando catálogo…</p>
          </div>
        ) : libros.length === 0 ? (
          <div className="libros-empty">
            <div className="libros-empty-ico">📚</div>
            <h3>Sin resultados</h3>
            <p>No se encontraron libros con esos filtros.</p>
            <button className="libros-empty-btn" onClick={() => { setBusqueda(""); setCategoria("") }}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="libros-grid">
              {librosPagina.map(libro => (
                <div key={libro.libro_id} className="libro-card">

                  {/* ── Portada ── */}
                  <div className="libro-cover-wrap">
                    <BookCover libro={libro} size="md" />
                    <span className={`libro-badge ${libro.libro_ejemplares > 0 ? "disponible" : "agotado"}`}>
                      {libro.libro_ejemplares > 0 ? `${libro.libro_ejemplares} disponibles` : "Agotado"}
                    </span>
                  </div>

                  <div className="libro-body">
                    <span className="libro-categoria">{libro.categoria_nombre}</span>
                    <p className="libro-titulo">{libro.libro_titulo}</p>
                    <p className="libro-autor">{libro.libro_autor}</p>
                    {libro.libro_descripcion && (
                      <p className="libro-desc">{libro.libro_descripcion}</p>
                    )}
                    <p className="libro-isbn">ISBN: {libro.libro_isbn}</p>
                  </div>

                  <div className="libro-acciones">
                    {libro.libro_ejemplares > 0 ? (
                      <>
                        <button className="btn-prestar" onClick={() => abrirModal(libro, 'prestar')}>
                          Solicitar préstamo
                        </button>
                        <button className="btn-apartar-outline" onClick={() => abrirModal(libro, 'apartar')}>
                          Apartar
                        </button>
                      </>
                    ) : (
                      <button className="btn-apartar-agotado" onClick={() => abrirModal(libro, 'apartar')}>
                        🔖 Apartar para cuando esté disponible
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPaginas > 1 && (
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
                          >{p}</button>
                    )
                  }
                </div>
                <button className="pag-btn" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ MODAL ══ */}
      {modal && (
        <div className="libros-backdrop" onClick={() => setModal(null)}>
          <div className="libros-modal" onClick={e => e.stopPropagation()}>
            <button className="libros-modal-x" onClick={() => setModal(null)}>✕</button>

            {/* Portada en el modal */}
            <div className="libros-modal-cover">
              <BookCover libro={modal.libro} size="lg" />
            </div>

            <p className="libros-modal-pre">
              {modal.tipo === 'prestar' ? 'Solicitar préstamo' : 'Apartar libro'}
            </p>
            <h2 className="libros-modal-titulo">{modal.libro.libro_titulo}</h2>
            <p className="libros-modal-autor">{modal.libro.libro_autor}</p>

            <div className="libros-modal-info">
              {modal.tipo === 'prestar' ? (
                <>
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Disponibilidad</span>
                    <span className="lmi-val green">{modal.libro.libro_ejemplares} ejemplar(es)</span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Duración elegida</span>
                    <span className="lmi-val">{diasPrestamo} días</span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Retraso</span>
                    <span className="lmi-val red">1 día bloqueado por día</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Estado del libro</span>
                    <span className={`lmi-val ${modal.libro.libro_ejemplares > 0 ? 'green' : 'red'}`}>
                      {modal.libro.libro_ejemplares > 0 ? 'Disponible' : 'Sin ejemplares'}
                    </span>
                  </div>
                  <div className="libros-modal-info-sep" />
                  {modal.libro.libro_ejemplares === 0 && (
                    <>
                      <div className="libros-modal-info-item">
                        <span className="lmi-label">Espera máxima</span>
                        <span className="lmi-val">5 días</span>
                      </div>
                      <div className="libros-modal-info-sep" />
                    </>
                  )}
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Tiempo para recoger</span>
                    <span className="lmi-val">3 días</span>
                  </div>
                </>
              )}
            </div>

            {modal.tipo === 'prestar' && (
              <div className="libros-dias-selector">
                <span className="libros-dias-label">¿Cuántos días necesitas?</span>
                <div className="libros-dias-opciones">
                  {([3, 5, 7] as const).map(d => (
                    <button
                      key={d}
                      className={`libros-dia-btn ${diasPrestamo === d ? 'activo' : ''}`}
                      onClick={() => setDiasPrestamo(d)}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="libros-modal-aviso">
              {modal.tipo === 'prestar'
                ? `Al confirmar, el libro quedará registrado a tu nombre. Debes devolverlo en biblioteca dentro de ${diasPrestamo} días. Si hay retraso, tu cuenta será bloqueada 1 día por cada día de retraso.`
                : modal.libro.libro_ejemplares > 0
                  ? 'El libro está disponible y será asignado a tu nombre de inmediato. Tendrás 3 días para pasar a recogerlo en biblioteca antes de que el apartado expire.'
                  : 'El libro no está disponible. Te anotaremos en lista de espera. Si en 5 días no se libera un ejemplar, el apartado se cancelará automáticamente. Una vez asignado, tendrás 3 días para recogerlo.'
              }
            </p>

            <div className="libros-modal-btns">
              <button
                className="libros-btn-confirmar"
                disabled={accionando}
                onClick={modal.tipo === 'prestar' ? handlePrestar : handleApartar}
              >
                {accionando ? 'Procesando…' : modal.tipo === 'prestar' ? 'Confirmar préstamo' : 'Confirmar apartado'}
              </button>
              <button className="libros-btn-cancel" onClick={() => setModal(null)}>
                Cancelar
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
  )
}