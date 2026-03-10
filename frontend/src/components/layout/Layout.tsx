// src/components/layout/Layout.tsx
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "./Layout.css";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario  = JSON.parse(localStorage.getItem("usuario") || "null");

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  const links = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/libros",    label: "Catálogo"   },
    { path: "/prestamos", label: "Préstamos"  },
    { path: "/apartados", label: "Apartados"  },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      {/* ── Navbar superior fija ── */}
      <header className="layout-nav">
        <div className="layout-nav-inner">

          {/* Logo */}
          <div className="layout-logo" onClick={() => navigate("/")}>
            <div className="layout-logo-icon">B</div>
            <span className="layout-logo-text">Biblioteca WEB</span>
          </div>

          {/* Links */}
          <nav className="layout-links">
            {links.map(l => (
              <button
                key={l.path}
                className={`layout-link ${isActive(l.path) ? "active" : ""}`}
                onClick={() => navigate(l.path)}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Usuario */}
          <div className="layout-user">
            {usuario && (
              <div className="layout-user-info">
                <div className="layout-avatar">
                  {usuario.usuario_nombre?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="layout-user-text">
                  <span className="layout-user-nombre">{usuario.usuario_nombre}</span>
                  <span className="layout-user-rol">{usuario.usuario_rol}</span>
                </div>
              </div>
            )}
            <button className="layout-logout" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>

        </div>
      </header>

      {/* ── Contenido de la página ── */}
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}