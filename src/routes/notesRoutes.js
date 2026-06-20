import express from 'express'
import notesController from '../controller/notesController.js'
import materialsController from '../controller/materialsController.js'
import { getContext } from '../controller/aiContextController.js'
import requireAuth from '../middleware/requireAuth.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// IA: Metadatos de todas las notas (solo lectura, sin contenido)
router.get('/ai-context', getContext);

// MATERIALES (rutas específicas antes de las genéricas con :id)

// Sube un archivo a una nota
router.post('/:note_id/materials', upload.single('file'), materialsController.uploadMaterial);

// Sube un archivo genérico temporal
router.post('/upload/temp', upload.single('file'), materialsController.uploadTempFile);

// Elimina un material específico
router.delete('/materials/:material_id', materialsController.deleteMaterial);

// NOTAS

// Obtener listado de todas las notas del alumno con filtros avanzados (tags, recientes, asignatura)
router.get('/', notesController.getFilteredNotes);

// Contenido de notas para resumen IA (usado por ai-service)
router.get('/subject/:subject_id/content', notesController.getNoteContentsForSummary);

// Lista notas enriquecidas de un ramo
router.get('/subject/:subject_id', notesController.getNotesBySubject);

// Crea una nueva nota
router.post('/', notesController.createNote);

// Detalle completo de una nota
router.get('/:id', notesController.getNoteById);

// Actualiza una nota
router.put('/:id', notesController.updateNote);

// Elimina una nota (cascade + limpieza Storage)
router.delete('/:id', notesController.deleteNote);

export default router
