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
    // Contenido completo de notas para resumen IA (usado por ai-service)
    async getNoteContentsForSummary(req, res, next) {
        try {
            const { subject_id } = req.params;
            const { from_date, to_date, search, tag_ids } = req.query;

            const filters = {};
            if (from_date) filters.from_date = from_date;
            if (to_date) filters.to_date = to_date;
            if (search) filters.search = search;
            if (tag_ids) filters.tag_ids = tag_ids.split(',').map(Number);

            const notes = await notesService.getNoteContentsForSummary(
                parseInt(subject_id), req.userId, filters
            );
            res.status(200).json(notes);
        } catch (error) {
            next(error);
        }
    }

    // Lista todas las notas con filtros flexibles (Tags de estudio, Recientes, por Asignatura)
    async getFilteredNotes(req, res, next) {
        try {
            const { subject_id, tag_ids, recent_days } = req.query;
            const filters = {};

            if (subject_id) {
                filters.subject_id = parseInt(subject_id);
            }
            if (tag_ids) {
                filters.tag_ids = tag_ids.split(',').map(Number);
            }
            if (recent_days) {
                filters.recent_days = parseInt(recent_days);
            }

            const notes = await notesService.getFilteredNotes(req.userId, filters);
            res.status(200).json(notes);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotesController();
