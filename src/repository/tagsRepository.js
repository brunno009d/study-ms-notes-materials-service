import supabase from '../config/supabase.js'

class TagsRepository {

    // Lista tags del estudiante
    async getTagsByStudentId(studentId) {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('student_id', studentId)
            .order('id', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Obtener tag por ID
    async getTagById(tagId) {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('id', tagId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    // Crear tag
    async createTag(tagData) {
        const { data, error } = await supabase
            .from('tags')
            .insert(tagData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Actualizar tag
    async updateTag(tagId, data) {
        const { data: updated, error } = await supabase
            .from('tags')
            .update(data)
            .eq('id', tagId)
            .select()
            .single();

        if (error) throw error;
        return updated;
    }

    // Eliminar tag (cascade limpia note_tags)
    async deleteTag(tagId) {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);

        if (error) throw error;
        return true;
    }
}

export default new TagsRepository()
