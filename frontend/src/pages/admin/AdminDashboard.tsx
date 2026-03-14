// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState, useRef } from 'react';
import './AdminDashboard.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Stats {
  total_usuarios:     number;
  total_libros:       number;
  prestamos_activos:  number;
  prestamos_vencidos: number;
  apartados_activos:  number;
  multas_activas:     number;
}

// Hook para animar el conteo de números
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return value;
}

function StatCard({ label, value, icon, accent, delay, sublabel }: {
  label: string; value: number; icon: string;
  accent: string; delay: number; sublabel?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="adash-card" style={{ '--accent': accent, '--delay': `${delay}ms` } as React.CSSProperties}>
      <div className="adash-card-glow" />
      <div className="adash-card-top">
        <span className="adash-card-icon">{icon}</span>
        <div className="adash-card-indicator" />
      </div>
      <div className="adash-card-num">{animated.toLocaleString()}</div>
      <div className="adash-card-label">{label}</div>
      {sublabel && <div className="adash-card-sublabel">{sublabel}</div>}
      <div className="adash-card-bar">
        <div className="adash-card-bar-fill" style={{ width: value > 0 ? '100%' : '0%' }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hora,    setHora]    = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/admin/dashboard/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));

    const tick = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fecha = hora.toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const horaStr = hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const cards = stats ? [
    { label: 'Usuarios registrados', value: stats.total_usuarios,     icon: '👥', accent: '#60a5fa', sublabel: 'en el sistema' },
    { label: 'Libros en catálogo',   value: stats.total_libros,       icon: '📚', accent: '#a78bfa', sublabel: 'disponibles' },
    { label: 'Préstamos activos',    value: stats.prestamos_activos,  icon: '📖', accent: '#34d399', sublabel: 'en circulación' },
    { label: 'Préstamos vencidos',   value: stats.prestamos_vencidos, icon: '⚠️', accent: '#f87171', sublabel: 'requieren atención' },
    { label: 'Apartados activos',    value: stats.apartados_activos,  icon: '🔖', accent: '#fbbf24', sublabel: 'pendientes de recogida' },
    { label: 'Multas activas',       value: stats.multas_activas,     icon: '🔒', accent: '#fb923c', sublabel: 'usuarios bloqueados' },
  ] : [];

  const total = stats ? stats.prestamos_activos + stats.prestamos_vencidos + stats.apartados_activos : 0;

  return (
    <div className="adash-page">

      {/* Header */}
      <div className="adash-header">
        <div className="adash-header-left">
          <p className="adash-eyebrow">Panel de control</p>
          <h1 className="adash-title">Biblioteca <span className="adash-title-accent">WEB</span></h1>
          <p className="adash-sub">Resumen general del sistema bibliotecario</p>
        </div>
        <div className="adash-clock">
          <div className="adash-clock-time">{horaStr}</div>
          <div className="adash-clock-date">{fecha}</div>
        </div>
      </div>

      {/* Alerta si hay vencidos o multas */}
      {stats && (stats.prestamos_vencidos > 0 || stats.multas_activas > 0) && (
        <div className="adash-alerta">
          <span className="adash-alerta-dot" />
          <span>
            Hay <strong>{stats.prestamos_vencidos}</strong> préstamo(s) vencido(s)
            y <strong>{stats.multas_activas}</strong> multa(s) activa(s) que requieren atención.
          </span>
        </div>
      )}

      {loading ? (
        <div className="adash-loading">
          <div className="adash-spinner" />
          <p>Cargando estadísticas…</p>
        </div>
      ) : (
        <>
          {/* Grid de tarjetas */}
          <div className="adash-grid">
            {cards.map((c, i) => (
              <StatCard key={c.label} {...c} delay={i * 80} />
            ))}
          </div>

          {/* Barra de resumen de actividad */}
          {stats && total > 0 && (
            <div className="adash-resumen">
              <div className="adash-resumen-header">
                <span className="adash-resumen-title">Distribución de actividad</span>
                <span className="adash-resumen-total">{total} operaciones activas</span>
              </div>
              <div className="adash-resumen-bar">
                {stats.prestamos_activos > 0 && (
                  <div
                    className="adash-bar-seg seg-green"
                    style={{ width: `${(stats.prestamos_activos / total) * 100}%` }}
                    title={`Préstamos activos: ${stats.prestamos_activos}`}
                  />
                )}
                {stats.prestamos_vencidos > 0 && (
                  <div
                    className="adash-bar-seg seg-red"
                    style={{ width: `${(stats.prestamos_vencidos / total) * 100}%` }}
                    title={`Préstamos vencidos: ${stats.prestamos_vencidos}`}
                  />
                )}
                {stats.apartados_activos > 0 && (
                  <div
                    className="adash-bar-seg seg-yellow"
                    style={{ width: `${(stats.apartados_activos / total) * 100}%` }}
                    title={`Apartados activos: ${stats.apartados_activos}`}
                  />
                )}
              </div>
              <div className="adash-resumen-leyenda">
                <span className="adash-ley-item"><i className="adash-ley-dot dot-green" />Préstamos activos ({stats.prestamos_activos})</span>
                <span className="adash-ley-item"><i className="adash-ley-dot dot-red" />Vencidos ({stats.prestamos_vencidos})</span>
                <span className="adash-ley-item"><i className="adash-ley-dot dot-yellow" />Apartados ({stats.apartados_activos})</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}