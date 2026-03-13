// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import './AdminDashboard.css';

const API = 'http://localhost:8000/api';

interface Stats {
  total_usuarios:    number;
  total_libros:      number;
  prestamos_activos: number;
  prestamos_vencidos:number;
  apartados_activos: number;
  multas_activas:    number;
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/admin/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Usuarios',           value: stats.total_usuarios,     color: 'blue',    icon: '👥' },
    { label: 'Libros',             value: stats.total_libros,       color: 'purple',  icon: '📚' },
    { label: 'Préstamos activos',  value: stats.prestamos_activos,  color: 'green',   icon: '📖' },
    { label: 'Préstamos vencidos', value: stats.prestamos_vencidos, color: 'red',     icon: '⚠️' },
    { label: 'Apartados activos',  value: stats.apartados_activos,  color: 'yellow',  icon: '🔖' },
    { label: 'Multas activas',     value: stats.multas_activas,     color: 'orange',  icon: '🔒' },
  ] : [];

  return (
    <div className="adash-page">
      <div className="adash-header">
        <div>
          <h1 className="adash-title">Dashboard</h1>
          <p className="adash-sub">Resumen general del sistema</p>
        </div>
        <div className="adash-fecha">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="adash-loading">
          <div className="adash-spinner" />
          <p>Cargando estadísticas…</p>
        </div>
      ) : (
        <div className="adash-grid">
          {cards.map(c => (
            <div key={c.label} className={`adash-card adash-card-${c.color}`}>
              <div className="adash-card-icon">{c.icon}</div>
              <div className="adash-card-info">
                <span className="adash-card-value">{c.value}</span>
                <span className="adash-card-label">{c.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}