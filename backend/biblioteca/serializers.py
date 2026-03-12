from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from datetime import date
from .models import Usuario, Libro, Categoria, Editorial, Prestamo, Apartado, Multa


class RegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Usuario
        fields = [
            'usuario_nombre', 'usuario_aPaterno', 'usuario_aMaterno',
            'matricula_id', 'usuario_password',
        ]
        extra_kwargs = {'usuario_password': {'write_only': True}}

    def create(self, validated_data):
        validated_data['usuario_password'] = make_password(validated_data['usuario_password'])
        return super().create(validated_data)


class LoginSerializer(serializers.Serializer):
    matricula_id     = serializers.CharField()
    usuario_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            usuario = Usuario.objects.get(matricula_id=data['matricula_id'])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Matrícula o contraseña incorrectos.")

        if not check_password(data['usuario_password'], usuario.usuario_password):
            raise serializers.ValidationError("Matrícula o contraseña incorrectos.")

        data['usuario'] = usuario
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    esta_bloqueado = serializers.SerializerMethodField()
    dias_bloqueo_restantes = serializers.SerializerMethodField()

    class Meta:
        model  = Usuario
        fields = [
            'usuario_id', 'usuario_nombre', 'usuario_aPaterno',
            'matricula_id', 'usuario_bloqueado_hasta',
            'esta_bloqueado', 'dias_bloqueo_restantes',
        ]

    def get_esta_bloqueado(self, obj):
        if obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today():
            return True
        return False

    def get_dias_bloqueo_restantes(self, obj):
        if obj.usuario_bloqueado_hasta and obj.usuario_bloqueado_hasta >= date.today():
            return (obj.usuario_bloqueado_hasta - date.today()).days
        return 0


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Categoria
        fields = ['categoria_id', 'categoria_nombre']


class LibroSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.categoria_nombre', read_only=True)
    editorial_nombre = serializers.CharField(source='editorial.editorial_nombre', read_only=True)

    class Meta:
        model  = Libro
        fields = [
            'libro_id', 'libro_titulo', 'libro_autor',
            'libro_isbn', 'libro_ejemplares', 'libro_descripcion',
            'categoria_id', 'categoria_nombre',
            'editorial_id', 'editorial_nombre',
        ]


class PrestamoSerializer(serializers.ModelSerializer):
    libro_titulo = serializers.CharField(source='libro.libro_titulo', read_only=True)
    libro_autor  = serializers.CharField(source='libro.libro_autor',  read_only=True)
    dias_retraso = serializers.SerializerMethodField()

    class Meta:
        model  = Prestamo
        fields = [
            'prestamo_id', 'libro_id', 'libro_titulo', 'libro_autor',
            'prestamo_fecha_salida', 'prestamo_fecha_entrega_esperada',
            'prestamo_fecha_devolucion_real', 'prestamo_estatus', 'dias_retraso',
        ]

    def get_dias_retraso(self, obj):
        if obj.prestamo_estatus != 'Devuelto':
            hoy = date.today()
            if hoy > obj.prestamo_fecha_entrega_esperada:
                return (hoy - obj.prestamo_fecha_entrega_esperada).days
        return 0


class PrestamoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Prestamo
        fields = [
            'usuario', 'libro',
            'prestamo_fecha_salida', 'prestamo_fecha_entrega_esperada',
            'prestamo_estatus',
        ]


class ApartadoSerializer(serializers.ModelSerializer):
    libro_titulo   = serializers.CharField(source='libro.libro_titulo', read_only=True)
    libro_autor    = serializers.CharField(source='libro.libro_autor',  read_only=True)
    dias_restantes = serializers.SerializerMethodField()

    class Meta:
        model  = Apartado
        fields = [
            'apartado_id', 'libro_id', 'libro_titulo', 'libro_autor',
            'apartado_fecha', 'apartado_fecha_expiracion',
            'apartado_estatus', 'dias_restantes',
        ]

    def get_dias_restantes(self, obj):
        if obj.apartado_estatus == 'Activo':
            return max((obj.apartado_fecha_expiracion - date.today()).days, 0)
        return 0


class ApartadoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Apartado
        fields = ['usuario', 'libro', 'apartado_fecha', 'apartado_fecha_expiracion', 'apartado_estatus']


class MultaSerializer(serializers.ModelSerializer):
    libro_titulo = serializers.CharField(source='prestamo.libro.libro_titulo', read_only=True)

    class Meta:
        model  = Multa
        fields = [
            'multa_id', 'prestamo_id', 'libro_titulo',
            'multa_dias_bloqueo', 'multa_motivo',
            'multa_fecha_inicio', 'multa_fecha_fin',
            'multa_estatus',
        ]