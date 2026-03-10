from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .models import Usuario, Libro, Categoria, Editorial


class RegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'usuario_nombre', 'usuario_aPaterno', 'usuario_aMaterno',
            'usuario_nombre_acceso', 'usuario_password',
            'matricula_id', 'usuario_rol'
        ]
        extra_kwargs = {'usuario_password': {'write_only': True}}

    def create(self, validated_data):
        validated_data['usuario_password'] = make_password(validated_data['usuario_password'])
        return super().create(validated_data)


class LoginSerializer(serializers.Serializer):
    usuario_nombre_acceso = serializers.CharField()
    usuario_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            usuario = Usuario.objects.get(usuario_nombre_acceso=data['usuario_nombre_acceso'])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Credenciales incorrectas")

        if not check_password(data['usuario_password'], usuario.usuario_password):
            raise serializers.ValidationError("Credenciales incorrectas")

        data['usuario'] = usuario
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['usuario_id', 'usuario_nombre', 'usuario_aPaterno',
                  'usuario_nombre_acceso', 'matricula_id', 'usuario_rol']


# ── Nuevos serializers para el catálogo ──

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['categoria_id', 'categoria_nombre']


class LibroSerializer(serializers.ModelSerializer):
    # Muestra el nombre en lugar del id
    categoria_nombre = serializers.CharField(source='categoria.categoria_nombre', read_only=True)
    editorial_nombre = serializers.CharField(source='editorial.editorial_nombre', read_only=True)

    class Meta:
        model = Libro
        fields = [
            'libro_id', 'libro_titulo', 'libro_autor',
            'libro_isbn', 'libro_ejemplares', 'libro_descripcion',
            'categoria_id', 'categoria_nombre',
            'editorial_id', 'editorial_nombre',
        ]
    