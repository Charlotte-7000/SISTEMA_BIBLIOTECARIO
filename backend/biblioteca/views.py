from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from datetime import datetime, timedelta, date
import jwt

from .models import Libro, Categoria, Prestamo, Apartado, Multa, Usuario
from .serializers import (
    RegistroSerializer, LoginSerializer, UsuarioSerializer,
    LibroSerializer, CategoriaSerializer,
    PrestamoSerializer, PrestamoCreateSerializer,
    ApartadoSerializer, ApartadoCreateSerializer,
    MultaSerializer,
)


# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────

def get_usuario(request):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        payload = jwt.decode(auth.split(' ')[1], settings.SECRET_KEY, algorithms=['HS256'])
        return Usuario.objects.get(usuario_id=payload['usuario_id'])
    except Exception:
        return None


def actualizar_estados_usuario(usuario):
    """Actualiza préstamos vencidos y apartados expirados del usuario."""
    hoy = date.today()

    # Marcar préstamos vencidos
    Prestamo.objects.filter(
        usuario=usuario,
        prestamo_estatus='Activo',
        prestamo_fecha_entrega_esperada__lt=hoy
    ).update(prestamo_estatus='Vencido')

    # Cancelar apartados expirados
    Apartado.objects.filter(
        usuario=usuario,
        apartado_estatus='Activo',
        apartado_fecha_expiracion__lt=hoy
    ).update(apartado_estatus='Cancelado')

    # Cumplir multas cuya fecha fin ya pasó
    multas_cumplidas = Multa.objects.filter(
        usuario=usuario,
        multa_estatus='Activa',
        multa_fecha_fin__lt=hoy
    )
    if multas_cumplidas.exists():
        multas_cumplidas.update(multa_estatus='Cumplida')
        if not Multa.objects.filter(usuario=usuario, multa_estatus='Activa').exists():
            usuario.usuario_bloqueado_hasta = None
            usuario.save()


def usuario_bloqueado(usuario):
    """Verifica si el usuario está bloqueado por multa."""
    if usuario.usuario_bloqueado_hasta and usuario.usuario_bloqueado_hasta >= date.today():
        dias = (usuario.usuario_bloqueado_hasta - date.today()).days
        return dias
    return None


# ─────────────────────────────────────────
# Auth
# ─────────────────────────────────────────

