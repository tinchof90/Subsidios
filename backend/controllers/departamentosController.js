const pool = require('../config/database'); 
const AppError = require('../utils/appError'); 

// Función para obtener todos los departamentos
async function getAllDepartamentos(req, res, next) {
  try {
    const query = `
      SELECT
        id_departamento,
        nombre
      FROM
        departamentos
      ORDER BY nombre ASC
    `;
    const result = await pool.query(query);
    
    // Envía una respuesta JSON con los datos de los departamentos
    // Es buena práctica envolver los datos en una propiedad 'data'
    res.json({ success: true, data: result.rows });

  } catch (error) {
    // Si ocurre algún error durante la consulta o la operación,
    // lo registramos y lo pasamos al middleware global de manejo de errores
    console.error('Error al obtener departamentos:', error);
    next(new AppError('Error interno del servidor al obtener departamentos.', 500));
  }
}

// Exporta las funciones para que puedan ser usadas por tus rutas
module.exports = {
  getAllDepartamentos,
  // Si tienes otras funciones CRUD para departamentos (crear, actualizar, eliminar), las exportarías aquí también.
};