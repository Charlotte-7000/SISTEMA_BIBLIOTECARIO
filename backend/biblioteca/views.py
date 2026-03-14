from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from datetime import datetime, timedelta, date
import jwt

from .models import (
    Libro, Categoria, Editorial, Prestamo, Apartado, Multa, Usuario,
    DIAS_ESPERA_APARTADO, DIAS_RECOGIDA, DIAS_PRESTAMO_OPTS,
)
from .serializers import (
    RegistroSerializer, LoginSerializer,
    UsuarioSerializer, UsuarioAdminSerializer,
    LibroSerializer, CategoriaSerializer, EditorialSerializer,
    PrestamoSerializer, PrestamoCreateSerializer,
    ApartadoSerializer, ApartadoCreateSerializer, ApartadoUpdateSerializer,
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


def get_admin(request):
    usuario = get_usuario(request)
    if usuario and usuario.usuario_rol == 'admin':
        return usuario
    return None


def actualizar_estados_usuario(usuario):
    hoy = date.today()

    Prestamo.objects.filter(
        usuario=usuario,
        prestamo_estatus='Activo',
        prestamo_fecha_entrega_esperada__lt=hoy
    ).update(prestamo_estatus='Vencido')

    Apartado.objects.filter(
        usuario=usuario,
        apartado_estatus='Pendiente',
        apartado_fecha_expiracion__lt=hoy
    ).update(apartado_estatus='Cancelado')

    asignados_vencidos = Apartado.objects.filter(
        usuario=usuario,
        apartado_estatus='Asignado',
        apartado_fecha_limite_recogida__lt=hoy
    )
    for apartado in asignados_vencidos:
        apartado.apartado_estatus = 'Cancelado'
        apartado.save()
        libro = apartado.libro
        libro.libro_ejemplares += 1
        libro.save()
        _asignar_siguiente_apartado(libro)

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


def _asignar_siguiente_apartado(libro):
    if libro.libro_ejemplares <= 0:
        return
    siguiente = Apartado.objects.filter(
        libro=libro,
        apartado_estatus='Pendiente'
    ).order_by('apartado_fecha').first()

    if siguiente:
        hoy = date.today()
        siguiente.apartado_fecha_asignacion      = hoy
        siguiente.apartado_fecha_limite_recogida = hoy + timedelta(days=DIAS_RECOGIDA)
        siguiente.apartado_estatus               = 'Asignado'
        siguiente.save()
        libro.libro_ejemplares -= 1
        libro.save()


def usuario_bloqueado(usuario):
    if usuario.usuario_bloqueado_hasta and usuario.usuario_bloqueado_hasta >= date.today():
        return (usuario.usuario_bloqueado_hasta - date.today()).days
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
                'usuario': UsuarioSerializer(usuario).data,
            })
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# Libros y Categorías (públicos)
# ─────────────────────────────────────────

class LibrosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        busqueda  = request.query_params.get('busqueda', '')
        categoria = request.query_params.get('categoria', '')
        libros    = Libro.objects.all()
        if busqueda:
            libros = libros.filter(libro_titulo__icontains=busqueda) | \
                     libros.filter(libro_autor__icontains=busqueda)
        if categoria:
            libros = libros.filter(categoria__categoria_id=categoria)
        return Response(LibroSerializer(libros, many=True).data)


class CategoriasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(CategoriaSerializer(Categoria.objects.all(), many=True).data)


