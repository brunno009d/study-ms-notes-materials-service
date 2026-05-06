const multer = require('multer');

// Almacenamiento en memoria (stateless, sin guardar en disco del contenedor)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

module.exports = upload;
