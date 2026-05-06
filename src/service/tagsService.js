const tagsRepository = require('../repository/tagsRepository');

class TagsService {

    // Lista tags del estudiante
    async getTags(userId) {
        return await tagsRepository.getTagsByStudentId(userId);
    }

    // Crear tag inyectando student_id
    async createTag(tagData, userId) {
        const { name, color_hex } = tagData;

        if (!name || !name.trim()) {
            const error = new Error('El nombre de la etiqueta es obligatorio');
            error.name = 'ValidationError';
            throw error;
        }

        return await tagsRepository.createTag({
            name: name.trim(),
            color_hex: color_hex || null,
            student_id: userId
        });
    }

    // Eliminar tag validando propiedad
    async deleteTag(tagId, userId) {
        const tag = await tagsRepository.getTagById(tagId);

        if (!tag) {
            const error = new Error('Etiqueta no encontrada');
            error.status = 404;
            throw error;
        }

        if (tag.student_id !== userId) {
            const error = new Error('No tienes permisos sobre esta etiqueta');
            error.status = 403;
            throw error;
        }

        return await tagsRepository.deleteTag(tagId);
    }
}

module.exports = new TagsService();
