import express from 'express'
import tagsController from '../controller/tagsController.js'
import requireAuth from '../middleware/requireAuth.js'

const router = express.Router()

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

export default router
