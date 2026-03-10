import axios from "axios"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./Libros.css"

// Cómo se ve un libro
interface Libro {
  libro_id: number
  libro_titulo: string
  libro_autor: string
  libro_isbn: string
  libro_ejemplares: number
  libro_descripcion: string
  categoria_nombre: string
}

// Cómo se ve una categoría
interface Categoria {
  categoria_id: number
  categoria_nombre: string
}

export default function Libros() {
  const navigate = useNavigate()

  const [libros,     setLibros]     = useState<Libro[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda,   setBusqueda]   = useState("")
  const [categoria,  setCategoria]  = useState("")
  const [cargando,   setCargando]   = useState(true)
  const [error,      setError]      = useState("")

  // Token del usuario guardado en localStorage
  const token = localStorage.getItem("token")

  // Carga categorías una sola vez
  useEffect(() => {
    axios.get("http://localhost:8000/api/categorias/", {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => setCategorias(res.data))
    .catch(() => setError("No se pudieron cargar las categorías"))
  }, [])

  // Carga libros cada vez que cambia búsqueda o categoría
  useEffect(() => {
    setCargando(true)
    axios.get("http://localhost:8000/api/libros/", {
      headers: { Authorization: `Bearer ${token}` },
      params: { busqueda, categoria }
    })
    .then((res) => {
      setLibros(res.data)
      setCargando(false)
    })
    .catch(() => {
      setError("No se pudieron cargar los libros")
      setCargando(false)
    })
  }, [busqueda, categoria])

  const cerrarSesion = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    navigate("/login")
  }

  return (
    <div className="libros-page">

      {/* HEADER */}
      <header className="libros-header">
        <div className="libros-header-inner">
          <div className="logo-wrap" onClick={() => navigate("/home")}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>
          <nav className="libros-nav">
            <span className="nav-item" onClick={() => navigate("/home")}>Inicio</span>
            <span className="nav-item active">Catálogo</span>
          </nav>
          <button className="btn-outline" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* TÍTULO */}
      <div className="libros-hero">
        <h1 className="libros-titulo">Catálogo de libros</h1>
        <p className="libros-subtitulo">Encuentra tu próxima lectura</p>
      </div>

      {/* FILTROS */}
      <div className="libros-filtros">
        <input
          className="filtro-input"
          type="text"
          placeholder="Buscar por título o autor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="filtro-select"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.categoria_id} value={cat.categoria_id}>
              {cat.categoria_nombre}
            </option>
          ))}
        </select>
      </div>

      {/* CONTENIDO */}
      {error && <p className="libros-error">{error}</p>}

      {cargando ? (
        <p className="libros-cargando">Cargando libros...</p>
      ) : libros.length === 0 ? (
        <p className="libros-vacio">No se encontraron libros.</p>
      ) : (
        <div className="libros-grid">
          {libros.map((libro) => (
            <div key={libro.libro_id} className="libro-card">

              <span className={`libro-badge ${libro.libro_ejemplares > 0 ? "disponible" : "agotado"}`}>
                {libro.libro_ejemplares > 0 ? `${libro.libro_ejemplares} disponibles` : "Agotado"}
              </span>

              <div className="libro-info">
                <span className="libro-categoria">{libro.categoria_nombre}</span>
                <p className="libro-titulo">{libro.libro_titulo}</p>
                <p className="libro-autor">{libro.libro_autor}</p>
                <p className="libro-descripcion">{libro.libro_descripcion}</p>
                <p className="libro-isbn">ISBN: {libro.libro_isbn}</p>
              </div>

              <div className="libro-acciones">
                <button
                  className="btn-apartar"
                  disabled={libro.libro_ejemplares === 0}
                >
                  {libro.libro_ejemplares > 0 ? "Apartar" : "No disponible"}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}