// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLibros, getCategorias, type Libro, type Categoria } from "../services/api";
import "./Home.css";

interface Slide {
  image: string;
  headline: string;
  sub: string;
  chip: string;
}

interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  matricula_id: string;
  esta_bloqueado: boolean;
  dias_bloqueo_restantes: number;
  usuario_bloqueado_hasta: string | null;
}

const slides: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80",
    headline: "Descubre el conocimiento",
    sub: "Miles de títulos a tu alcance, listos para explorar cuando los necesitas.",
    chip: "Colección actualizada 2025",
  },
  {
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1400&q=80",
    headline: "Tu siguiente gran lectura",
    sub: "Explora colecciones especializadas por área de estudio.",
    chip: "Más de 500 títulos",
  },
  {
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1400&q=80",
    headline: "Aprende sin límites",
    sub: "Recursos digitales disponibles para ti las 24 horas del día.",
    chip: "Acceso digital 24/7",
  },
];

const categoriaImagenes: Record<string, string> = {
  "Ciencias Exactas":  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80",
  "Humanidades":       "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80",
  "Ciencias de Salud": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80",
  "Derecho":           "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80",
  "default":           "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80",
};

const libroImagenes = [
  "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80",
  "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80",
  "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80",
];

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide,   setCurrentSlide]   = useState(0);
  const [search,         setSearch]         = useState("");
  const [usuario,        setUsuario]        = useState<Usuario | null>(null);
  const [libros,         setLibros]         = useState<Libro[]>([]);
  const [categorias,     setCategorias]     = useState<Categoria[]>([]);
  const [cargandoLibros, setCargandoLibros] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("usuario");
    if (stored) setUsuario(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {});
    setCargandoLibros(true);
    getLibros()
      .then(data => { setLibros(data.slice(0, 4)); setCargandoLibros(false); })
      .catch(() => setCargandoLibros(false));
  }, []);

  const irA = (ruta: string) => {
    if (!usuario) navigate("/login");
    else navigate(ruta);
  };

  const handleBuscar = () => {
    if (search.trim()) navigate(`/libros?busqueda=${encodeURIComponent(search)}`);
    else navigate("/libros");
  };

  const categoriasDestacadas = categorias.slice(0, 4);

  return (
    <div className="home-page">

      {/* ══ SEARCH BAR (sin header — el navbar lo pone Layout/Navbar) ══ */}
      <div className="search-bar">
        <div className="search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ color: "var(--ink-40)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="search-input"
            placeholder="Buscar por título, autor, ISBN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
          <div className="search-divider" />
          <select className="search-select">
            <option>Todos</option>
            <option>Título</option>
            <option>Autor</option>
            <option>ISBN</option>
          </select>
          <button className="search-btn" onClick={handleBuscar}>Buscar</button>
        </div>
      </div>

      {/* ══ HERO ══ */}
      <section className="hero-section">
        {slides.map((slide, i) => (
          <div
            key={i} className="slide"
            style={{ opacity: i === currentSlide ? 1 : 0, zIndex: i === currentSlide ? 1 : 0 }}
          >
            <img src={slide.image} alt={slide.headline} />
            <div className="slide-overlay" />
            <div className="slide-content">
              <div className="slide-chip">
                <span className="slide-chip-dot" />
                {slide.chip}
              </div>
              <h1 className="slide-headline">{slide.headline}</h1>
              <p className="slide-sub">{slide.sub}</p>
              <div className="slide-actions">
                <button className="slide-cta" onClick={() => navigate("/libros")}>
                  Explorar catálogo
                </button>
                {!usuario && (
                  <button className="slide-cta-ghost" onClick={() => navigate("/registro")}>
                    Crear cuenta
                  </button>
                )}
                {usuario && (
                  <button className="slide-cta-ghost" onClick={() => navigate("/prestamos")}>
                    Mis préstamos
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="hero-stats">
          {[
            { num: `${libros.length > 0 ? "500 +" : "—"}`, label: "Títulos" },
            { num: `${categorias.length > 0 ? categorias.length : "—"}`, label: "Categorías" },
            { num: "14 días", label: "Préstamo" },
          ].map((s) => (
            <div className="hero-stat-pill" key={s.label}>
              <span className="hero-stat-num">{s.num}</span>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="hero-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === currentSlide ? " active" : ""}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
      </section>

      {/* ══ CATEGORÍAS ══ */}
      {categoriasDestacadas.length > 0 && (
        <section className="section">
          <p className="section-label">Explora por área</p>
          <h2 className="section-title">Categorías de la colección</h2>
          <div className="mosaic-grid">
            {categoriasDestacadas.map((cat, i) => (
              <div
                key={cat.categoria_id}
                className={`mosaic-card${i === 0 ? " large" : ""}`}
                onClick={() => navigate(`/libros?categoria=${cat.categoria_id}`)}
              >
                <img
                  src={categoriaImagenes[cat.categoria_nombre] || categoriaImagenes["default"]}
                  alt={cat.categoria_nombre}
                />
                <div className="mosaic-overlay" />
                <div className="mosaic-label">
                  <span className="mosaic-tag">{cat.categoria_nombre}</span>
                  <p className="mosaic-title">{cat.categoria_nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ LIBROS DESTACADOS ══ */}
      <section className="section">
        <p className="section-label">Libros Destacados</p>
        <h2 className="section-title">Los más recientes</h2>
        {cargandoLibros ? (
          <div className="home-loading">
            <div className="home-spinner" />
            <p>Cargando libros…</p>
          </div>
        ) : (
          <div className="libros-grid">
            {libros.map((libro, i) => (
              <div key={libro.libro_id} className="libro-card">
                <div className="libro-img-wrap">
                  <img src={libroImagenes[i % libroImagenes.length]} alt={libro.libro_titulo} />
                  <span className={`libro-badge ${libro.libro_ejemplares > 0 ? "disponible" : "agotado"}`}>
                    {libro.libro_ejemplares > 0 ? `${libro.libro_ejemplares} disponibles` : "Agotado"}
                  </span>
                </div>
                <div className="libro-info">
                  <span className="libro-categoria">{libro.categoria_nombre}</span>
                  <p className="libro-titulo">{libro.libro_titulo}</p>
                  <p className="libro-autor">{libro.libro_autor}</p>
                  <div className="libro-actions">
                    <button className="btn-ver" onClick={() => navigate("/libros")}>
                      Ver catálogo
                    </button>
                    <button className="btn-apartar" onClick={() => navigate("/libros")}>
                      {usuario ? "Solicitar" : "Inicia sesión"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══ SERVICIOS ══ */}
      <section className="section">
        <p className="section-label">Servicios</p>
        <h2 className="section-title">¿Qué necesitas hoy?</h2>
        <div className="banner-grid">
          <div className="banner-card" onClick={() => irA("/prestamos")}>
            <img src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80" alt="Préstamo" />
            <div className="banner-overlay" />
            <div className="banner-content">
              <div className="banner-pill">Préstamo</div>
              <h3 className="banner-title">Solicita un préstamo</h3>
              <p className="banner-sub">Lleva el libro a casa hasta por 14 días</p>
              <button className="banner-cta">
                {usuario ? "Ver mis préstamos →" : "Inicia sesión para solicitar"}
              </button>
            </div>
          </div>
          <div className="banner-card" onClick={() => irA("/apartados")}>
            <img src="https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80" alt="Apartado" />
            <div className="banner-overlay" />
            <div className="banner-content">
              <div className="banner-pill">Apartado</div>
              <h3 className="banner-title">Aparta tu ejemplar</h3>
              <p className="banner-sub">Reserva el libro — elige entre 3, 5 o 7 días para recogerlo</p>
              <button className="banner-cta">
                {usuario ? "Ver mis apartados →" : "Inicia sesión para apartar"}
              </button>
            </div>
          </div>
        </div>
      </section>

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