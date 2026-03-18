from django.db import models
from datetime import timedelta

# ─────────────────────────────────────────
# Constantes globales
# ─────────────────────────────────────────
DIAS_ESPERA_APARTADO = 5          # días máximos para asignar un apartado Pendiente
DIAS_RECOGIDA        = 3          # días para recoger un apartado Asignado
DIAS_PRESTAMO_OPTS   = [3, 5, 7]  # opciones válidas de días de préstamo


class Usuario(models.Model):
    ROL_CHOICES = [
        ('usuario', 'Usuario'),
        ('admin',   'Admin'),
    ]
    usuario_id              = models.AutoField(primary_key=True)
    matricula_id            = models.CharField(max_length=20, unique=True)
    usuario_nombre          = models.CharField(max_length=100)
    usuario_aPaterno        = models.CharField(max_length=100)
    usuario_aMaterno        = models.CharField(max_length=100, blank=True, default='')
    usuario_correo = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    usuario_password        = models.CharField(max_length=255)
    usuario_rol             = models.CharField(max_length=20, choices=ROL_CHOICES, default='usuario')
    usuario_bloqueado_hasta = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'usuarios'


class Editorial(models.Model):
    editorial_id     = models.AutoField(primary_key=True)
    editorial_nombre = models.CharField(max_length=200)

    class Meta:
        db_table = 'editoriales'


class Categoria(models.Model):
    categoria_id     = models.AutoField(primary_key=True)
    categoria_nombre = models.CharField(max_length=100)

    class Meta:
        db_table = 'categorias'


class Libro(models.Model):
    libro_id          = models.AutoField(primary_key=True)
    libro_titulo      = models.CharField(max_length=300)
    libro_autor       = models.CharField(max_length=200)
    libro_isbn        = models.CharField(max_length=20, unique=True)
    libro_ejemplares  = models.IntegerField(default=1)
    libro_descripcion = models.TextField(blank=True, default='')
    editorial         = models.ForeignKey(Editorial, on_delete=models.SET_NULL, null=True, db_column='editorial_id')
    categoria         = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, db_column='categoria_id')

    class Meta:
        db_table = 'libros'




def calcular_fecha_habil(fecha_inicio, dias_plazo):
    fecha_final = fecha_inicio
    dias_contados = 0
    while dias_contados < dias_plazo:
        fecha_final += timedelta(days=1)
        # weekday() devuelve 5 para Sábado y 6 para Domingo
        if fecha_final.weekday() < 5:
            dias_contados += 1
    return fecha_final

class Prestamo(models.Model):
    ESTATUS_CHOICES = [
        ('Activo',   'Activo'),
        ('Devuelto', 'Devuelto'),
        ('Vencido',  'Vencido'),
    ]
    prestamo_id                     = models.AutoField(primary_key=True)
    usuario                         = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    libro                           = models.ForeignKey(Libro, on_delete=models.CASCADE, db_column='libro_id')
    prestamo_fecha_salida           = models.DateField()
    prestamo_fecha_entrega_esperada = models.DateField()
    prestamo_fecha_devolucion_real  = models.DateField(null=True, blank=True)
    prestamo_estatus                = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Activo')
    prestamo_dias_plazo             = models.IntegerField(null=True, blank=True)

    # EL MÉTODO SAVE VA AQUÍ ABAJO
    def save(self, *args, **kwargs):
        # Calculamos la fecha solo si el objeto es nuevo (no tiene ID aún)
        # o si la fecha de entrega esperada aún no ha sido asignada.
        if not self.prestamo_id and self.prestamo_dias_plazo and self.prestamo_fecha_salida:
            self.prestamo_fecha_entrega_esperada = calcular_fecha_habil(
                self.prestamo_fecha_salida, 
                self.prestamo_dias_plazo
            )
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'prestamos'
class Apartado(models.Model):
    ESTATUS_CHOICES = [
        ('Pendiente',  'Pendiente'),
        ('Asignado',   'Asignado'),
        ('Cancelado',  'Cancelado'),
        ('Convertido', 'Convertido'),
    ]
    apartado_id                    = models.AutoField(primary_key=True)
    usuario                        = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    libro                          = models.ForeignKey(Libro, on_delete=models.CASCADE, db_column='libro_id')
    apartado_fecha                 = models.DateField()
    apartado_fecha_expiracion      = models.DateField()
    apartado_fecha_asignacion      = models.DateField(null=True, blank=True)
    apartado_fecha_limite_recogida = models.DateField(null=True, blank=True)
    apartado_estatus               = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Pendiente')

    class Meta:
        db_table = 'apartados'


class Multa(models.Model):
    ESTATUS_CHOICES = [
        ('Activa',   'Activa'),
        ('Cumplida', 'Cumplida'),
    ]
    multa_id           = models.AutoField(primary_key=True)
    prestamo           = models.ForeignKey(Prestamo, on_delete=models.CASCADE, db_column='prestamo_id')
    usuario            = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    multa_dias_bloqueo = models.IntegerField()
    multa_motivo       = models.CharField(max_length=255)
    multa_fecha_inicio = models.DateField()
    multa_fecha_fin    = models.DateField()
    multa_estatus      = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Activa')

    class Meta:
        db_table = 'multas'