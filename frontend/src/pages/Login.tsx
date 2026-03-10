import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

interface FormLogin {
  usuario_nombre_acceso: string;
  usuario_password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormLogin>({
    usuario_nombre_acceso: "",
    usuario_password: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const response = await fetch("http://localhost:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        navigate("/home");
      } else {
        setError("Usuario o contraseña incorrectos.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      {/* Panel izquierdo — imagen */}
      <div className="login-panel-img">
        <img
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80"
          alt="Biblioteca"
        />
        <div className="login-panel-overlay" />
        <div className="login-panel-texto">
          <div className="login-logo-wrap">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="login-panel-titulo">El conocimiento comienza aquí</h2>
          <p className="login-panel-sub">
            Accede a más títulos, solicita préstamos y aparta tus libros favoritos.
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-panel-form">
        <div className="login-form-wrap">
          {/* Logo móvil */}
          <div className="login-logo-mobile">
            <div className="login-logo-icon">B</div>
            <span className="login-logo-text">Biblioteca BUAP</span>
          </div>

          <h1 className="login-titulo">Iniciar sesión</h1>
          <p className="login-subtitulo">
            Ingresa con tu matrícula o nombre de usuario institucional
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Usuario / Matrícula</label>
              <input
                className="form-input"
                type="text"
                name="usuario_nombre_acceso"
                placeholder="Ej. 202312345"
                value={form.usuario_nombre_acceso}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                name="usuario_password"
                placeholder="••••••••"
                value={form.usuario_password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="btn-login"
              disabled={cargando}
            >
              {cargando ? "Verificando..." : "Entrar"}
            </button>
          </form>

          <div className="login-divider"><span>o</span></div>

          <p className="login-volver">
            ¿No tienes cuenta?{" "}
            <span className="login-link" onClick={() => navigate("/registro")}>
              Regístrate aquí
            </span>
          </p>

          <p className="login-nota">
            Si olvidaste tu contraseña, acércate a la ventanilla de atención o contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}