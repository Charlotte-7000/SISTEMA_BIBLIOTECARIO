

from django.urls import path
from .views import (
    RegistroView, LoginView, LibrosView, CategoriasView,   
    PrestamosView, PrestamoDetalleView,                     
    ApartadosView, ApartadoDetalleView,                     
    MultasView, MultaDetalleView,                          
)

urlpatterns = [
 
    path('registro/',   RegistroView.as_view()),
    path('login/',      LoginView.as_view()),
    path('libros/',     LibrosView.as_view()),
    path('categorias/', CategoriasView.as_view()),

    # ── Préstamos ────────────────────────────────
    path('prestamos/',                  PrestamosView.as_view()),
    path('prestamos/<int:prestamo_id>/', PrestamoDetalleView.as_view()),

    # ── Apartados ────────────────────────────────
    path('apartados/',                   ApartadosView.as_view()),
    path('apartados/<int:apartado_id>/', ApartadoDetalleView.as_view()),

    # ── Multas ───────────────────────────────────
    path('multas/',                MultasView.as_view()),
    path('multas/<int:multa_id>/', MultaDetalleView.as_view()),
]