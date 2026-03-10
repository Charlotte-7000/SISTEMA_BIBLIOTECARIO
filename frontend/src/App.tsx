import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Dashboard from "./pages/Dashboard";
import Libros from "./pages/Libros";
import Prestamos from "./pages/Prestamos";
import Apartados from "./pages/Apartados";
import Layout from "./components/layout/Layout";

function RutaProtegida({ children }: { children: React.ReactElement }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/"         element={<Home />} />
        <Route path="/home"     element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Rutas protegidas */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
          <Route path="/libros"    element={<RutaProtegida><Libros /></RutaProtegida>} />
          <Route path="/prestamos" element={<RutaProtegida><Prestamos /></RutaProtegida>} />
          <Route path="/apartados" element={<RutaProtegida><Apartados /></RutaProtegida>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}