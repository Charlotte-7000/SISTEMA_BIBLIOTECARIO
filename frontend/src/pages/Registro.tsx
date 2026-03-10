import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registro.css";

interface FormRegistro {
  usuario_nombre: string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id: string;
  usuario_password: string;
}

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormRegistro>({
    usuario_nombre: "",
    usuario_aPaterno: "",
    usuario_aMaterno: "",
    matricula_id: "",
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
      const response = await fetch("http://localhost:8000/api/registro/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        navigate("/login");
      } else {
        const data = await response.json();
        const primerError = Object.values(data)[0];
        setError(Array.isArray(primerError) ? primerError[0] as string : "Error al registrar.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="registro-page">
      <div className="registro-panel-img">
        <img
          src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80"
          alt="Biblioteca"
        />
        <div className="registro-panel-overlay" />
        <div className="registro-panel-texto">
          <div className="registro-logo-wrap">
            <div className="registro-logo-icon">B</div>
            <span className="registro-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="registro-panel-titulo">Únete a nuestra comunidad</h2>
          <p className="registro-panel-sub">
            Crea tu cuenta y accede a títulos, préstamos y apartados en línea.
          </p>
        </div>
      </div>

      <div className="registro-panel-form">
        <div className="registro-form-wrap">
          <div className="registro-logo-mobile">
            <div className="registro-logo-icon">B</div>
            <span className="registro-logo-text">Biblioteca Web</span>
          </div>

          <h1 className="registro-titulo">Crear cuenta</h1>
          <p className="registro-subtitulo">Llena los datos para registrarte</p>

          <form onSubmit={handleSubmit} className="registro-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre(s)</label>
                <input
                  className="form-input"
                  type="text"
                  name="usuario_nombre"
                  placeholder="Ej. Juan"
                  value={form.usuario_nombre}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno</label>
                <input
                  className="form-input"
                  type="text"
                  name="usuario_aPaterno"
                  placeholder="Ej. Pérez"
                  value={form.usuario_aPaterno}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input
                  className="form-input"
                  type="text"
                  name="usuario_aMaterno"
                  placeholder="Ej. García"
                  value={form.usuario_aMaterno}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">ID Institucional</label>
                <input
                  className="form-input"
                  type="text"
                  name="matricula_id"
                  placeholder="Ej. 202312345"
                  value={form.matricula_id}
                  onChange={handleChange}
                  required
                />
              </div>
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
              />
            </div>

            {error && <p className="registro-error">{error}</p>}

            <button type="submit" className="btn-registro" disabled={cargando}>
              {cargando ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          <div className="registro-divider"><span>o</span></div>

          <p className="registro-volver">
            ¿Ya tienes cuenta?{" "}
            <span className="registro-link" onClick={() => navigate("/login")}>
              Inicia sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}