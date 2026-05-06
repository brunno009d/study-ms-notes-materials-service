const supabase = require('../config/supabase');

class MaterialsRepository {

    // Crear registro de material
    async createMaterial(materialData) {
        const { data, error } = await supabase
            .from('material')
            .insert(materialData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Obtener material por ID
    async getMaterialById(materialId) {
        const { data, error } = await supabase
            .from('material')
            .select('*')
            .eq('id', materialId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    // Eliminar registro de material
    async deleteMaterial(materialId) {
        const { error } = await supabase
            .from('material')
            .delete()
            .eq('id', materialId);

        if (error) throw error;
        return true;
    }
}

module.exports = new MaterialsRepository();
