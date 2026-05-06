const materialsRepository = require('../repository/materialsRepository');
const notesRepository = require('../repository/notesRepository');
const storageRepository = require('../repository/storageRepository');

class MaterialsService {

    // Subir material a una nota
    async uploadMaterial(noteId, file, userId) {
        if (!file) {
            const error = new Error('Se requiere un archivo');
            error.name = 'ValidationError';
            throw error;
        }

        // Validar que la nota pertenece al usuario
        await this._verifyNoteOwnership(noteId, userId);

        // Construir la ruta en el bucket: userId/noteId/filename
        const storagePath = `${userId}/${noteId}/${file.originalname}`;

        // 1. Subir al Storage primero
        await storageRepository.uploadFile(storagePath, file.buffer, file.mimetype);

        // 2. Solo si el upload fue exitoso, insertar en BD
        const material = await materialsRepository.createMaterial({
            note_id: parseInt(noteId),
            file_name: file.originalname,
            bucket_url: storagePath
        });

        return material;
    }

    // Eliminar un material específico
    async deleteMaterial(materialId, userId) {
        const material = await materialsRepository.getMaterialById(materialId);

        if (!material) {
            const error = new Error('Material no encontrado');
            error.status = 404;
            throw error;
        }

        // Validar propiedad a través de la nota
        await this._verifyNoteOwnership(material.note_id, userId);

        // 1. Borrar del Storage primero
        if (material.bucket_url) {
            await storageRepository.deleteFiles([material.bucket_url]);
        }

        // 2. Borrar registro de BD
        return await materialsRepository.deleteMaterial(materialId);
    }

    // --- Métodos privados ---

    async _verifyNoteOwnership(noteId, userId) {
        const note = await notesRepository.checkNoteOwnership(noteId, userId);
        if (!note) {
            const error = new Error('Nota no encontrada o no pertenece al estudiante');
            error.status = 404;
            throw error;
        }
        return note;
    }
}

module.exports = new MaterialsService();