class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Usuario registrado correctamente'}, status=201)
        return Response(serializer.errors, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.validated_data['usuario']
            payload = {
                'usuario_id': usuario.usuario_id,
                'exp': datetime.utcnow() + timedelta(hours=8),
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            return Response({
                'token':   token,
                'usuario': UsuarioSerializer(usuario).data
            })
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# Libros y Categorías
# ─────────────────────────────────────────

class LibrosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        busqueda  = request.query_params.get('busqueda', '')
        categoria = request.query_params.get('categoria', '')

        libros = Libro.objects.all()

        if busqueda:
            libros = libros.filter(libro_titulo__icontains=busqueda) | \
                     libros.filter(libro_autor__icontains=busqueda)

        if categoria:
            libros = libros.filter(categoria__categoria_id=categoria)

        return Response(LibroSerializer(libros, many=True).data)


class CategoriasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categorias = Categoria.objects.all()
        return Response(CategoriaSerializer(categorias, many=True).data)


# ─────────────────────────────────────────
# Préstamos
# ─────────────────────────────────────────

class PrestamosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        actualizar_estados_usuario(usuario)

        prestamos = Prestamo.objects.filter(usuario=usuario).order_by('-prestamo_fecha_salida')
        return Response(PrestamoSerializer(prestamos, many=True).data)

    def post(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        actualizar_estados_usuario(usuario)

        # Verificar bloqueo por multa
        dias = usuario_bloqueado(usuario)
        if dias is not None:
            return Response({
                'error': f'Tu cuenta está bloqueada por {dias} día(s) más debido a una multa.'
            }, status=400)

        # Verificar límite de 3 préstamos activos
        if Prestamo.objects.filter(usuario=usuario, prestamo_estatus='Activo').count() >= 3:
            return Response({'error': 'Has alcanzado el límite de 3 préstamos activos.'}, status=400)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        # Verificar que no tenga ya ese libro en préstamo
        if Prestamo.objects.filter(usuario=usuario, libro=libro, prestamo_estatus='Activo').exists():
            return Response({'error': 'Ya tienes este libro en préstamo.'}, status=400)

        # Verificar ejemplares disponibles
        prestamos_activos_libro = Prestamo.objects.filter(
            libro=libro, prestamo_estatus__in=['Activo', 'Vencido']
        ).count()
        if prestamos_activos_libro >= libro.libro_ejemplares:
            return Response({'error': 'No hay ejemplares disponibles.'}, status=400)

        serializer = PrestamoCreateSerializer(data={
            'usuario':                         usuario.usuario_id,
            'libro':                           libro.libro_id,
            'prestamo_fecha_salida':           date.today(),
            'prestamo_fecha_entrega_esperada': date.today() + timedelta(days=14),
            'prestamo_estatus':                'Activo',
        })
        if serializer.is_valid():
            prestamo = serializer.save()
            Apartado.objects.filter(
                usuario=usuario, libro=libro, apartado_estatus='Activo'
            ).update(apartado_estatus='Convertido')
            return Response(PrestamoSerializer(prestamo).data, status=201)
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# Apartados
# ─────────────────────────────────────────

class ApartadosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        actualizar_estados_usuario(usuario)

        apartados = Apartado.objects.filter(usuario=usuario).order_by('-apartado_fecha')
        return Response(ApartadoSerializer(apartados, many=True).data)

    def post(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        actualizar_estados_usuario(usuario)

        # Verificar bloqueo por multa
        dias = usuario_bloqueado(usuario)
        if dias is not None:
            return Response({
                'error': f'Tu cuenta está bloqueada por {dias} día(s) más. No puedes hacer apartados.'
            }, status=400)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        # Verificar que no tenga ya ese libro apartado
        if Apartado.objects.filter(usuario=usuario, libro=libro, apartado_estatus='Activo').exists():
            return Response({'error': 'Ya tienes este libro apartado.'}, status=400)

        # Validar días de apartado
        dias_apartado = request.data.get('dias_apartado', 3)
        if dias_apartado not in [3, 5, 7]:
            return Response({'error': 'Los días de apartado deben ser 3, 5 o 7.'}, status=400)

        serializer = ApartadoCreateSerializer(data={
            'usuario':                   usuario.usuario_id,
            'libro':                     libro.libro_id,
            'apartado_fecha':            date.today(),
            'apartado_fecha_expiracion': date.today() + timedelta(days=dias_apartado),
            'apartado_estatus':          'Activo',
        })
        if serializer.is_valid():
            apartado = serializer.save()
            return Response(ApartadoSerializer(apartado).data, status=201)
        return Response(serializer.errors, status=400)


class ApartadoDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, apartado_id):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        try:
            apartado = Apartado.objects.get(apartado_id=apartado_id, usuario=usuario)
        except Apartado.DoesNotExist:
            return Response({'error': 'Apartado no encontrado'}, status=404)

        if apartado.apartado_estatus != 'Activo':
            return Response({'error': 'Solo se pueden cancelar apartados activos.'}, status=400)

        apartado.apartado_estatus = 'Cancelado'
        apartado.save()
        return Response(ApartadoSerializer(apartado).data)


# ─────────────────────────────────────────
# Multas
# ─────────────────────────────────────────

class MultasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        actualizar_estados_usuario(usuario)

        multas = Multa.objects.filter(usuario=usuario).order_by('-multa_id')
        return Response(MultaSerializer(multas, many=True).data)