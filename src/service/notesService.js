const notesRepository = require('../repository/notesRepository');
const storageRepository = require('../repository/storageRepository');

class NotesService {

    // Listar notas enriquecidas por asignatura
    async getNotesBySubject(subjectId, userId) {
        await this._verifySubjectOwnership(subjectId, userId);
        return await notesRepository.getNotesBySubject(subjectId);
    }

    // Detalle completo de una nota con signed URLs para materiales
    async getNoteById(noteId, userId) {
        await this._verifyNoteOwnership(noteId, userId);

        const note = await notesRepository.getNoteById(noteId);

        // Generar signed URLs temporales para cada material
        if (note.material && note.material.length > 0) {
            for (const mat of note.material) {
                if (mat.bucket_url) {
                    mat.signed_url = await storageRepository.createSignedUrl(mat.bucket_url);
                }
            }
        }

        return note;
    }

    // Crear nota con tags opcionales
    async createNote(noteData, userId) {
        const { subject_id, title, content_text, tag_ids } = noteData;

        if (!subject_id || !title || !content_text) {
            const error = new Error('Campos requeridos: subject_id, title, content_text');
            error.name = 'ValidationError';
            throw error;
        }

        await this._verifySubjectOwnership(subject_id, userId);

        const note = await notesRepository.createNote({ subject_id, title, content_text });

        if (tag_ids && tag_ids.length > 0) {
            await notesRepository.linkTagsToNote(note.id, tag_ids);
        }

        // Retornar nota completa con tags
        return await notesRepository.getNoteById(note.id);
    }

    // Actualizar nota (texto y/o tags)
    async updateNote(noteId, updateData, userId) {
        await this._verifyNoteOwnership(noteId, userId);

        const { tag_ids, ...noteFields } = updateData;

        // Filtrar campos permitidos
        const allowedFields = ['title', 'content_text'];
        const sanitized = {};
        for (const field of allowedFields) {
            if (noteFields[field] !== undefined) {
                sanitized[field] = noteFields[field];
            }
        }

        if (Object.keys(sanitized).length > 0) {
            await notesRepository.updateNote(noteId, sanitized);
        }

        // Reemplazar tags: DELETE viejos → INSERT nuevos
        if (tag_ids !== undefined) {
            await notesRepository.deleteNoteTags(noteId);
            if (tag_ids.length > 0) {
                await notesRepository.linkTagsToNote(noteId, tag_ids);
            }
        }

        return await notesRepository.getNoteById(noteId);
    }

    // Eliminar nota con limpieza de Storage
    async deleteNote(noteId, userId) {
        await this._verifyNoteOwnership(noteId, userId);

        // Obtener materiales antes de borrar para limpiar Storage
        const materials = await notesRepository.getMaterialsByNoteId(noteId);

        if (materials.length > 0) {
            const paths = materials.map(m => m.bucket_url).filter(Boolean);
            if (paths.length > 0) {
                await storageRepository.deleteFiles(paths);
            }
        }

        // Borrar nota (cascade elimina material y note_tags en la BD)
        return await notesRepository.deleteNote(noteId);
    }

    // --- Métodos privados ---

    async _verifySubjectOwnership(subjectId, userId) {
        const subject = await notesRepository.checkSubjectOwnership(subjectId, userId);
        if (!subject) {
            const error = new Error('Asignatura no encontrada o no pertenece al estudiante');
            error.status = 403;
            throw error;
        }
        return subject;
    }

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

module.exports = new NotesService();