# ─────────────────────────────────────────
# Préstamos (usuario)
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

        dias = usuario_bloqueado(usuario)
        if dias is not None:
            return Response({'error': f'Tu cuenta está bloqueada por {dias} día(s) más.'}, status=400)

        if Prestamo.objects.filter(usuario=usuario, prestamo_estatus='Activo').count() >= 3:
            return Response({'error': 'Has alcanzado el límite de 3 préstamos activos.'}, status=400)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        if Prestamo.objects.filter(usuario=usuario, libro=libro, prestamo_estatus='Activo').exists():
            return Response({'error': 'Ya tienes este libro en préstamo.'}, status=400)

        if libro.libro_ejemplares <= 0:
            return Response({'error': 'No hay ejemplares disponibles.'}, status=400)

        dias_plazo = int(request.data.get('dias_plazo', 7))
        if dias_plazo not in DIAS_PRESTAMO_OPTS:
            return Response({'error': 'Los días de préstamo deben ser 3, 5 o 7.'}, status=400)

        hoy = date.today()
        serializer = PrestamoCreateSerializer(data={
            'usuario':                         usuario.usuario_id,
            'libro':                           libro.libro_id,
            'prestamo_fecha_salida':           hoy,
            'prestamo_fecha_entrega_esperada': hoy + timedelta(days=dias_plazo),
            'prestamo_estatus':                'Activo',
            'prestamo_dias_plazo':             dias_plazo,
        })
        if serializer.is_valid():
            libro.libro_ejemplares -= 1
            libro.save()
            prestamo = serializer.save()
            Apartado.objects.filter(
                usuario=usuario, libro=libro, apartado_estatus='Asignado'
            ).update(apartado_estatus='Convertido')
            return Response(PrestamoSerializer(prestamo).data, status=201)
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# Apartados (usuario)
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

        dias = usuario_bloqueado(usuario)
        if dias is not None:
            return Response({'error': f'Tu cuenta está bloqueada por {dias} día(s) más.'}, status=400)

        # ── Límite de 3 apartados activos ──
        if Apartado.objects.filter(
            usuario=usuario,
            apartado_estatus__in=['Pendiente', 'Asignado']
        ).count() >= 3:
            return Response({'error': 'Has alcanzado el límite de 3 apartados activos.'}, status=400)

        libro_id = request.data.get('libro_id')
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)

        if Apartado.objects.filter(
            usuario=usuario, libro=libro,
            apartado_estatus__in=['Pendiente', 'Asignado']
        ).exists():
            return Response({'error': 'Ya tienes este libro apartado.'}, status=400)

        if Prestamo.objects.filter(usuario=usuario, libro=libro, prestamo_estatus='Activo').exists():
            return Response({'error': 'Ya tienes este libro en préstamo.'}, status=400)

        hoy = date.today()
        apartado = Apartado.objects.create(
            usuario=usuario,
            libro=libro,
            apartado_fecha=hoy,
            apartado_fecha_expiracion=hoy + timedelta(days=DIAS_ESPERA_APARTADO),
            apartado_estatus='Pendiente',
        )

        if libro.libro_ejemplares > 0:
            apartado.apartado_fecha_asignacion      = hoy
            apartado.apartado_fecha_limite_recogida = hoy + timedelta(days=DIAS_RECOGIDA)
            apartado.apartado_estatus               = 'Asignado'
            apartado.save()
            libro.libro_ejemplares -= 1
            libro.save()

        return Response(ApartadoSerializer(apartado).data, status=201)


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

        if apartado.apartado_estatus not in ['Pendiente', 'Asignado']:
            return Response({'error': 'Solo se pueden cancelar apartados activos.'}, status=400)

        if apartado.apartado_estatus == 'Asignado':
            libro = apartado.libro
            libro.libro_ejemplares += 1
            libro.save()
            _asignar_siguiente_apartado(libro)

        apartado.apartado_estatus = 'Cancelado'
        apartado.save()
        return Response(ApartadoSerializer(apartado).data)


# ─────────────────────────────────────────
# Multas (usuario)
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


# ─────────────────────────────────────────
# Admin — Dashboard
# ─────────────────────────────────────────

class AdminDashboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        return Response({
            'total_usuarios':     Usuario.objects.filter(usuario_rol='usuario').count(),
            'total_libros':       Libro.objects.count(),
            'prestamos_activos':  Prestamo.objects.filter(prestamo_estatus='Activo').count(),
            'prestamos_vencidos': Prestamo.objects.filter(prestamo_estatus='Vencido').count(),
            'apartados_activos':  Apartado.objects.filter(apartado_estatus__in=['Pendiente', 'Asignado']).count(),
            'multas_activas':     Multa.objects.filter(multa_estatus='Activa').count(),
        })


# ─────────────────────────────────────────
# Admin — Usuarios
# ─────────────────────────────────────────

class AdminUsuariosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        usuarios = Usuario.objects.filter(usuario_rol='usuario').order_by('usuario_aPaterno')
        return Response(UsuarioAdminSerializer(usuarios, many=True).data)

    def post(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        serializer = UsuarioAdminSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminUsuarioDetalleView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, usuario_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            usuario = Usuario.objects.get(usuario_id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        return Response(UsuarioAdminSerializer(usuario).data)

    def put(self, request, usuario_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            usuario = Usuario.objects.get(usuario_id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        serializer = UsuarioAdminSerializer(usuario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, usuario_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            usuario = Usuario.objects.get(usuario_id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        usuario.delete()
        return Response({'message': 'Usuario eliminado correctamente'}, status=200)


# ─────────────────────────────────────────
# Admin — Préstamos
# ─────────────────────────────────────────

class AdminPrestamosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        estatus  = request.query_params.get('estatus', '')
        busqueda = request.query_params.get('busqueda', '')
        prestamos = Prestamo.objects.all().order_by('-prestamo_fecha_salida')
        if estatus:
            prestamos = prestamos.filter(prestamo_estatus=estatus)
        if busqueda:
            prestamos = prestamos.filter(
                usuario__matricula_id__icontains=busqueda
            ) | prestamos.filter(
                usuario__usuario_aPaterno__icontains=busqueda
            ) | prestamos.filter(
                libro__libro_titulo__icontains=busqueda
            )
        return Response(PrestamoSerializer(prestamos, many=True).data)

    def post(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)

        matricula  = request.data.get('matricula_id')
        libro_id   = request.data.get('libro_id')
        dias_plazo = int(request.data.get('dias_plazo', 7))

        try:
            usuario = Usuario.objects.get(matricula_id=matricula)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado con esa matrícula.'}, status=404)
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado.'}, status=404)

        if dias_plazo not in DIAS_PRESTAMO_OPTS:
            return Response({'error': 'Los días de préstamo deben ser 3, 5 o 7.'}, status=400)

        actualizar_estados_usuario(usuario)

        dias = usuario_bloqueado(usuario)
        if dias is not None:
            return Response({'error': f'El usuario está bloqueado por {dias} día(s) más.'}, status=400)
        if Prestamo.objects.filter(usuario=usuario, prestamo_estatus='Activo').count() >= 3:
            return Response({'error': 'El usuario ya tiene 3 préstamos activos.'}, status=400)
        if Prestamo.objects.filter(usuario=usuario, libro=libro, prestamo_estatus='Activo').exists():
            return Response({'error': 'El usuario ya tiene este libro en préstamo.'}, status=400)
        if libro.libro_ejemplares <= 0:
            return Response({'error': 'No hay ejemplares disponibles.'}, status=400)

        hoy = date.today()
        serializer = PrestamoCreateSerializer(data={
            'usuario':                         usuario.usuario_id,
            'libro':                           libro.libro_id,
            'prestamo_fecha_salida':           hoy,
            'prestamo_fecha_entrega_esperada': hoy + timedelta(days=dias_plazo),
            'prestamo_estatus':                'Activo',
            'prestamo_dias_plazo':             dias_plazo,
        })
        if serializer.is_valid():
            libro.libro_ejemplares -= 1
            libro.save()
            prestamo = serializer.save()
            Apartado.objects.filter(
                usuario=usuario, libro=libro, apartado_estatus='Asignado'
            ).update(apartado_estatus='Convertido')
            return Response(PrestamoSerializer(prestamo).data, status=201)
        return Response(serializer.errors, status=400)


class AdminPrestamoDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, prestamo_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            prestamo = Prestamo.objects.get(prestamo_id=prestamo_id)
        except Prestamo.DoesNotExist:
            return Response({'error': 'Préstamo no encontrado'}, status=404)
        if prestamo.prestamo_estatus == 'Devuelto':
            return Response({'error': 'Este préstamo ya fue devuelto.'}, status=400)

        hoy = date.today()
        prestamo.prestamo_fecha_devolucion_real = hoy
        prestamo.prestamo_estatus = 'Devuelto'
        prestamo.save()

        libro = prestamo.libro
        libro.libro_ejemplares += 1
        libro.save()

        # ── Convertir apartado Asignado del usuario que devuelve ──
        Apartado.objects.filter(
            usuario=prestamo.usuario,
            libro=libro,
            apartado_estatus='Asignado'
        ).update(apartado_estatus='Convertido')

        _asignar_siguiente_apartado(libro)

        if hoy > prestamo.prestamo_fecha_entrega_esperada:
            dias_retraso      = (hoy - prestamo.prestamo_fecha_entrega_esperada).days
            fecha_fin_bloqueo = hoy + timedelta(days=dias_retraso)

            Multa.objects.create(
                prestamo=prestamo,
                usuario=prestamo.usuario,
                multa_dias_bloqueo=dias_retraso,
                multa_motivo=f'Retraso de {dias_retraso} día(s) en la devolución.',
                multa_fecha_inicio=hoy,
                multa_fecha_fin=fecha_fin_bloqueo,
                multa_estatus='Activa',
            )

            usuario = prestamo.usuario
            if usuario.usuario_bloqueado_hasta and usuario.usuario_bloqueado_hasta >= hoy:
                usuario.usuario_bloqueado_hasta += timedelta(days=dias_retraso)
            else:
                usuario.usuario_bloqueado_hasta = fecha_fin_bloqueo
            usuario.save()

            return Response({
                'message':      f'Devolución registrada. Multa: {dias_retraso} día(s) de bloqueo.',
                'dias_retraso': dias_retraso,
                'prestamo':     PrestamoSerializer(prestamo).data,
            })

        return Response({
            'message':  'Devolución registrada correctamente.',
            'prestamo': PrestamoSerializer(prestamo).data,
        })


# ─────────────────────────────────────────
# Admin — Apartados
# ─────────────────────────────────────────

class AdminApartadosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        estatus  = request.query_params.get('estatus', '')
        busqueda = request.query_params.get('busqueda', '')
        apartados = Apartado.objects.all().order_by('-apartado_fecha')
        if estatus:
            apartados = apartados.filter(apartado_estatus=estatus)
        if busqueda:
            apartados = apartados.filter(
                usuario__matricula_id__icontains=busqueda
            ) | apartados.filter(
                usuario__usuario_aPaterno__icontains=busqueda
            ) | apartados.filter(
                libro__libro_titulo__icontains=busqueda
            )
        return Response(ApartadoSerializer(apartados, many=True).data)


class AdminApartadoDetalleView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, apartado_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            apartado = Apartado.objects.get(apartado_id=apartado_id)
        except Apartado.DoesNotExist:
            return Response({'error': 'Apartado no encontrado'}, status=404)

        if apartado.apartado_estatus not in ['Pendiente', 'Asignado']:
            return Response({'error': 'Solo se pueden cancelar apartados activos.'}, status=400)

        if apartado.apartado_estatus == 'Asignado':
            libro = apartado.libro
            libro.libro_ejemplares += 1
            libro.save()
            _asignar_siguiente_apartado(libro)

        apartado.apartado_estatus = 'Cancelado'
        apartado.save()
        return Response(ApartadoSerializer(apartado).data)


# ─────────────────────────────────────────
# Admin — Libros
# ─────────────────────────────────────────

class AdminLibrosView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        busqueda  = request.query_params.get('busqueda', '')
        categoria = request.query_params.get('categoria', '')
        libros    = Libro.objects.all().order_by('libro_titulo')
        if busqueda:
            libros = libros.filter(libro_titulo__icontains=busqueda) | \
                     libros.filter(libro_autor__icontains=busqueda)
        if categoria:
            libros = libros.filter(categoria__categoria_id=categoria)
        return Response(LibroSerializer(libros, many=True).data)

    def post(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        serializer = LibroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminLibroDetalleView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, libro_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)
        serializer = LibroSerializer(libro, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, libro_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            libro = Libro.objects.get(libro_id=libro_id)
        except Libro.DoesNotExist:
            return Response({'error': 'Libro no encontrado'}, status=404)
        libro.delete()
        return Response({'message': 'Libro eliminado correctamente'})


# ─────────────────────────────────────────
# Admin — Categorías
# ─────────────────────────────────────────

class AdminCategoriasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        return Response(CategoriaSerializer(Categoria.objects.all().order_by('categoria_nombre'), many=True).data)

    def post(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        serializer = CategoriaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminCategoriaDetalleView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, categoria_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            categoria = Categoria.objects.get(categoria_id=categoria_id)
        except Categoria.DoesNotExist:
            return Response({'error': 'Categoría no encontrada'}, status=404)
        serializer = CategoriaSerializer(categoria, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, categoria_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            categoria = Categoria.objects.get(categoria_id=categoria_id)
        except Categoria.DoesNotExist:
            return Response({'error': 'Categoría no encontrada'}, status=404)
        categoria.delete()
        return Response({'message': 'Categoría eliminada correctamente'})


# ─────────────────────────────────────────
# Admin — Editoriales
# ─────────────────────────────────────────

class AdminEditorialesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        return Response(EditorialSerializer(Editorial.objects.all().order_by('editorial_nombre'), many=True).data)

    def post(self, request):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        serializer = EditorialSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AdminEditorialDetalleView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, editorial_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            editorial = Editorial.objects.get(editorial_id=editorial_id)
        except Editorial.DoesNotExist:
            return Response({'error': 'Editorial no encontrada'}, status=404)
        serializer = EditorialSerializer(editorial, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, editorial_id):
        if not get_admin(request):
            return Response({'error': 'No autorizado'}, status=403)
        try:
            editorial = Editorial.objects.get(editorial_id=editorial_id)
        except Editorial.DoesNotExist:
            return Response({'error': 'Editorial no encontrada'}, status=404)
        editorial.delete()
        return Response({'message': 'Editorial eliminada correctamente'})