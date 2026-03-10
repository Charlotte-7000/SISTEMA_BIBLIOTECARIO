from django.urls import path
from .views import RegistroView, LoginView, LibrosView, CategoriasView

urlpatterns = [
    path('registro/',   RegistroView.as_view()),
    path('login/',      LoginView.as_view()),
    path('libros/',     LibrosView.as_view()),
    path('categorias/', CategoriasView.as_view()),
]