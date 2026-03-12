// src/components/layout/Layout.tsx
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  const navigate = useNavigate();
  const usuario  = JSON.parse(localStorage.getItem("usuario") || "null");

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  return (
    <div>
      <Navbar usuario={usuario} onCerrarSesion={cerrarSesion} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}