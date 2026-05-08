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

    // Obtener materiales de una nota (para borrado de archivos)
    async getMaterialsByNoteId(noteId) {
        const { data, error } = await supabase
            .from('material')
            .select('*')
            .eq('note_id', noteId);

        if (error) throw error;
        return data || [];
    }
}

module.exports = new NotesRepository();
