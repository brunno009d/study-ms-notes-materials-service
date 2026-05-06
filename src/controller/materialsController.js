const materialsService = require('../service/materialsService');

class MaterialsController {

    // Sube un archivo a una nota
    async uploadMaterial(req, res, next) {
        try {
            const { note_id } = req.params;
            const material = await materialsService.uploadMaterial(parseInt(note_id), req.file, req.userId);
            res.status(201).json(material);
        } catch (error) {
            next(error);
        }
    }

    // Elimina un material específico
    async deleteMaterial(req, res, next) {
        try {
            const { material_id } = req.params;
            await materialsService.deleteMaterial(parseInt(material_id), req.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new MaterialsController();
