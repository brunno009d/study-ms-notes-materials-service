# PopStudy - Notes & Materials Service 📚

Microservicio encargado de la gestión de notas y materiales de estudio en la plataforma PopStudy. Este servicio permite crear, leer, actualizar y eliminar notas, gestionar archivos adjuntos (materiales), así como etiquetar y organizar el contenido educativo.

## 🚀 Características

- **Gestión de Notas**: Crear, leer, actualizar y eliminar notas de estudio
- **Gestión de Materiales**: Subir, descargar y eliminar archivos adjuntos (PDFs, imágenes, documentos, etc.)
- **Etiquetado**: Crear y asignar etiquetas (tags) a las notas para mejor organización
- **Filtrado Avanzado**: Buscar notas por asignatura, etiquetas, fecha y contenido
- **Contexto para IA**: Proporcionar metadatos de notas para procesamiento por el servicio de IA
- **Almacenamiento en Nube**: Integración con Supabase Storage para archivos

## 📋 Requisitos

- Node.js 14+ 
- npm o yarn
- Cuenta de Supabase configurada
- Variables de entorno configuradas

## 🔧 Instalación

1. Clonar el repositorio
```bash
git clone <repository-url>
cd ps-ms-notes-materials-service
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase.

## 📦 Variables de Entorno

Las siguientes variables deben configurarse en el archivo `.env`:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto en el que corre el servicio | `3005` |
| `SUPABASE_URL` | URL de la base de datos Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE` | Clave de servicio de Supabase | `eyJhbGc...` |

## 🏃 Scripts Disponibles

```bash
# Iniciar el servicio en producción
npm start

# Iniciar en modo desarrollo con hot-reload
npm run dev

# Ejecutar tests
npm test
```

## 📁 Estructura del Proyecto

```
src/
├── app.js                      # Configuración principal de Express
├── config/
│   └── supabase.js            # Cliente de Supabase
├── controller/
│   ├── aiContextController.js  # Contexto para servicio IA
│   ├── materialsController.js  # Gestión de materiales/archivos
│   ├── notesController.js      # Gestión de notas
│   └── tagsController.js       # Gestión de etiquetas
├── middleware/
│   ├── errorHandler.js         # Manejo centralizado de errores
│   ├── requireAuth.js          # Autenticación con JWT
│   └── upload.js               # Configuración de carga de archivos
├── repository/
│   ├── materialsRepository.js  # Acceso a datos de materiales
│   ├── notesRepository.js      # Acceso a datos de notas
│   ├── storageRepository.js    # Acceso a Storage
│   └── tagsRepository.js       # Acceso a datos de etiquetas
├── routes/
│   ├── notesRoutes.js          # Rutas de notas y materiales
│   └── tagsRoutes.js           # Rutas de etiquetas
└── service/
    ├── materialsService.js     # Lógica de negocio de materiales
    ├── notesService.js         # Lógica de negocio de notas
    └── tagsService.js          # Lógica de negocio de etiquetas
```

## 🔌 Endpoints Principales

### Health Check
- `GET /health` - Verificar estado del servicio

### Notas
- `GET /` - Obtener notas filtradas (con query params para filtros)
- `GET /:id` - Obtener detalle de una nota
- `GET /subject/:subject_id` - Obtener notas de una asignatura
- `GET /subject/:subject_id/content` - Contenido de notas para IA
- `POST /` - Crear nueva nota
- `PUT /:id` - Actualizar una nota
- `DELETE /:id` - Eliminar una nota

### Materiales
- `POST /:note_id/materials` - Subir archivo a una nota
- `POST /upload/temp` - Subir archivo temporal
- `DELETE /materials/:material_id` - Eliminar un material

### Etiquetas
- `GET /tags` - Obtener todas las etiquetas
- `POST /tags` - Crear nueva etiqueta
- `DELETE /tags/:id` - Eliminar etiqueta

### Contexto IA
- `GET /ai-context` - Obtener metadatos de notas para procesamiento IA

## 🐳 Docker

El servicio puede ejecutarse en Docker utilizando el `Dockerfile` incluido.

```bash
# Construir imagen
docker build -t ps-ms-notes-materials-service .

# Ejecutar contenedor
docker run -p 3005:3005 \
  -e SUPABASE_URL=<url> \
  -e SUPABASE_SERVICE_ROLE=<key> \
  ps-ms-notes-materials-service
```

## 🔐 Autenticación

Todos los endpoints (excepto `/health`) requieren autenticación mediante JWT token en el header:

```
Authorization: Bearer <token>
```

El token se valida contra Supabase Auth.

## 📤 Carga de Archivos

- Tamaño máximo: 10MB
- Los archivos se almacenan en Supabase Storage
- Soporta múltiples formatos (PDF, imágenes, documentos, etc.)

## 🛠️ Desarrollo

### Instalar dependencias de desarrollo
```bash
npm install --save-dev nodemon
```

### Modo desarrollo con auto-reload
```bash
npm run dev
```

## 🤝 Integración con otros servicios

Este servicio forma parte de la arquitectura de microservicios de PopStudy:

- **API Gateway**: Enruta las solicitudes a este servicio en `/api/notes`
- **AI Service**: Consume el endpoint `/ai-context` para procesar notas
- **User Service**: Valida usuarios y autorización
- **Calendar Service**: Puede obtener notas relacionadas con fechas específicas

## 📝 Notas de Desarrollo

- El servicio usa CORS habilitado para comunicación entre servicios
- Manejo centralizado de errores en `middleware/errorHandler.js`
- Los tokens JWT se validan en cada solicitud (excepto health check)
- Los archivos se almacenan en memoria durante el procesamiento (stateless)

## 📄 Licencia

ISC

## 👥 Autores

PopStudy Team
