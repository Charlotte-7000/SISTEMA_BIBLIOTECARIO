import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  matricula_id: string;
  esta_bloqueado: boolean;
  dias_bloqueo_restantes: number;
  usuario_bloqueado_hasta: string | null;
}

interface Props {
  usuario: Usuario | null;
  onCerrarSesion: () => void;
}

export default function Navbar({ usuario, onCerrarSesion }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const irA = (ruta: string) => {
    if (!usuario) navigate("/login");
    else navigate(ruta);
    setMenuOpen(false);
  };

  const activo = (ruta: string) =>
    location.pathname === ruta ? "nav-item active" : "nav-item";

  return (
    <>
      <header className="home-header">
        <div className="header-inner">
          <div className="logo-wrap" onClick={() => { navigate("/"); setMenuOpen(false); }}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>

          <nav className={menuOpen ? "open" : ""}>
            <ul className="nav-list">
              <li className={activo("/")}         onClick={() => { navigate("/"); setMenuOpen(false); }}>Inicio</li>
              <li className={activo("/libros")}    onClick={() => { navigate("/libros"); setMenuOpen(false); }}>Catálogo</li>
              <li className={activo("/prestamos")} onClick={() => irA("/prestamos")}>Préstamos</li>
              <li className={activo("/apartados")} onClick={() => irA("/apartados")}>Apartados</li>
            </ul>
          </nav>

          <div className={`header-actions${menuOpen ? " open" : ""}`}>
            {usuario ? (
              <div className="usuario-sesion">
                {usuario.esta_bloqueado && (
                  <div className="header-bloqueo-pill">
                    🔒 Bloqueado · {usuario.dias_bloqueo_restantes}d
                  </div>
                )}
                <span className="usuario-bienvenida">
                  Hola, <strong>{usuario.usuario_nombre}</strong>
                </span>
                <button className="btn-outline" onClick={() => { onCerrarSesion(); setMenuOpen(false); }}>
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="usuario-sesion">
                <button className="btn-outline" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
                  Iniciar sesión
                </button>
                <button className="btn-primary" onClick={() => { navigate("/registro"); setMenuOpen(false); }}>
                  Registrarse
                </button>
              </div>
            )}
          </div>

          <button
            className={`hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <span /><span /><span />
          </button>
        </div>

        {usuario?.esta_bloqueado && (
          <div className="header-bloqueo-banner">
            <span>🔒</span>
            <span>
              Tu cuenta está bloqueada por <strong>{usuario.dias_bloqueo_restantes} día(s)</strong> más.
            </span>
            <button onClick={() => irA("/prestamos")} className="header-bloqueo-link">
              Ver mis préstamos
            </button>
          </div>
        )}
      </header>
    </>
  );
}