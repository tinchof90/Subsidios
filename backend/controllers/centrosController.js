const pool = require('../config/database');
const AppError = require('../utils/appError');
const { body, validationResult } = require('express-validator'); // <-- ¡Añade esta línea!

async function getAllCentros (req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const searchTerm = req.query.search ? req.query.search.toLowerCase() : '';

        let query = `
            SELECT
                c.id_centro,
                c.codigo,
                c.nombre,
                c.estado,
                c.departamento_id,
                d.nombre AS nombre_departamento
            FROM
                centros AS c
            LEFT JOIN
                departamentos AS d ON c.departamento_id = d.id_departamento
        `;
        let countQuery = `
            SELECT COUNT(c.id_centro) AS totalItems
            FROM centros AS c
            LEFT JOIN departamentos AS d ON c.departamento_id = d.id_departamento
        `;

        let queryParams = [];
        let countQueryParams = [];
        let whereConditions = []; // Renombrado para mayor claridad
        let paramCounter = 1; // Un contador de parámetros independiente, el más seguro

        if (searchTerm) {
            const likeTerm = `%${searchTerm}%`;
            whereConditions.push(`
                (unaccent(LOWER(c.codigo)) LIKE unaccent(LOWER($${paramCounter})) OR
                unaccent(LOWER(c.nombre)) LIKE unaccent(LOWER($${paramCounter + 1})))
            `);
            queryParams.push(likeTerm, likeTerm);
            countQueryParams.push(likeTerm, likeTerm);
            paramCounter += 2; // Incrementamos el contador por los 2 parámetros de búsqueda
        }

        // Solo añade la cláusula WHERE si hay condiciones de búsqueda
        if (whereConditions.length > 0) {
            const finalWhereClause = ` WHERE ` + whereConditions.join(' AND ');
            query += finalWhereClause;
            countQuery += finalWhereClause;
        }

        // Añadir ORDER BY y LIMIT/OFFSET al final de la consulta principal
        query += ` ORDER BY c.id_centro DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
        queryParams.push(limit, offset); // Añade limit y offset a los parámetros


        const totalResult = await pool.query(countQuery, countQueryParams);
        const totalItems = parseInt(totalResult.rows[0].totalitems);

        const result = await pool.query(query, queryParams);
        const centros = result.rows;

        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            data: centros,
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit
        });

    } catch (error) {
        console.error('Error al obtener centros:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener centros', error: error.message });
    }
}

// Función para obtener un centro por ID
async function getCentroById(req, res, next) {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM centros WHERE id_centro = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      next(new AppError('Centro no encontrado.', 404));
    }
  } catch (error) {
    console.error('Error al obtener centro por ID:', error);
    next(new AppError('Error al obtener centro.', 500));
  }
}

const validateCreateCentro = [
    body('codigo')
        .notEmpty().withMessage('El código es obligatorio.')
        .custom(async (value) => {
            const result = await pool.query('SELECT id_centro FROM centros WHERE codigo = $1', [value]);
            if (result.rows.length > 0) {
                throw new Error('Ya existe un centro con este código.');
            }
            return true;
        }),

    body('nombre')
        .notEmpty().withMessage('El nombre es obligatorio.')
        .isString().withMessage('El nombre debe ser una cadena de texto.')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),

    body('departamento_id')
        .notEmpty().withMessage('El ID de departamento es obligatorio.')
        .isInt({ min: 1 }).withMessage('El ID de departamento debe ser un número entero positivo.')
        .custom(async (value, { req }) => { // SUGERENCIA: Añadir validación de existencia del departamento
            try {
                const result = await pool.query('SELECT id_departamento FROM departamentos WHERE id_departamento = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID de departamento proporcionado no existe.');
                }
            } catch (error) {
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar departamento para centro:', error);
                throw new Error('Error interno al validar el departamento del centro.');
            }
        }),

    body('estado')
        .notEmpty().withMessage('El estado es obligatorio.')
        .isBoolean().withMessage('El estado debe ser un valor booleano (true/false).'),

    // Middleware para manejar los errores de validación
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

async function createCentro(req, res, next) {
    const { codigo, nombre, departamento_id, estado } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO centros (codigo, nombre, departamento_id, estado)
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [codigo, nombre, departamento_id, estado]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear centro:', error);
        console.error('Detalles del error al crear centro:', error.detail || error.message); // Añadir más detalle al log

        // SUGERENCIA: Manejar errores específicos de la base de datos
        if (error.code === '23505') { // unique_violation
            // Asumiendo que 'codigo' y/o 'nombre' podrían ser únicos en la tabla centros
            // O si tienes alguna restricción unique en otras columnas.
            if (error.constraint && error.constraint.includes('codigo')) { // Suponiendo que tienes una restricción unique en 'codigo'
                return next(new AppError('Ya existe un centro con el código proporcionado.', 409)); // 409 Conflict
            }
            if (error.constraint && error.constraint.includes('nombre')) { // Suponiendo que tienes una restricción unique en 'nombre'
                return next(new AppError('Ya existe un centro con el nombre proporcionado.', 409));
            }
            // Puedes añadir más verificaciones de constraints si tienes otros unique constraints
            return next(new AppError('Error de duplicidad: Un centro con estos datos ya existe.', 409));
        }
        if (error.code === '23503') { // foreign_key_violation (ej. departamento_id no existe)
            // Aunque la validación en express-validator debería capturarlo, esta es una capa extra.
            return next(new AppError('El ID de departamento proporcionado no existe.', 400));
        }

        next(new AppError('Error al crear centro.', 500));
    }
}

const validateUpdateCentro = [
    body('codigo')
        .optional()
        .isString().withMessage('El código debe ser una cadena de texto.')
        .isLength({ min: 1, max: 20 }).withMessage('El código debe tener entre 1 y 20 caracteres.'),

    body('nombre')
        .optional()
        .isString().withMessage('El nombre debe ser una cadena de texto.')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),

    body('departamento_id')
        .optional({ nullable: true }) // Permite que sea null si tu DB lo permite
        .isInt({ min: 1 }).withMessage('El ID de departamento debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            // SUGERENCIA: Importante manejar 'null' si el campo es optional({ nullable: true })
            if (value === null) return true; // Si el valor es null, permite la validación

            try {
                const result = await pool.query('SELECT id_departamento FROM departamentos WHERE id_departamento = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID de departamento proporcionado no existe.');
                }
            } catch (error) {
                // SUGERENCIA: Diferenciar si el error es de validación (no existe) o de DB
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar departamento para actualización de centro:', error);
                throw new Error('Error interno al validar el departamento del centro.');
            }
        }),

    body('estado')
        .optional({ nullable: true }) // SUGERENCIA: Usar nullable: true si el estado puede ser nulo, o solo optional() si siempre será true/false
        .isBoolean().withMessage('El estado debe ser un valor booleano (true/false).'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

async function updateCentro(req, res, next) {
    const { id } = req.params;
    const { codigo, nombre, departamento_id, estado } = req.body;

    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // SUGERENCIA: Usar hasOwnProperty para manejar 'null' explícitamente en campos opcionales
        if (Object.prototype.hasOwnProperty.call(req.body, 'codigo')) { fields.push(`codigo = $${paramIndex++}`); values.push(codigo); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'nombre')) { fields.push(`nombre = $${paramIndex++}`); values.push(nombre); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'departamento_id')) { fields.push(`departamento_id = $${paramIndex++}`); values.push(departamento_id); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'estado')) { fields.push(`estado = $${paramIndex++}`); values.push(estado); }

        if (fields.length === 0) {
            return next(new AppError('No hay campos válidos para actualizar.', 400));
        }

        values.push(id); // Añade el ID al final para la cláusula WHERE
        const result = await pool.query(
            `UPDATE centros SET ${fields.join(', ')} WHERE id_centro = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            next(new AppError('Centro no encontrado para actualizar.', 404));
        }
    } catch (error) {
        console.error('Error al actualizar centro:', error);
        console.error('Detalles del error al actualizar centro:', error.detail || error.message);

        // SUGERENCIA: Manejar errores específicos de la base de datos
        if (error.code === '23505') { // unique_violation
            if (error.constraint && error.constraint.includes('codigo')) { // Suponiendo que tienes una restricción unique en 'codigo'
                return next(new AppError('Ya existe un centro con el código proporcionado.', 409)); // 409 Conflict
            }
            if (error.constraint && error.constraint.includes('nombre')) { // Suponiendo que tienes una restricción unique en 'nombre'
                return next(new AppError('Ya existe un centro con el nombre proporcionado.', 409));
            }
            return next(new AppError('Error de duplicidad: Un centro con estos datos ya existe.', 409));
        }
        if (error.code === '23503') { // foreign_key_violation (ej. departamento_id no existe)
            // Aunque la validación en express-validator debería capturarlo, esta es una capa extra.
            return next(new AppError('El ID de departamento proporcionado no existe.', 400));
        }

        next(new AppError('Error al actualizar centro.', 500));
    }
}

async function deleteCentro(req, res, next) {
    const { id } = req.params;
    try {
        // CAMBIO: UPDATE en lugar de DELETE para eliminación lógica
        const result = await pool.query(
            'UPDATE centros SET estado = false WHERE id_centro = $1 RETURNING *', 
            [id]
        );

        if (result.rows.length > 0) {
            res.status(200).json({ 
                message: 'Centro desactivado exitosamente', 
                deletedCentro: result.rows[0] 
            });
        } else {
            next(new AppError('Centro no encontrado para desactivar.', 404));
        }
    } catch (error) {
        console.error('Error al desactivar centro:', error);
        next(new AppError('Error al procesar la baja del centro.', 500));
    }
}

module.exports = {
    getAllCentros,
    getCentroById,
    validateCreateCentro, // <-- ¡Correcto, exporta el validador!
    createCentro,
    validateUpdateCentro, // <-- ¡Correcto, exporta el validador!
    updateCentro,
    deleteCentro,
    // Asegúrate de que no haya funciones de resoluciones aquí si son de otro controlador
};