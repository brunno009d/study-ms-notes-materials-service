const express = require('express');
const router = express.Router();
const notesController = require('../controller/notesController');
const materialsController = require('../controller/materialsController');
const requireAuth = require('../middleware/requireAuth');
const upload = require('../middleware/upload');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// MATERIALES (rutas específicas antes de las genéricas con :id)

// Sube un archivo a una nota
router.post('/:note_id/materials', upload.single('file'), materialsController.uploadMaterial);

// Elimina un material específico
router.delete('/materials/:material_id', materialsController.deleteMaterial);

// NOTAS

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

module.exports = router;
