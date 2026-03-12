// src/components/Navbar.tsx
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
  const navigate  = useNavigate();
  const location  = useLocation();

  const irA = (ruta: string) => {
    if (!usuario) navigate("/login");
    else navigate(ruta);
  };

  const activo = (ruta: string) => location.pathname === ruta ? "nav-item active" : "nav-item";

  return (
    <>
      <header className="home-header">
        <div className="header-inner">

          <div className="logo-wrap" onClick={() => navigate("/")}>
            <div className="logo-icon">B</div>
            <span className="logo-text">Biblioteca WEB</span>
          </div>

          <nav>
            <ul className="nav-list">
              <li className={activo("/")}          onClick={() => navigate("/")}>Inicio</li>
              <li className={activo("/libros")}     onClick={() => navigate("/libros")}>Catálogo</li>
              <li className={activo("/prestamos")}  onClick={() => irA("/prestamos")}>Préstamos</li>
              <li className={activo("/apartados")}  onClick={() => irA("/apartados")}>Apartados</li>
            </ul>
          </nav>

          <div className="header-actions">
            {usuario ? (
              <div className="usuario-sesion">
                {usuario.esta_bloqueado && (
                  <div className="header-bloqueo-pill">
                    🔒 Bloqueado · {usuario.dias_bloqueo_restantes}d restantes
                  </div>
                )}
                <span className="usuario-bienvenida">
                  Hola, <strong>{usuario.usuario_nombre}</strong>
                </span>
                <button className="btn-outline" onClick={onCerrarSesion}>
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

        {/* Banner de bloqueo */}
        {usuario?.esta_bloqueado && (
          <div className="header-bloqueo-banner">
            <span>🔒</span>
            <span>
              Tu cuenta está bloqueada por <strong>{usuario.dias_bloqueo_restantes} día(s)</strong> más.
              Podrás solicitar préstamos y apartados a partir del <strong>{usuario.usuario_bloqueado_hasta}</strong>.
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