const express = require('express');
const router = express.Router();
const tagsController = require('../controller/tagsController');
const requireAuth = require('../middleware/requireAuth');

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// Lista tags del estudiante
router.get('/', tagsController.getTags);

// Crea una nueva tag
router.post('/', tagsController.createTag);

// Actualiza una tag
router.put('/:id', tagsController.updateTag);

// Elimina una tag
router.delete('/:id', tagsController.deleteTag);

module.exports = router;
