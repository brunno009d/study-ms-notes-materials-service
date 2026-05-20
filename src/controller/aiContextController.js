const notesRepository = require('../repository/notesRepository');

// Devuelve TODAS las notas del estudiante (solo lectura)
const getContext = async (req, res, next) => {
    try {
        const notes = await notesRepository.getAllNotesByStudentId(req.userId);

        res.status(200).json({
            total_notes: notes.length,
            notes
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getContext };
