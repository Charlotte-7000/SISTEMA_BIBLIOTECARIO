import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Libros from './pages/Libros';
import Prestamos from './pages/Prestamos';
import Apartados from './pages/Apartados';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminLibros from './pages/admin/AdminLibros';
import AdminPrestamos from './pages/admin/AdminPrestamos';
import AdminApartados from './pages/admin/AdminApartados';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function RutaAdmin({ children }: { children: React.ReactNode }) {
  const token   = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  if (!token) return <Navigate to="/login" />;
  if (!usuario || usuario.usuario_rol !== 'admin') return <Navigate to="/home" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        <Route element={<Layout />}>
          <Route path="/home"      element={<Home />} />
          <Route path="/libros"    element={<Libros />} />
          <Route path="/prestamos" element={<RutaProtegida><Prestamos /></RutaProtegida>} />
          <Route path="/apartados" element={<RutaProtegida><Apartados /></RutaProtegida>} />
        </Route>

        <Route path="/admin" element={<RutaAdmin><AdminLayout /></RutaAdmin>}>
          <Route index            element={<AdminDashboard />} />
          <Route path="usuarios"  element={<AdminUsuarios />} />
          <Route path="libros"    element={<AdminLibros />} />
          <Route path="prestamos" element={<AdminPrestamos />} />
          <Route path="apartados" element={<AdminApartados />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}