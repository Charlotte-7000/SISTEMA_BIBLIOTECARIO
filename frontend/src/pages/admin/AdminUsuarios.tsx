// src/pages/admin/AdminUsuarios.tsx
import { useEffect, useState } from 'react';
import './AdminUsuarios.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Usuario {
  usuario_id:             number;
  usuario_nombre:         string;
  usuario_aPaterno:       string;
  usuario_aMaterno:       string;
  matricula_id:           string;
  usuario_rol:            string;
  usuario_bloqueado_hasta: string | null;
  esta_bloqueado:         boolean;
  dias_bloqueo_restantes: number;
}

interface FormUsuario {
  usuario_nombre:   string;
  usuario_aPaterno: string;
  usuario_aMaterno: string;
  matricula_id:     string;
  usuario_password: string;
  usuario_rol:      string;
}

const FORM_VACIO: FormUsuario = {
  usuario_nombre:   '',
  usuario_aPaterno: '',
  usuario_aMaterno: '',
  matricula_id:     '',
  usuario_password: '',
  usuario_rol:      'usuario',
};

type Modal = 
  | { tipo: 'crear' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'eliminar'; usuario: Usuario };

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal,    setModal]    = useState<Modal | null>(null);
  const [form,     setForm]     = useState<FormUsuario>(FORM_VACIO);
  const [msg,      setMsg]      = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/usuarios/`, { headers });
      setUsuarios(await r.json());
    } catch { mostrar('err', 'Error al cargar usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setModal({ tipo: 'crear' });
  };

  const abrirEditar = (u: Usuario) => {
    setForm({
      usuario_nombre:   u.usuario_nombre,
      usuario_aPaterno: u.usuario_aPaterno,
      usuario_aMaterno: u.usuario_aMaterno,
      matricula_id:     u.matricula_id,
      usuario_password: '',
      usuario_rol:      u.usuario_rol,
    });
    setModal({ tipo: 'editar', usuario: u });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      if (modal?.tipo === 'crear') {
        const body: any = { ...form };
        const r = await fetch(`${API}/admin/usuarios/`, {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Usuario creado correctamente');
      } else if (modal?.tipo === 'editar') {
        const body: any = { ...form };
        if (!body.usuario_password) delete body.usuario_password;
        const r = await fetch(`${API}/admin/usuarios/${modal.usuario.usuario_id}/`, {
          method: 'PUT', headers, body: JSON.stringify(body),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Usuario actualizado correctamente');
      }
      setModal(null);
      cargar();
    } catch (e: any) { mostrar('err', e.message); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async () => {
    if (modal?.tipo !== 'eliminar') return;
    setGuardando(true);
    try {
      await fetch(`${API}/admin/usuarios/${modal.usuario.usuario_id}/`, {
        method: 'DELETE', headers,
      });
      mostrar('ok', 'Usuario eliminado correctamente');
      setModal(null);
      cargar();
    } catch { mostrar('err', 'Error al eliminar usuario'); }
    finally { setGuardando(false); }
  };

  const filtrados = usuarios.filter(u =>
    `${u.usuario_nombre} ${u.usuario_aPaterno} ${u.matricula_id}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  const fc = (f: string) =>
    new Date(f + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="ausu-page">
      <div className="ausu-header">
        <div>
          <h1 className="ausu-title">Usuarios</h1>
          <p className="ausu-sub">{usuarios.length} usuario(s) registrado(s)</p>
        </div>
        <button className="ausu-btn-nuevo" onClick={abrirCrear}>
          + Nuevo usuario
        </button>
      </div>

      {msg && <div className={`ausu-notif ${msg.tipo}`}>{msg.texto}</div>}

      {/* Buscador */}
      <div className="ausu-filtros">
        <input
          className="ausu-search"
          placeholder="Buscar por nombre o matrícula…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <span className="ausu-count">{filtrados.length} resultado(s)</span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="ausu-loading"><div className="ausu-spinner" /><p>Cargando…</p></div>
      ) : filtrados.length === 0 ? (
        <div className="ausu-empty">
          <p>No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="ausu-tabla-wrap">
          <table className="ausu-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Matrícula</th>
                <th>Rol</th>
                <th>Estatus</th>
                <th>Bloqueado hasta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => (
                <tr key={u.usuario_id}>
                  <td className="td-nombre">
                    <div className="ausu-avatar">{u.usuario_nombre[0]}</div>
                    <div>
                      <div className="td-bold">{u.usuario_nombre} {u.usuario_aPaterno} {u.usuario_aMaterno}</div>
                    </div>
                  </td>
                  <td className="td-muted">{u.matricula_id}</td>
                  <td>
                    <span className={`ausu-pill rol-${u.usuario_rol}`}>{u.usuario_rol}</span>
                  </td>
                  <td>
                    {u.esta_bloqueado
                      ? <span className="ausu-pill bloqueado">🔒 Bloqueado</span>
                      : <span className="ausu-pill activo">Activo</span>
                    }
                  </td>
                  <td className="td-muted">
                    {u.usuario_bloqueado_hasta ? fc(u.usuario_bloqueado_hasta) : '—'}
                  </td>
                  <td>
                    <div className="ausu-acciones">
                      <button className="ausu-btn-edit" onClick={() => abrirEditar(u)}>Editar</button>
                      <button className="ausu-btn-del"  onClick={() => setModal({ tipo: 'eliminar', usuario: u })}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {(modal?.tipo === 'crear' || modal?.tipo === 'editar') && (
        <div className="ausu-backdrop" onClick={() => setModal(null)}>
          <div className="ausu-modal" onClick={e => e.stopPropagation()}>
            <button className="ausu-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="ausu-modal-title">
              {modal.tipo === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}
            </h2>

            <div className="ausu-form-grid">
              <div className="ausu-form-group">
                <label>Nombre(s)</label>
                <input value={form.usuario_nombre} onChange={e => setForm({...form, usuario_nombre: e.target.value})} placeholder="Nombre" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Paterno</label>
                <input value={form.usuario_aPaterno} onChange={e => setForm({...form, usuario_aPaterno: e.target.value})} placeholder="Apellido Paterno" />
              </div>
              <div className="ausu-form-group">
                <label>Apellido Materno</label>
                <input value={form.usuario_aMaterno} onChange={e => setForm({...form, usuario_aMaterno: e.target.value})} placeholder="Apellido Materno" />
              </div>
              <div className="ausu-form-group">
                <label>Matrícula</label>
                <input value={form.matricula_id} onChange={e => setForm({...form, matricula_id: e.target.value})} placeholder="Matrícula" />
              </div>
              <div className="ausu-form-group">
                <label>{modal.tipo === 'editar' ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
                <input type="password" value={form.usuario_password} onChange={e => setForm({...form, usuario_password: e.target.value})} placeholder="••••••••" />
              </div>
              <div className="ausu-form-group">
                <label>Rol</label>
                <select value={form.usuario_rol} onChange={e => setForm({...form, usuario_rol: e.target.value})}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="ausu-modal-btns">
              <button className="ausu-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : modal.tipo === 'crear' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
              <button className="ausu-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modal?.tipo === 'eliminar' && (
        <div className="ausu-backdrop" onClick={() => setModal(null)}>
          <div className="ausu-modal ausu-modal-sm" onClick={e => e.stopPropagation()}>
            <button className="ausu-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="ausu-del-ico">🗑️</div>
            <h2 className="ausu-modal-title">¿Eliminar usuario?</h2>
            <p className="ausu-del-txt">
              Se eliminará a <strong>{modal.usuario.usuario_nombre} {modal.usuario.usuario_aPaterno}</strong> permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="ausu-modal-btns">
              <button className="ausu-btn-del-confirm" onClick={handleEliminar} disabled={guardando}>
                {guardando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button className="ausu-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}