const pool = require('../config/database'); 
const AppError = require('../utils/appError'); 

// Función para obtener todas las especificaciones
async function getAllEspecificaciones(req, res, next) {
    try {
        const query = `
            SELECT
                id_especificacion,
                nombre,
                cantidad_cuotas -- ¡Añadido!
            FROM
                especificaciones
            ORDER BY nombre ASC
        `;
        const result = await pool.query(query);
        
        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Error al obtener especificaciones:', error);
        next(new AppError('Error interno del servidor al obtener especificaciones.', 500));
    }
}

// Nueva función para obtener una especificación por su ID
async function getEspecificacionById(req, res, next) {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                id_especificacion,
                nombre,
                cantidad_cuotas -- ¡Añadido!
            FROM
                especificaciones
            WHERE
                id_especificacion = $1
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            next(new AppError('Especificación no encontrada.', 404));
        }

    } catch (error) {
        console.error(`Error al obtener especificación con ID ${id}:`, error);
        next(new AppError('Error interno del servidor al obtener especificación.', 500));
    }
}

// Exporta las funciones para que puedan ser usadas por tus rutas
module.exports = {
    getAllEspecificaciones,
    getEspecificacionById, // ¡Añadido!
};
