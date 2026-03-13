// src/pages/admin/AdminLibros.tsx
import { useEffect, useState } from 'react';
import './AdminLibros.css';

const API = 'http://localhost:8000/api';

interface Libro {
  libro_id:         number;
  libro_titulo:     string;
  libro_autor:      string;
  libro_isbn:       string;
  libro_ejemplares: number;
  libro_descripcion:string;
  categoria_id:     number | null;
  categoria_nombre: string;
  editorial_id:     number | null;
  editorial_nombre: string;
}

interface Categoria { categoria_id: number; categoria_nombre: string; }
interface Editorial  { editorial_id: number; editorial_nombre: string; }

interface FormLibro {
  libro_titulo:     string;
  libro_autor:      string;
  libro_isbn:       string;
  libro_ejemplares: number;
  libro_descripcion:string;
  categoria:        string;
  editorial:        string;
}

const FORM_VACIO: FormLibro = {
  libro_titulo: '', libro_autor: '', libro_isbn: '',
  libro_ejemplares: 1, libro_descripcion: '',
  categoria: '', editorial: '',
};

type Modal =
  | { tipo: 'crear' }
  | { tipo: 'editar'; libro: Libro }
  | { tipo: 'eliminar'; libro: Libro };

type TabCatalogo = 'libros' | 'categorias' | 'editoriales';

