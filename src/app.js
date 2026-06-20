import express from 'express'
import cors from 'cors'
import noteRoutes from './routes/notesRoutes.js'
import tagsRoutes from './routes/tagsRoutes.js'
import errorHandler from './middleware/errorHandler.js'

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'notes-materials-service',
        timestamp: new Date().toISOString()
    });
});

// Rutas
app.use('/tags', tagsRoutes);  // /api/notes/tags → /tags
app.use('/', noteRoutes);       // /api/notes/* → /*  (incluye materiales)

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Ruta ${req.method} ${req.path} no encontrada en ps-ms-notes-materials-service`
    });
});

// Manejo de errores global
app.use(errorHandler);

export default app
