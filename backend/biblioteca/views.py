from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from datetime import datetime, timedelta
import jwt

from .models import Libro, Categoria
from .serializers import (
    RegistroSerializer, LoginSerializer, UsuarioSerializer,
    LibroSerializer, CategoriaSerializer
)


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
                'usuario_id':  usuario.usuario_id,
                'usuario_rol': usuario.usuario_rol,
                'exp': datetime.utcnow() + timedelta(hours=8),
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            return Response({
                'token':   token,
                'usuario': UsuarioSerializer(usuario).data
            })
        return Response(serializer.errors, status=400)


# Sin verificación de token por ahora
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

        serializer = LibroSerializer(libros, many=True)
        return Response(serializer.data)


class CategoriasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categorias = Categoria.objects.all()
        serializer = CategoriaSerializer(categorias, many=True)
        return Response(serializer.data)


# ── Agregar al final de tu views.py existente ────────────────────────────────

from datetime import date, timedelta
from .models import Prestamo, Apartado, Multa, Libro   # agregar a tu import existente
from .serializers import (                              # agregar a tu import existente
    PrestamoSerializer, PrestamoCreateSerializer,
    ApartadoSerializer, ApartadoCreateSerializer,
    MultaSerializer,
)


# ── Helper: extrae el usuario del token JWT ya presente en tu proyecto ────────

def get_usuario(request):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        payload = jwt.decode(auth.split(' ')[1], settings.SECRET_KEY, algorithms=['HS256'])
        from .models import Usuario
        return Usuario.objects.get(usuario_id=payload['usuario_id'])
    except Exception:
        return None


# ── PRÉSTAMOS ─────────────────────────────────────────────────────────────────

class PrestamosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)
        prestamos = Prestamo.objects.filter(usuario=usuario).order_by('-prestamo_fecha_salida')
        return Response(PrestamoSerializer(prestamos, many=True).data)

    def post(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        # Bloquear si tiene multas pendientes
        if Multa.objects.filter(usuario=usuario, multa_estatus='Pendiente').exists():
            return Response({'error': 'Tienes multas pendientes. Págalas antes de solicitar un préstamo.'}, status=400)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        # Verificar ejemplares disponibles
        prestamos_activos = Prestamo.objects.filter(
            libro=libro, prestamo_estatus__in=['Activo', 'Vencido']
        ).count()
        if prestamos_activos >= libro.libro_ejemplares:
            return Response({'error': 'No hay ejemplares disponibles.'}, status=400)

        serializer = PrestamoCreateSerializer(data={
            'usuario':                       usuario.usuario_id,
            'libro':                         libro.libro_id,
            'prestamo_fecha_salida':         date.today(),
            'prestamo_fecha_entrega_esperada': date.today() + timedelta(days=14),
            'prestamo_estatus':              'Activo',
        })
        if serializer.is_valid():
            prestamo = serializer.save()
            # Marcar apartado activo de este usuario+libro como Convertido
            Apartado.objects.filter(
                usuario=usuario, libro=libro, apartado_estatus='Activo'
            ).update(apartado_estatus='Convertido')
            return Response(PrestamoSerializer(prestamo).data, status=201)
        return Response(serializer.errors, status=400)


class PrestamoDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, prestamo_id):
        """Devolver un libro."""
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        try:
            prestamo = Prestamo.objects.get(prestamo_id=prestamo_id, usuario=usuario)
        except Prestamo.DoesNotExist:
            return Response({'error': 'Préstamo no encontrado'}, status=404)

        if prestamo.prestamo_estatus == 'Devuelto':
            return Response({'error': 'Este préstamo ya fue devuelto'}, status=400)

        hoy = date.today()
        prestamo.prestamo_fecha_devolucion_real = hoy
        prestamo.prestamo_estatus = 'Devuelto'
        prestamo.save()

        # Generar multa si entregó tarde
        if hoy > prestamo.prestamo_fecha_entrega_esperada:
            dias = (hoy - prestamo.prestamo_fecha_entrega_esperada).days
            Multa.objects.create(
                usuario=usuario,
                prestamo=prestamo,
                multa_monto=dias * 5,
                multa_motivo=f'Devolución tardía: {dias} día(s) de retraso',
                multa_estatus='Pendiente',
            )

        return Response(PrestamoSerializer(prestamo).data)


# ── APARTADOS ─────────────────────────────────────────────────────────────────

class ApartadosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)
        apartados = Apartado.objects.filter(usuario=usuario).order_by('-apartado_fecha')
        return Response(ApartadoSerializer(apartados, many=True).data)

    def post(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        if Apartado.objects.filter(usuario=usuario, libro=libro, apartado_estatus='Activo').exists():
            return Response({'error': 'Ya tienes este libro apartado.'}, status=400)

        serializer = ApartadoCreateSerializer(data={
            'usuario':                   usuario.usuario_id,
            'libro':                     libro.libro_id,
            'apartado_fecha':            date.today(),
            'apartado_fecha_expiracion': date.today() + timedelta(days=3),
            'apartado_estatus':          'Activo',
        })
        if serializer.is_valid():
            apartado = serializer.save()
            return Response(ApartadoSerializer(apartado).data, status=201)
        return Response(serializer.errors, status=400)


class ApartadoDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, apartado_id):
        """Cancelar un apartado."""
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


# ── MULTAS ────────────────────────────────────────────────────────────────────

class MultasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)
        multas = Multa.objects.filter(usuario=usuario).order_by('-multa_id')
        return Response(MultaSerializer(multas, many=True).data)


class MultaDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, multa_id):
        """Marcar multa como pagada."""
        usuario = get_usuario(request)
        if not usuario:
            return Response({'error': 'No autorizado'}, status=401)

        try:
            multa = Multa.objects.get(multa_id=multa_id, usuario=usuario)
        except Multa.DoesNotExist:
            return Response({'error': 'Multa no encontrada'}, status=404)

        multa.multa_estatus = 'Pagada'
        multa.save()
        return Response(MultaSerializer(multa).data)