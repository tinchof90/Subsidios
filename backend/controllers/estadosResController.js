const pool = require('../config/database'); 
const AppError = require('../utils/appError'); 

// Función para obtener todos los estados de resolución
async function getAllEstadosResolucion(req, res, next) {
  try {
    const query = `
      SELECT
        id_estado_resolucion,
        nombre
      FROM
        estados_resolucion
      ORDER BY id_estado_resolucion
    `;
    const result = await pool.query(query);
    
    // Envía una respuesta JSON con los datos de los estados de resolución
    // Es buena práctica envolver los datos en una propiedad 'data'
    res.json({ success: true, data: result.rows });

  } catch (error) {
    // Si ocurre algún error durante la consulta o la operación,
    // lo registramos y lo pasamos al middleware global de manejo de errores
    console.error('Error al obtener estados:', error);
    next(new AppError('Error interno del servidor al obtener estados.', 500));
  }
}

// Exporta las funciones para que puedan ser usadas por tus rutas
module.exports = {
  getAllEstadosResolucion,
  // Si tienes otras funciones CRUD para departamentos (crear, actualizar, eliminar), las exportarías aquí también.
};