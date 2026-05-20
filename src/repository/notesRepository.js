const supabase = require('../config/supabase');

class NotesRepository {

    // Valida que el subject pertenece al estudiante vía subjects → curriculum
    async checkSubjectOwnership(subjectId, userId) {
        const { data, error } = await supabase
            .from('subjects')
            .select('id, curriculum!inner(student_id)')
            .eq('id', subjectId)
            .eq('curriculum.student_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    // Valida que una nota pertenece al estudiante vía notes → subjects → curriculum
    async checkNoteOwnership(noteId, userId) {
        const { data, error } = await supabase
            .from('notes')
            .select('id, subjects!inner(curriculum!inner(student_id))')
            .eq('id', noteId)
            .eq('subjects.curriculum.student_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    // Lista notas enriquecidas por asignatura (solo notas raíz)
    async getNotesBySubject(subjectId) {
        const { data, error } = await supabase
            .from('notes')
            .select('id, title, note_tags(tags(name, color_hex)), material(count)')
            .eq('subject_id', subjectId)
            .is('parent_note_id', null)
            .order('id', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Detalle completo de una nota con tags, materiales y notas hijas
    async getNoteById(id) {
        const { data, error } = await supabase
            .from('notes')
            .select('*, note_tags(tags(*)), material(*), child_notes:notes!parent_note_id(id, title)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    // Crear nota
    async createNote(noteData) {
        const { data, error } = await supabase
            .from('notes')
            .insert(noteData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Actualizar nota
    async updateNote(id, noteData) {
        const { data, error } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Eliminar nota (cascade borra material y note_tags)
    async deleteNote(id) {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // Vincular tags a una nota (inserción atómica)
    async linkTagsToNote(noteId, tagIds) {
        const rows = tagIds.map(tagId => ({ note_id: noteId, tag_id: tagId }));
        const { error } = await supabase
            .from('note_tags')
            .insert(rows);

        if (error) throw error;
        return true;
    }

    // Eliminar todas las tags de una nota (previo a re-inserción)
    async deleteNoteTags(noteId) {
        const { error } = await supabase
            .from('note_tags')
            .delete()
            .eq('note_id', noteId);

        if (error) throw error;
        return true;
    }

    // Obtener contenido completo de notas para resumen IA
    async getNoteContentsBySubject(subjectId, filters = {}) {
        let query = supabase
            .from('notes')
            .select('id, title, content_text, created_at, updated_at, note_tags(tags(id, name))')
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: true });

        // Filtro por rango de fechas
        if (filters.from_date) {
            query = query.gte('created_at', filters.from_date);
        }
        if (filters.to_date) {
            query = query.lte('created_at', filters.to_date);
        }

        // Filtro por búsqueda en título o contenido
        if (filters.search) {
            query = query.or(
                `title.ilike.%${filters.search}%,content_text.ilike.%${filters.search}%`
            );
        }

        const { data, error } = await query;
        if (error) throw error;

        // Filtro por tag_ids (post-query por la estructura relacional)
        if (filters.tag_ids && filters.tag_ids.length > 0) {
            return (data || []).filter(note => {
                const noteTagIds = (note.note_tags || []).map(nt => nt.tags?.id).filter(Boolean);
                return filters.tag_ids.some(tid => noteTagIds.includes(tid));
            });
        }

        return data || [];
    }

    // Obtener metadatos de TODAS las notas de un estudiante (sin contenido completo)
    // Usado por el endpoint /ai-context para el consejero IA
    async getAllNotesByStudentId(studentId) {
        const { data, error } = await supabase
            .from('notes')
            .select('id, title, subject_id, created_at, updated_at, ' +
                    'note_tags(tags(id, name, color_hex)), ' +
                    'subjects(name, code)')
            .eq('student_id', studentId)
            .is('parent_note_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Obtener materiales de una nota (para borrado de archivos)
    async getMaterialsByNoteId(noteId) {
        const { data, error } = await supabase
            .from('material')
            .select('*')
            .eq('note_id', noteId);

        if (error) throw error;
        return data || [];
    }

    // Obtener todas las notas del estudiante con filtros dinámicos (tags, recent_days, subject_id)
    async getFilteredNotes(studentId, filters = {}) {
        let query = supabase
            .from('notes')
            .select('id, title, subject_id, created_at, updated_at, ' +
                    'note_tags(tags(id, name, color_hex)), ' +
                    'subjects(name, code), ' +
                    'material(count)')
            .eq('student_id', studentId)
            .is('parent_note_id', null);

        if (filters.subject_id) {
            query = query.eq('subject_id', filters.subject_id);
        }

        if (filters.recent_days) {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - parseInt(filters.recent_days));
            query = query.gte('created_at', dateLimit.toISOString());
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        // Filtrado por tags en JS (estructura anidada)
        if (filters.tag_ids && filters.tag_ids.length > 0) {
            return (data || []).filter(note => {
                const noteTagIds = (note.note_tags || []).map(nt => nt.tags?.id).filter(Boolean);
                return filters.tag_ids.some(tid => noteTagIds.includes(tid));
            });
        }

        return data || [];
    }
}

module.exports = new NotesRepository();
