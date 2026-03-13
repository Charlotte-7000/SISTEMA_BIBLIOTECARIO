// src/pages/admin/AdminLayout.tsx
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

interface Usuario {
  usuario_id: number;
  usuario_nombre: string;
  matricula_id: string;
  usuario_rol: string;
}

const NAV_ITEMS = [
  { path: '/admin',           icon: '▦',  label: 'Dashboard'  },
  { path: '/admin/usuarios',  icon: '👥', label: 'Usuarios'   },
  { path: '/admin/libros',    icon: '📚', label: 'Libros'     },
  { path: '/admin/prestamos', icon: '📖', label: 'Préstamos'  },
  { path: '/admin/apartados', icon: '🔖', label: 'Apartados'  },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const usuario: Usuario | null = JSON.parse(localStorage.getItem('usuario') || 'null');

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const activo = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

  return (
    <div className={`admin-layout ${collapsed ? 'collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-logo" onClick={() => navigate('/admin')}>
            <div className="admin-logo-icon">B</div>
            {!collapsed && <span className="admin-logo-text">Biblioteca</span>}
          </div>
          <button className="admin-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {!collapsed && (
          <div className="admin-sidebar-label">PANEL ADMIN</div>
        )}

        <nav className="admin-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`admin-nav-item ${activo(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {!collapsed && <span className="admin-nav-label">{item.label}</span>}
              {!collapsed && activo(item.path) && <span className="admin-nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {!collapsed && usuario && (
            <div className="admin-user-info">
              <div className="admin-user-avatar">
                {usuario.usuario_nombre[0]}
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name">{usuario.usuario_nombre}</span>
                <span className="admin-user-role">Administrador</span>
              </div>
            </div>
          )}
          <button
            className="admin-logout-btn"
            onClick={cerrarSesion}
            title="Cerrar sesión"
          >
            <span>⏻</span>
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}