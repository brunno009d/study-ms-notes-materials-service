import materialsService from '../service/materialsService.js'
import storageRepository from '../repository/storageRepository.js'

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
    // Sube un archivo genérico (ej. malla curricular) y devuelve su URL firmada temporal
    async uploadTempFile(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Se requiere un archivo' });
            }
            const userId = req.userId;
            const storagePath = `temp/${userId}/${Date.now()}_${req.file.originalname}`;
            
            await storageRepository.uploadFile(storagePath, req.file.buffer, req.file.mimetype);
            const fileUrl = await storageRepository.createSignedUrl(storagePath, 3600);
            
            res.status(201).json({ file_url: fileUrl });
        } catch (error) {
            next(error);
        }
    }
}

export default new MaterialsController()
