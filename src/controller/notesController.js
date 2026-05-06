const notesService = require('../service/notesService');

class NotesController {

    // Lista notas de un ramo
    async getNotesBySubject(req, res, next) {
        try {
            const { subject_id } = req.params;
            const notes = await notesService.getNotesBySubject(parseInt(subject_id), req.userId);
            res.status(200).json(notes);
        } catch (error) {
            next(error);
        }
    }

    // Crea una nueva nota
    async createNote(req, res, next) {
        try {
            const note = await notesService.createNote(req.body, req.userId);
            res.status(201).json(note);
        } catch (error) {
            next(error);
        }
    }

    // Detalle completo de una nota
    async getNoteById(req, res, next) {
        try {
            const { id } = req.params;
            const note = await notesService.getNoteById(parseInt(id), req.userId);
            res.status(200).json(note);
        } catch (error) {
            next(error);
        }
    }

    // Actualiza una nota
    async updateNote(req, res, next) {
        try {
            const { id } = req.params;
            const note = await notesService.updateNote(parseInt(id), req.body, req.userId);
            res.status(200).json(note);
        } catch (error) {
            next(error);
        }
    }

    // Elimina una nota (cascade + limpieza Storage)
    async deleteNote(req, res, next) {
        try {
            const { id } = req.params;
            await notesService.deleteNote(parseInt(id), req.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotesController();
