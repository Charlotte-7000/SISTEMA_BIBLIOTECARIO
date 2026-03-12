// src/pages/Libros.tsx
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { getLibros, getCategorias, crearApartado, crearPrestamo, type Libro, type Categoria } from "../services/api"
import "./Libros.css"

interface ModalApartado {
  libro: Libro
  tipo: 'apartar' | 'prestar'
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
  const [diasApartado, setDiasApartado] = useState<3 | 5 | 7>(3)

  const usuario = JSON.parse(localStorage.getItem("usuario") || "null")

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {})
  }, [])

  useEffect(() => {
    setCargando(true)
    setError("")
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
      await crearApartado(modal.libro.libro_id, diasApartado)
      mostrar('ok', `"${modal.libro.libro_titulo}" apartado correctamente. Tienes ${diasApartado} días para recogerlo.`)
      setModal(null)
      setDiasApartado(3)
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
      await crearPrestamo(modal.libro.libro_id)
      mostrar('ok', `Préstamo de "${modal.libro.libro_titulo}" creado. Tienes 14 días para devolverlo.`)
      setModal(null)
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
    setDiasApartado(3)
    setModal({ libro, tipo })
  }

  return (
    <div className="libros-page">

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
            {!cargando && <span>{libros.length} resultado{libros.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="libros-content">
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
          <div className="libros-grid">
            {libros.map(libro => (
              <div key={libro.libro_id} className="libro-card">
                <div className="libro-card-top">
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
        )}
      </div>

      {/* ══ MODAL ══ */}
      {modal && (
        <div className="libros-backdrop" onClick={() => setModal(null)}>
          <div className="libros-modal" onClick={e => e.stopPropagation()}>
            <button className="libros-modal-x" onClick={() => setModal(null)}>✕</button>

            <div className="libros-modal-ico">
              {modal.tipo === 'prestar' ? '📖' : '🔖'}
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
                    <span className="lmi-label">Duración</span>
                    <span className="lmi-val">14 días</span>
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
                  <div className="libros-modal-info-item">
                    <span className="lmi-label">Vigencia del apartado</span>
                    <span className="lmi-val">{diasApartado} días</span>
                  </div>
                </>
              )}
            </div>

            {/* Selector de días solo para apartado */}
            {modal.tipo === 'apartar' && (
              <div className="libros-dias-selector">
                <span className="libros-dias-label">¿Cuántos días necesitas?</span>
                <div className="libros-dias-opciones">
                  {([3, 5, 7] as const).map(d => (
                    <button
                      key={d}
                      className={`libros-dia-btn ${diasApartado === d ? 'activo' : ''}`}
                      onClick={() => setDiasApartado(d)}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="libros-modal-aviso">
              {modal.tipo === 'prestar'
                ? 'Al confirmar, el libro quedará registrado a tu nombre. Debes devolverlo en biblioteca dentro de 14 días. Si hay retraso, tu cuenta será bloqueada 1 día por cada día de retraso.'
                : `Al apartar, tienes ${diasApartado} días para pasar a recoger el libro. Si no lo recoges, el apartado expira automáticamente.`
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
    </div>
  )
}