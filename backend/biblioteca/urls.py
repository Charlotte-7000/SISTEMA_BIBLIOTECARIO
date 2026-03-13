from django.urls import path
from .views import (
    # Auth
    RegistroView, LoginView,

    # Público
    LibrosView, CategoriasView,

    # Usuario
    PrestamosView,
    ApartadosView, ApartadoDetalleView,
    MultasView,

    # Admin — Dashboard
    AdminDashboardView,

    # Admin — Usuarios
    AdminUsuariosView, AdminUsuarioDetalleView,

    # Admin — Préstamos
    AdminPrestamosView, AdminPrestamoDetalleView,

    # Admin — Apartados
    AdminApartadosView, AdminApartadoDetalleView,

    # Admin — Libros
    AdminLibrosView, AdminLibroDetalleView,

    # Admin — Categorías
    AdminCategoriasView, AdminCategoriaDetalleView,

    # Admin — Editoriales
    AdminEditorialesView, AdminEditorialDetalleView,
)

urlpatterns = [

    # ── Auth ──────────────────────────────────────────
    path('registro/', RegistroView.as_view()),
    path('login/',    LoginView.as_view()),

    # ── Público ───────────────────────────────────────
    path('libros/',     LibrosView.as_view()),
    path('categorias/', CategoriasView.as_view()),

    # ── Usuario ───────────────────────────────────────
    path('prestamos/',                   PrestamosView.as_view()),
    path('apartados/',                   ApartadosView.as_view()),
    path('apartados/<int:apartado_id>/', ApartadoDetalleView.as_view()),
    path('multas/',                      MultasView.as_view()),

    # ── Admin — Dashboard ─────────────────────────────
    path('admin/dashboard/', AdminDashboardView.as_view()),

    # ── Admin — Usuarios ──────────────────────────────
    path('admin/usuarios/',                  AdminUsuariosView.as_view()),
    path('admin/usuarios/<int:usuario_id>/', AdminUsuarioDetalleView.as_view()),

    # ── Admin — Préstamos ─────────────────────────────
    path('admin/prestamos/',                   AdminPrestamosView.as_view()),
    path('admin/prestamos/<int:prestamo_id>/', AdminPrestamoDetalleView.as_view()),

    # ── Admin — Apartados ─────────────────────────────
    path('admin/apartados/',                   AdminApartadosView.as_view()),
    path('admin/apartados/<int:apartado_id>/', AdminApartadoDetalleView.as_view()),

    # ── Admin — Libros ────────────────────────────────
    path('admin/libros/',                AdminLibrosView.as_view()),
    path('admin/libros/<int:libro_id>/', AdminLibroDetalleView.as_view()),

    # ── Admin — Categorías ────────────────────────────
    path('admin/categorias/',                      AdminCategoriasView.as_view()),
    path('admin/categorias/<int:categoria_id>/',   AdminCategoriaDetalleView.as_view()),

    # ── Admin — Editoriales ───────────────────────────
    path('admin/editoriales/',                     AdminEditorialesView.as_view()),
    path('admin/editoriales/<int:editorial_id>/',  AdminEditorialDetalleView.as_view()),
]