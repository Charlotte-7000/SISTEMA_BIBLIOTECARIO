from django.db import models


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

    class Meta:
        db_table = 'prestamos'


class Apartado(models.Model):
    ESTATUS_CHOICES = [
        ('Activo',     'Activo'),
        ('Cancelado',  'Cancelado'),
        ('Convertido', 'Convertido'),
    ]
    apartado_id               = models.AutoField(primary_key=True)
    usuario                   = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    libro                     = models.ForeignKey(Libro, on_delete=models.CASCADE, db_column='libro_id')
    apartado_fecha            = models.DateField()
    apartado_fecha_expiracion = models.DateField()
    apartado_estatus          = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default='Activo')

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