import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

interface Slide {
  image: string;
  headline: string;
  sub: string;
}

interface LibroDestacado {
  libro_id: number;
  libro_titulo: string;
  libro_autor: string;
  categoria: string;
  libro_ejemplares: number;
  image: string;
}

interface CategoriaCard {
  categoria_nombre: string;
  tag: string;
  image: string;
  large: boolean;
}

interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  usuario_nombre_acceso: string;
  usuario_rol: string;
}

const slides: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1400&q=80",
    headline: "Descubre el conocimiento",
    sub: " Títulos a tu alcance",
  },
  {
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1400&q=80",
    headline: "Tu siguiente gran lectura",
    sub: "Explora colecciones especializadas",
  },
  {
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1400&q=80",
    headline: "Aprende sin límites",
    sub: "Recursos digitales disponibles 24/7",
  },
];

const categorias: CategoriaCard[] = [
  { categoria_nombre: "Ciencias Exactas",  tag: "Exactas",     image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80", large: true  },
  { categoria_nombre: "Humanidades",       tag: "Humanidades", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80", large: false },
  { categoria_nombre: "Ciencias de Salud", tag: "Salud",       image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80", large: false },
  { categoria_nombre: "Derecho",           tag: "Derecho",     image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80", large: false },
];

const librosDestacados: LibroDestacado[] = [
  { libro_id: 1, libro_titulo: "Cálculo Diferencial e Integral", libro_autor: "James Stewart",     categoria: "Ciencias Exactas",  libro_ejemplares: 8,  image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80" },
  { libro_id: 2, libro_titulo: "Introducción al Derecho",        libro_autor: "Eduardo García M.", categoria: "Derecho",           libro_ejemplares: 5,  image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80" },
  { libro_id: 3, libro_titulo: "Anatomía Humana",                libro_autor: "Frank H. Netter",   categoria: "Ciencias de Salud", libro_ejemplares: 0,  image: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&q=80" },
  { libro_id: 4, libro_titulo: "Historia de México",             libro_autor: "Enrique Krauze",    categoria: "Humanidades",       libro_ejemplares: 12, image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80" },
];

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("usuario");
    if (stored) setUsuario(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleTramite = () => {
    if (!usuario) {
      navigate("/registro");
    } else {
      navigate("/libros");
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  };

  return (
    <div className="home-page">

      {/* HEADER */}
      <header className="home-header">
        <div className="header-inner">
          <div className="logo-wrap" onClick={() => navigate("/")}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>

          <nav>
            <ul className="nav-list">
              <li className="nav-item active">Inicio</li>
              <li className="nav-item" onClick={() => navigate("/libros")}>Catálogo</li>
              <li className="nav-item" onClick={handleTramite}>Préstamos</li>
              <li className="nav-item" onClick={handleTramite}>Apartados</li>
              <li className="nav-item">Ayuda</li>
            </ul>
          </nav>

          <div className="header-actions">
            {usuario ? (
              <div className="usuario-sesion">
                <span className="usuario-bienvenida">
                  Hola, <strong>{usuario.usuario_nombre}</strong>
                </span>
                <button className="btn-outline" onClick={handleCerrarSesion}>
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="usuario-sesion">
                <button className="btn-outline" onClick={() => navigate("/login")}>
                  Iniciar sesión
                </button>
                <button className="btn-primary" onClick={() => navigate("/registro")}>
                  Registrarse
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="search-bar">
          <div className="search-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              placeholder="Buscar por título, autor, ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="search-select">
              <option>Todos</option>
              <option>Título</option>
              <option>Autor</option>
              <option>ISBN</option>
            </select>
            <button className="search-btn">Buscar</button>
          </div>
        </div>
      </header>

      {/* HERO SLIDER */}
      <section className="hero-section">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="slide"
            style={{ opacity: i === currentSlide ? 1 : 0, zIndex: i === currentSlide ? 1 : 0 }}
          >
            <img src={slide.image} alt={slide.headline} />
            <div className="slide-overlay" />
            <div className="slide-content">
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
              </div>
            </div>
          </div>
        ))}
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

      {/* CATEGORÍAS */}
      <section className="section">
        <p className="section-label">EXPLORA POR ÁREA</p>
        <h2 className="section-title">Categorías de la colección</h2>
        <div className="mosaic-grid">
          {categorias.map((cat) => (
            <div key={cat.categoria_nombre} className={`mosaic-card${cat.large ? " large" : ""}`}>
              <img src={cat.image} alt={cat.categoria_nombre} />
              <div className="mosaic-overlay" />
              <div className="mosaic-label">
                <span className="mosaic-tag">{cat.tag}</span>
                <p className="mosaic-title">{cat.categoria_nombre}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LIBROS DESTACADOS */}
      <section className="section">
        <p className="section-label">LIBROS DESTACADOS</p>
        <h2 className="section-title">Los más solicitados</h2>
        <div className="libros-grid">
          {librosDestacados.map((libro) => (
            <div key={libro.libro_id} className="libro-card">
              <div className="libro-img-wrap">
                <img src={libro.image} alt={libro.libro_titulo} />
                <span className={`libro-badge ${libro.libro_ejemplares > 0 ? "disponible" : "agotado"}`}>
                  {libro.libro_ejemplares > 0 ? `${libro.libro_ejemplares} disponibles` : "Agotado"}
                </span>
              </div>
              <div className="libro-info">
                <span className="libro-categoria">{libro.categoria}</span>
                <p className="libro-titulo">{libro.libro_titulo}</p>
                <p className="libro-autor">{libro.libro_autor}</p>
                <div className="libro-actions">
                  <button className="btn-ver" onClick={() => navigate("/libros")}>
                    Ver catálogo
                  </button>
                  <button
                    className="btn-apartar"
                    onClick={handleTramite}
                    disabled={libro.libro_ejemplares === 0}
                    title={!usuario ? "Inicia sesión para apartar" : ""}
                  >
                    {usuario ? "Apartar" : "Inicia sesión"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="section">
        <p className="section-label">SERVICIOS</p>
        <h2 className="section-title">¿Qué necesitas hoy?</h2>
        <div className="banner-grid">
          <div className="banner-card" onClick={handleTramite}>
            <img src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&q=80" alt="Préstamo" />
            <div className="banner-overlay" />
            <div className="banner-content">
              <h3 className="banner-title">Solicita un préstamo</h3>
              <p className="banner-sub">Lleva el libro a casa hasta por 7 días</p>
              <button className="banner-cta">
                {usuario ? "Solicitar préstamo" : "Regístrate para solicitar"}
              </button>
            </div>
          </div>
          <div className="banner-card" onClick={handleTramite}>
            <img src="https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80" alt="Apartado" />
            <div className="banner-overlay" />
            <div className="banner-content">
              <h3 className="banner-title">Aparta tu ejemplar</h3>
              <p className="banner-sub">Reserva el libro antes de que se agote</p>
              <button className="banner-cta">
                {usuario ? "Apartar ejemplar" : "Regístrate para apartar"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-grid">
          <div>
            <p className="footer-heading">Soporte</p>
            {["Centro de ayuda", "Reportar problema", "Accesibilidad", "Políticas"].map((l) => (
              <p key={l} className="footer-link">{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Servicios</p>
            {["Catálogo en línea", "Préstamos", "Apartados", "Renovaciones"].map((l) => (
              <p key={l} className="footer-link">{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Acerca de</p>
            {["Historia BUAP", "Misión", "Contacto", "Ubicación"].map((l) => (
              <p key={l} className="footer-link">{l}</p>
            ))}
          </div>
          <div>
            <p className="footer-heading">Boletín informativo</p>
            <p className="footer-desc">Recibe novedades en tu correo institucional</p>
            <div className="newsletter-row">
              <input className="newsletter-input" placeholder="tu@alumno.web.mx" />
              <button className="newsletter-btn">Suscribir</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Biblioteca BUAP · Privacidad · Términos de uso</span>
        </div>
      </footer>
    </div>
  );
}