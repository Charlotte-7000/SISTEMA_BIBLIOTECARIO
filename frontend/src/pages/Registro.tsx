import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registro.css";

// 1. Agregamos 'usuario_correo' a la interfaz para que TypeScript lo reconozca
interface FormRegistro {
  usuario_nombre: string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id: string;
  usuario_password: string;
  usuario_correo: string; // <-- Nuevo campo
  rol?: "alumno" | "maestro";
}

// Detecta el tipo de ID según su formato
const detectarTipo = (valor: string): "alumno" | "maestro" | null => {
  if (/^\d{1,3}$/.test(valor) && valor.length <= 3) return "maestro"; 
  if (/^\d{4}[A-Z]{1,}[A-Z0-9]*\d+$/.test(valor)) return "alumno";   
  return null;
};

export default function Registro() {
  const navigate = useNavigate();
  
  // 2. Inicializamos el estado con el campo de correo vacío
  const [form, setForm] = useState<FormRegistro>({
    usuario_nombre: "",
    usuario_aPaterno: "",
    usuario_aMaterno: "",
    matricula_id: "",
    usuario_password: "",
    usuario_correo: "", // <-- Nuevo campo
  });

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const tipo = detectarTipo(form.matricula_id);
    if (!tipo) {
      setError("El ID no tiene un formato válido. Matrícula: ej. 2024TIDSM020 | Núm. Trabajador: ej. 620");
      return;
    }

    setCargando(true);
    setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/registro/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, rol: tipo }), 
      });

      if (response.ok) {
        navigate("/login");
      } else {
        const data = await response.json();
        const primerError = Object.values(data)[0];
        setError(Array.isArray(primerError) ? (primerError[0] as string) : "Error al registrar.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const renderHintID = () => {
    if (!form.matricula_id) return null;
    const tipo = detectarTipo(form.matricula_id);
    if (tipo === "alumno") return <span className="id-hint id-hint--alumno">✓ Matrícula de alumno </span>;
    if (tipo === "maestro") return <span className="id-hint id-hint--maestro"> Núm. de trabajador </span>;
    return <span className="id-hint id-hint--invalido">Formato no reconocido</span>;
  };

  return (
    <div className="registro-page">
      <div className="registro-panel-img">
        <img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&q=80" alt="Biblioteca" />
        <div className="registro-panel-overlay" />
        <button className="registro-volver-btn" onClick={() => navigate("/")}> ← Volver al inicio </button>

        <div className="registro-panel-texto">
          <div className="registro-logo-wrap">
            <div className="registro-logo-icon">B</div>
            <span className="registro-logo-text">Biblioteca Web</span>
          </div>
          <h2 className="registro-panel-titulo">Únete a nuestra comunidad</h2>
          <p className="registro-panel-sub"> Crea tu cuenta y accede a títulos, préstamos y apartados en línea. </p>
        </div>
      </div>

      <div className="registro-panel-form">
        <div className="registro-form-wrap">
          <h1 className="registro-titulo">Crear cuenta</h1>
          <p className="registro-subtitulo">Llena los datos para registrarte</p>

          <form onSubmit={handleSubmit} className="registro-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre(s)</label>
                <input className="form-input" type="text" name="usuario_nombre" placeholder="Ej. Juan" value={form.usuario_nombre} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno</label>
                <input className="form-input" type="text" name="usuario_aPaterno" placeholder="Ej. Pérez" value={form.usuario_aPaterno} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-input" type="text" name="usuario_aMaterno" placeholder="Ej. García" value={form.usuario_aMaterno} onChange={handleChange} />
              </div>
              
              {/* CAMPO DE CORREO ELECTRÓNICO AGREGADO */}
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  className="form-input"
                  type="email"
                  name="usuario_correo"
                  placeholder="ejemplo@correo.com"
                  value={form.usuario_correo}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Matrícula / Núm. Trabajador</label>
              <input
                className={`form-input ${form.matricula_id ? (detectarTipo(form.matricula_id) === "alumno" ? "form-input--alumno" : detectarTipo(form.matricula_id) === "maestro" ? "form-input--maestro" : "form-input--invalido") : ""}`}
                type="text"
                name="matricula_id"
                placeholder="Ej. 2024TIDSM020 o 620"
                value={form.matricula_id}
                onChange={handleChange}
                required
              />
              {renderHintID()}
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input className="form-input" type="password" name="usuario_password" placeholder="••••••••" value={form.usuario_password} onChange={handleChange} required />
            </div>

            {error && <p className="registro-error">{error}</p>}

            <button type="submit" className="btn-registro" disabled={cargando}>
              {cargando ? "Registrando..." : "Crear cuenta"}
            </button>
          </form>

          <div className="registro-divider"><span>o</span></div>
          <p className="registro-volver"> ¿Ya tienes cuenta? <span className="registro-link" onClick={() => navigate("/login")}> Inicia sesión </span> </p>
        </div>
      </div>
    </div>
  );
}