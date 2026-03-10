import { Link } from "react-router-dom"

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <nav className="flex flex-col gap-3">
        <Link to="/">Dashboard</Link>
        <Link to="/libros">Libros</Link>
      </nav>
    </aside>
  )
}