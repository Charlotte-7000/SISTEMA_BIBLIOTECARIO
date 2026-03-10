// Así se ve un libro que viene del backend
export interface Libro {
  libro_id: number
  libro_titulo: string
  libro_autor: string
  libro_isbn: string
  libro_ejemplares: number
  libro_descripcion: string
  categoria_id: number
  categoria_nombre: string
  editorial_id: number
  editorial_nombre: string
}

// Así se ve una categoría
export interface Categoria {
  categoria_id: number
  categoria_nombre: string
}