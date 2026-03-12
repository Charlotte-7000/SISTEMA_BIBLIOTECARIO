from django.urls import path
from .views import (
    RegistroView, LoginView, LibrosView, CategoriasView,
    PrestamosView,
    ApartadosView, ApartadoDetalleView,
    MultasView,
)

urlpatterns = [

    # ── Auth ─────────────────────────────────────
    path('registro/', RegistroView.as_view()),
    path('login/',    LoginView.as_view()),

    # ── Libros y Categorías ───────────────────────
    path('libros/',     LibrosView.as_view()),
    path('categorias/', CategoriasView.as_view()),

    # ── Préstamos ────────────────────────────────
    path('prestamos/', PrestamosView.as_view()),

    # ── Apartados ────────────────────────────────
    path('apartados/',                   ApartadosView.as_view()),
    path('apartados/<int:apartado_id>/', ApartadoDetalleView.as_view()),

    # ── Multas ───────────────────────────────────
    path('multas/', MultasView.as_view()),
]