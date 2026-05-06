const supabase = require('../config/supabase');

const BUCKET_NAME = 'academic-resources';

class StorageRepository {

    // Sube un archivo al bucket
    async uploadFile(path, fileBuffer, mimeType) {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) throw error;
        return data;
    }

    // Elimina archivos del bucket
    async deleteFiles(filePaths) {
        if (!filePaths || filePaths.length === 0) return;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

        if (error) throw error;
        return true;
    }

    // Genera una URL firmada temporal
    async createSignedUrl(path, expiresIn = 3600) {
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(path, expiresIn);

        if (error) throw error;
        return data.signedUrl;
    }
}

module.exports = new StorageRepository();
