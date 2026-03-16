from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Seguridad ──────────────────────────────────────────────
# Railway inyecta SECRET_KEY como variable de entorno.
# Si no existe (desarrollo local) usa la clave provisional.
SECRET_KEY = os.environ.get("SECRET_KEY", "biblioteca-web-secret-key-2024!!")

# DEBUG = False en producción (Railway pone RAILWAY_ENVIRONMENT=production)
DEBUG = os.environ.get("RAILWAY_ENVIRONMENT") != "production"

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    # Railway agrega automáticamente el dominio .railway.app
    os.environ.get("RAILWAY_PUBLIC_DOMAIN", ""),
]
# Elimina strings vacíos para no romper Django
ALLOWED_HOSTS = [h for h in ALLOWED_HOSTS if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "biblioteca",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # ← sirve archivos estáticos en producción
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── Base de datos ──────────────────────────────────────────
# Railway inyecta DATABASE_URL automáticamente al agregar PostgreSQL.
# dj_database_url la convierte al formato que Django entiende.
import dj_database_url

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Producción: usa la base de datos de Railway
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    # Desarrollo local: usa tu PostgreSQL local
    DATABASES = {
        "default": {
            "ENGINE":   "django.db.backends.postgresql",
            "NAME":     "biblioteca",
            "USER":     "swb_user",
            "PASSWORD": "tilines1234",
            "HOST":     "localhost",
            "PORT":     "5432",
        }
    }

# ── Idioma y zona horaria ──────────────────────────────────
LANGUAGE_CODE = "es-mx"
TIME_ZONE     = "America/Mexico_City"
USE_I18N      = True
USE_TZ        = True

# ── Archivos estáticos ─────────────────────────────────────
STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"          # carpeta que genera collectstatic
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django REST Framework ──────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

# ── CORS ───────────────────────────────────────────────────
# En desarrollo permite localhost; en producción agrega el dominio de Netlify.
NETLIFY_URL = os.environ.get("NETLIFY_URL", "")

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]
if NETLIFY_URL:
    CORS_ALLOWED_ORIGINS.append(NETLIFY_URL)

CORS_ALLOW_ALL_ORIGINS = True