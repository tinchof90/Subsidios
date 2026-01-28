const pool = require('../config/database');
const AppError = require('../utils/appError');

// Función para obtener todos los tipos de ítem de resolución
async function getAllTiposItemRes(req, res, next) {
    try {
        const query = `
            SELECT
                id_tipo_item,
                nombre
            FROM
                tipos_item_resolucion
            ORDER BY nombre ASC
        `;
        const result = await pool.query(query);
        
        // Envía una respuesta JSON con los datos de los tipos de ítem de resolución
        // Se mantiene la buena práctica de envolver los datos en una propiedad 'data'
        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Error al obtener tipos de ítem de resolución:', error); // Mensaje corregido
        next(new AppError('Error interno del servidor al obtener tipos de ítem de resolución.', 500)); // Mensaje corregido
    }
}

// Exporta las funciones para que puedan ser usadas por tus rutas
module.exports = {
    getAllTiposItemRes,
};