export default function AdminLibros() {
  const [libros,      setLibros]      = useState<Libro[]>([]);
  const [categorias,  setCategorias]  = useState<Categoria[]>([]);
  const [editoriales, setEditoriales] = useState<Editorial[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [busqueda,    setBusqueda]    = useState('');
  const [tab,         setTab]         = useState<TabCatalogo>('libros');
  const [modal,       setModal]       = useState<Modal | null>(null);
  const [form,        setForm]        = useState<FormLibro>(FORM_VACIO);
  const [msg,         setMsg]         = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [guardando,   setGuardando]   = useState(false);

  // Para categorías y editoriales inline
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoId,  setEditandoId]  = useState<number | null>(null);
  const [editNombre,  setEditNombre]  = useState('');

  const token   = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const cargar = async () => {
    setLoading(true);
    try {
      const [l, c, e] = await Promise.all([
        fetch(`${API}/admin/libros/`,      { headers }).then(r => r.json()),
        fetch(`${API}/admin/categorias/`,  { headers }).then(r => r.json()),
        fetch(`${API}/admin/editoriales/`, { headers }).then(r => r.json()),
      ]);
      setLibros(l); setCategorias(c); setEditoriales(e);
    } catch { mostrar('err', 'Error al cargar datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const mostrar = (tipo: 'ok' | 'err', texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 4000);
  };

  const abrirCrear = () => { setForm(FORM_VACIO); setModal({ tipo: 'crear' }); };

  const abrirEditar = (l: Libro) => {
    setForm({
      libro_titulo: l.libro_titulo, libro_autor: l.libro_autor,
      libro_isbn: l.libro_isbn, libro_ejemplares: l.libro_ejemplares,
      libro_descripcion: l.libro_descripcion,
      categoria: l.categoria_id ? String(l.categoria_id) : '',
      editorial: l.editorial_id ? String(l.editorial_id) : '',
    });
    setModal({ tipo: 'editar', libro: l });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const body = {
        libro_titulo:     form.libro_titulo,
        libro_autor:      form.libro_autor,
        libro_isbn:       form.libro_isbn,
        libro_ejemplares: form.libro_ejemplares,
        libro_descripcion:form.libro_descripcion,
        categoria:        form.categoria ? Number(form.categoria) : null,
        editorial:        form.editorial ? Number(form.editorial) : null,
      };

      if (modal?.tipo === 'crear') {
        const r = await fetch(`${API}/admin/libros/`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Libro creado correctamente');
      } else if (modal?.tipo === 'editar') {
        const r = await fetch(`${API}/admin/libros/${modal.libro.libro_id}/`, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!r.ok) { const d = await r.json(); throw new Error(Object.values(d)[0] as string); }
        mostrar('ok', 'Libro actualizado correctamente');
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
      await fetch(`${API}/admin/libros/${modal.libro.libro_id}/`, { method: 'DELETE', headers });
      mostrar('ok', 'Libro eliminado correctamente');
      setModal(null); cargar();
    } catch { mostrar('err', 'Error al eliminar libro'); }
    finally { setGuardando(false); }
  };

  // Categorías CRUD inline
  const crearCategoria = async () => {
    if (!nuevoNombre.trim()) return;
    try {
      await fetch(`${API}/admin/categorias/`, { method: 'POST', headers, body: JSON.stringify({ categoria_nombre: nuevoNombre }) });
      setNuevoNombre(''); cargar(); mostrar('ok', 'Categoría creada');
    } catch { mostrar('err', 'Error al crear categoría'); }
  };

  const editarCategoria = async (id: number) => {
    try {
      await fetch(`${API}/admin/categorias/${id}/`, { method: 'PUT', headers, body: JSON.stringify({ categoria_nombre: editNombre }) });
      setEditandoId(null); cargar(); mostrar('ok', 'Categoría actualizada');
    } catch { mostrar('err', 'Error al editar categoría'); }
  };

  const eliminarCategoria = async (id: number) => {
    try {
      await fetch(`${API}/admin/categorias/${id}/`, { method: 'DELETE', headers });
      cargar(); mostrar('ok', 'Categoría eliminada');
    } catch { mostrar('err', 'Error al eliminar categoría'); }
  };

  // Editoriales CRUD inline
  const crearEditorial = async () => {
    if (!nuevoNombre.trim()) return;
    try {
      await fetch(`${API}/admin/editoriales/`, { method: 'POST', headers, body: JSON.stringify({ editorial_nombre: nuevoNombre }) });
      setNuevoNombre(''); cargar(); mostrar('ok', 'Editorial creada');
    } catch { mostrar('err', 'Error al crear editorial'); }
  };

  const editarEditorial = async (id: number) => {
    try {
      await fetch(`${API}/admin/editoriales/${id}/`, { method: 'PUT', headers, body: JSON.stringify({ editorial_nombre: editNombre }) });
      setEditandoId(null); cargar(); mostrar('ok', 'Editorial actualizada');
    } catch { mostrar('err', 'Error al editar editorial'); }
  };

  const eliminarEditorial = async (id: number) => {
    try {
      await fetch(`${API}/admin/editoriales/${id}/`, { method: 'DELETE', headers });
      cargar(); mostrar('ok', 'Editorial eliminada');
    } catch { mostrar('err', 'Error al eliminar editorial'); }
  };

  const filtrados = libros.filter(l =>
    `${l.libro_titulo} ${l.libro_autor} ${l.libro_isbn}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="alib-page">
      <div className="alib-header">
        <div>
          <h1 className="alib-title">Libros</h1>
          <p className="alib-sub">{libros.length} libro(s) en catálogo</p>
        </div>
        {tab === 'libros' && (
          <button className="alib-btn-nuevo" onClick={abrirCrear}>+ Nuevo libro</button>
        )}
      </div>

      {msg && <div className={`alib-notif ${msg.tipo}`}>{msg.texto}</div>}

      {/* Tabs */}
      <div className="alib-tabs">
        {(['libros', 'categorias', 'editoriales'] as TabCatalogo[]).map(t => (
          <button
            key={t}
            className={`alib-tab ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); setNuevoNombre(''); setEditandoId(null); }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="alib-loading"><div className="alib-spinner" /><p>Cargando…</p></div>
      ) : (
        <>
          {/* ── Tab Libros ── */}
          {tab === 'libros' && (
            <>
              <div className="alib-filtros">
                <input
                  className="alib-search"
                  placeholder="Buscar por título, autor o ISBN…"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                <span className="alib-count">{filtrados.length} resultado(s)</span>
              </div>

              {filtrados.length === 0 ? (
                <div className="alib-empty"><p>No se encontraron libros.</p></div>
              ) : (
                <div className="alib-tabla-wrap">
                  <table className="alib-tabla">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Autor</th>
                        <th>ISBN</th>
                        <th>Ejemplares</th>
                        <th>Categoría</th>
                        <th>Editorial</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map(l => (
                        <tr key={l.libro_id}>
                          <td className="td-bold">{l.libro_titulo}</td>
                          <td className="td-muted">{l.libro_autor}</td>
                          <td className="td-muted">{l.libro_isbn}</td>
                          <td>
                            <span className={`alib-ej ${l.libro_ejemplares === 0 ? 'cero' : ''}`}>
                              {l.libro_ejemplares}
                            </span>
                          </td>
                          <td className="td-muted">{l.categoria_nombre || '—'}</td>
                          <td className="td-muted">{l.editorial_nombre || '—'}</td>
                          <td>
                            <div className="alib-acciones">
                              <button className="alib-btn-edit" onClick={() => abrirEditar(l)}>Editar</button>
                              <button className="alib-btn-del"  onClick={() => setModal({ tipo: 'eliminar', libro: l })}>Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tab Categorías ── */}
          {tab === 'categorias' && (
            <div className="alib-lista-wrap">
              <div className="alib-nuevo-inline">
                <input
                  className="alib-search"
                  placeholder="Nueva categoría…"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && crearCategoria()}
                />
                <button className="alib-btn-nuevo" onClick={crearCategoria}>Agregar</button>
              </div>
              <div className="alib-lista">
                {categorias.map(c => (
                  <div key={c.categoria_id} className="alib-lista-item">
                    {editandoId === c.categoria_id ? (
                      <>
                        <input
                          className="alib-edit-input"
                          value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          autoFocus
                        />
                        <button className="alib-btn-save" onClick={() => editarCategoria(c.categoria_id)}>Guardar</button>
                        <button className="alib-btn-cancel-sm" onClick={() => setEditandoId(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className="alib-lista-nombre">{c.categoria_nombre}</span>
                        <div className="alib-acciones">
                          <button className="alib-btn-edit" onClick={() => { setEditandoId(c.categoria_id); setEditNombre(c.categoria_nombre); }}>Editar</button>
                          <button className="alib-btn-del"  onClick={() => eliminarCategoria(c.categoria_id)}>Eliminar</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab Editoriales ── */}
          {tab === 'editoriales' && (
            <div className="alib-lista-wrap">
              <div className="alib-nuevo-inline">
                <input
                  className="alib-search"
                  placeholder="Nueva editorial…"
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && crearEditorial()}
                />
                <button className="alib-btn-nuevo" onClick={crearEditorial}>Agregar</button>
              </div>
              <div className="alib-lista">
                {editoriales.map(e => (
                  <div key={e.editorial_id} className="alib-lista-item">
                    {editandoId === e.editorial_id ? (
                      <>
                        <input
                          className="alib-edit-input"
                          value={editNombre}
                          onChange={e2 => setEditNombre(e2.target.value)}
                          autoFocus
                        />
                        <button className="alib-btn-save" onClick={() => editarEditorial(e.editorial_id)}>Guardar</button>
                        <button className="alib-btn-cancel-sm" onClick={() => setEditandoId(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <span className="alib-lista-nombre">{e.editorial_nombre}</span>
                        <div className="alib-acciones">
                          <button className="alib-btn-edit" onClick={() => { setEditandoId(e.editorial_id); setEditNombre(e.editorial_nombre); }}>Editar</button>
                          <button className="alib-btn-del"  onClick={() => eliminarEditorial(e.editorial_id)}>Eliminar</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Crear / Editar */}
      {(modal?.tipo === 'crear' || modal?.tipo === 'editar') && (
        <div className="alib-backdrop" onClick={() => setModal(null)}>
          <div className="alib-modal" onClick={e => e.stopPropagation()}>
            <button className="alib-modal-x" onClick={() => setModal(null)}>✕</button>
            <h2 className="alib-modal-title">
              {modal.tipo === 'crear' ? 'Nuevo libro' : 'Editar libro'}
            </h2>

            <div className="alib-form-grid">
              <div className="alib-form-group alib-span2">
                <label>Título</label>
                <input value={form.libro_titulo} onChange={e => setForm({...form, libro_titulo: e.target.value})} placeholder="Título del libro" />
              </div>
              <div className="alib-form-group">
                <label>Autor</label>
                <input value={form.libro_autor} onChange={e => setForm({...form, libro_autor: e.target.value})} placeholder="Autor" />
              </div>
              <div className="alib-form-group">
                <label>ISBN</label>
                <input value={form.libro_isbn} onChange={e => setForm({...form, libro_isbn: e.target.value})} placeholder="ISBN" />
              </div>
              <div className="alib-form-group">
                <label>Ejemplares</label>
                <input type="number" min={0} value={form.libro_ejemplares} onChange={e => setForm({...form, libro_ejemplares: Number(e.target.value)})} />
              </div>
              <div className="alib-form-group">
                <label>Categoría</label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                  <option value="">Sin categoría</option>
                  {categorias.map(c => <option key={c.categoria_id} value={c.categoria_id}>{c.categoria_nombre}</option>)}
                </select>
              </div>
              <div className="alib-form-group">
                <label>Editorial</label>
                <select value={form.editorial} onChange={e => setForm({...form, editorial: e.target.value})}>
                  <option value="">Sin editorial</option>
                  {editoriales.map(e => <option key={e.editorial_id} value={e.editorial_id}>{e.editorial_nombre}</option>)}
                </select>
              </div>
              <div className="alib-form-group alib-span2">
                <label>Descripción</label>
                <textarea value={form.libro_descripcion} onChange={e => setForm({...form, libro_descripcion: e.target.value})} placeholder="Descripción del libro (opcional)" rows={3} />
              </div>
            </div>

            <div className="alib-modal-btns">
              <button className="alib-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : modal.tipo === 'crear' ? 'Crear libro' : 'Guardar cambios'}
              </button>
              <button className="alib-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {modal?.tipo === 'eliminar' && (
        <div className="alib-backdrop" onClick={() => setModal(null)}>
          <div className="alib-modal alib-modal-sm" onClick={e => e.stopPropagation()}>
            <button className="alib-modal-x" onClick={() => setModal(null)}>✕</button>
            <div className="alib-del-ico">🗑️</div>
            <h2 className="alib-modal-title">¿Eliminar libro?</h2>
            <p className="alib-del-txt">
              Se eliminará <strong>"{modal.libro.libro_titulo}"</strong> permanentemente.
            </p>
            <div className="alib-modal-btns">
              <button className="alib-btn-del-confirm" onClick={handleEliminar} disabled={guardando}>
                {guardando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button className="alib-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}