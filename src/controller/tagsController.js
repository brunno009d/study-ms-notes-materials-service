const tagsService = require('../service/tagsService');

class TagsController {

    // Lista tags del estudiante
    async getTags(req, res, next) {
        try {
            const tags = await tagsService.getTags(req.userId);
            res.status(200).json(tags);
        } catch (error) {
            next(error);
        }
    }

    // Crea una nueva tag
    async createTag(req, res, next) {
        try {
            const tag = await tagsService.createTag(req.body, req.userId);
            res.status(201).json(tag);
        } catch (error) {
            next(error);
        }
    }

    // Actualiza una tag
    async updateTag(req, res, next) {
        try {
            const { id } = req.params;
            const tag = await tagsService.updateTag(parseInt(id), req.body, req.userId);
            res.status(200).json(tag);
        } catch (error) {
            next(error);
        }
    }

    // Elimina una tag
    async deleteTag(req, res, next) {
        try {
            const { id } = req.params;
            await tagsService.deleteTag(parseInt(id), req.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TagsController();
