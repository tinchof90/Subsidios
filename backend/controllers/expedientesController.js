const pool = require('../config/database');
const AppError = require('../utils/appError');
const { body, validationResult } = require('express-validator');

// Función para obtener todos los expedientes CON DATOS DE PACIENTE, con búsqueda y paginación
async function getAllExpedientes(req, res, next) {
    try {
        const { page = 1, limit = 10, search = '' } = req.query; // <-- Capturamos searchTerm, page y limit
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const limitInt = parseInt(limit, 10);

        let query = `
            SELECT
                e.id_expediente,
                e.fecha_inicio,
                e.rnt,
                e.caso_nuevo,
                e.especificacion_id,
                e.observaciones,
                e.paciente_id,
                p.documento AS paciente_documento,
                p.nombre1 AS paciente_nombre1,
                p.nombre2 AS paciente_nombre2,
                p.apellido1 AS paciente_apellido1,
                p.apellido2 AS paciente_apellido2,
                p.fecha_nacimiento AS paciente_fecha_nacimiento,
                p.sexo AS paciente_sexo,
                p.direccion AS paciente_direccion,
                p.telefono AS paciente_telefono,
                es.nombre AS especificacion_nombre,
                es.cantidad_cuotas AS especificacion_cantidad_cuotas -- <--- AÑADIDO: Cantidad de cuotas de la especificación
            FROM
                expedientes e
            JOIN
                pacientes p ON e.paciente_id = p.id_paciente
            JOIN
                especificaciones es ON e.especificacion_id = es.id_especificacion
        `;
        let countQuery = `
            SELECT COUNT(*)
            FROM expedientes e
            JOIN pacientes p ON e.paciente_id = p.id_paciente
            JOIN especificaciones es ON e.especificacion_id = es.id_especificacion
        `;

        const queryParams = [];
        const countQueryParams = [];
        let paramIndex = 1;
        const searchTerm = search;

        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            query += `
                WHERE
                    e.rnt ILIKE $${paramIndex}
                    OR p.documento ILIKE $${paramIndex}
                    OR p.nombre1 ILIKE $${paramIndex}
                    OR p.apellido1 ILIKE $${paramIndex}
                    OR es.nombre ILIKE $${paramIndex}
            `;
            countQuery += `
                WHERE
                    e.rnt ILIKE $${paramIndex}
                    OR p.documento ILIKE $${paramIndex}
                    OR p.nombre1 ILIKE $${paramIndex}
                    OR p.apellido1 ILIKE $${paramIndex}
                    OR es.nombre ILIKE $${paramIndex}
            `;
            queryParams.push(searchPattern);
            countQueryParams.push(searchPattern);
            paramIndex++;
        }

        query += ` ORDER BY e.fecha_inicio DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limitInt, offset);

        const totalResult = await pool.query(countQuery, countQueryParams);
        const totalItems = parseInt(totalResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalItems / limitInt);

        const result = await pool.query(query, queryParams);
        const expedientes = result.rows;

        res.status(200).json({
            data: expedientes,
            totalItems,
            totalPages,
            currentPage: parseInt(page, 10),
            limit: limitInt
        });
    } catch (error) {
        console.error('Error al obtener expedientes con datos de paciente:', error);
        next(new AppError('Error al obtener expedientes.', 500));
    }
}

// Función para obtener un expediente por ID CON DATOS DE PACIENTE
async function getExpedienteById(req, res, next) {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT
                e.id_expediente,
                e.fecha_inicio,
                e.rnt,
                e.caso_nuevo,
                e.especificacion_id,
                e.observaciones,
                e.paciente_id,
                p.documento AS paciente_documento,
                p.nombre1 AS paciente_nombre1,
                p.nombre2 AS paciente_nombre2,
                p.apellido1 AS paciente_apellido1,
                p.apellido2 AS paciente_apellido2,
                p.fecha_nacimiento AS paciente_fecha_nacimiento,
                p.sexo AS paciente_sexo,
                p.direccion AS paciente_direccion,
                p.telefono AS paciente_telefono,
                es.nombre AS especificacion_nombre,
                es.cantidad_cuotas AS especificacion_cantidad_cuotas,
                (
                    SELECT COUNT(*)
                    FROM resoluciones r
                    WHERE r.expediente_id = e.id_expediente
                ) AS total_resoluciones_existentes
            FROM
                expedientes e
            JOIN
                pacientes p ON e.paciente_id = p.id_paciente
            JOIN
                especificaciones es ON e.especificacion_id = es.id_especificacion
            WHERE
                e.id_expediente = $1
        `, [id]);

        if (result.rows.length > 0) {
            // ¡CORRECCIÓN AQUÍ! Envuelve el objeto en una propiedad 'data'
            res.json({ success: true, data: result.rows[0] });
        } else {
            next(new AppError('Expediente no encontrado.', 404));
        }
    } catch (error) {
        console.error('Error al obtener expediente por ID con datos de paciente:', error);
        next(new AppError('Error al obtener expediente.', 500));
    }
}

// Obtener expedientes por el documento del paciente
async function getExpedientesByPacienteDocumento(req, res, next) {
    const { documento } = req.params;

    try {
        const result = await pool.query(`
            SELECT
                e.id_expediente,
                e.fecha_inicio,
                e.rnt,
                e.caso_nuevo,
                e.especificacion_id,
                e.observaciones,
                e.paciente_id,
                p.documento AS paciente_documento,
                p.nombre1 AS paciente_nombre1,
                p.nombre2 AS paciente_nombre2,
                p.apellido1 AS paciente_apellido1,
                p.apellido2 AS paciente_apellido2,
                p.fecha_nacimiento AS paciente_fecha_nacimiento,
                p.sexo AS paciente_sexo,
                p.direccion AS paciente_direccion,
                p.telefono AS paciente_telefono,
                es.nombre AS especificacion_nombre,
                es.cantidad_cuotas AS especificacion_cantidad_cuotas -- <--- AÑADIDO: Cantidad de cuotas de la especificación
            FROM
                expedientes e
            JOIN
                pacientes p ON e.paciente_id = p.id_paciente
            JOIN
                especificaciones es ON e.especificacion_id = es.id_especificacion
            WHERE
                p.documento = $1
            ORDER BY e.fecha_inicio DESC
        `, [documento]);

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows }); // También envuelve esta respuesta en 'data' para consistencia
        } else {
            res.json({ success: true, data: [] }); // Y esta también
        }
    } catch (error) {
        console.error(`Error al obtener expedientes por documento de paciente ${documento}:`, error);
        next(new AppError(`Error al obtener expedientes por documento de paciente.`, 500));
    }
}

const validateCreateExpediente = [
    body('fecha_inicio')
        .notEmpty().withMessage('La fecha de inicio es obligatoria.')
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD).'),
    body('rnt')
        .notEmpty().withMessage('El rnt es obligatorio.')
        .isString().withMessage('El rnt debe ser una cadena de texto.')
        .isLength({ min: 1, max: 50 }).withMessage('El rnt debe tener entre 1 y 50 caracteres.'),
    body('caso_nuevo')
        .notEmpty().withMessage('El campo "caso_nuevo" es obligatorio.')
        .isBoolean().withMessage('El campo "caso_nuevo" debe ser un valor booleano (true/false).'),
    body('especificacion_id')
        .notEmpty().withMessage('El ID de especificación es obligatorio.')
        .isInt({ min: 1 }).withMessage('El ID de especificación debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            try {
                const result = await pool.query('SELECT id_especificacion FROM especificaciones WHERE id_especificacion = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID de especificación proporcionado no existe.');
                }
            } catch (error) {
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar especificación del expediente:', error);
                throw new Error('Error interno al validar la especificación del expediente.');
            }
        }),
    body('observaciones')
        .optional({ nullable: true })
        .isString().withMessage('Las observaciones deben ser una cadena de texto.'),
    body('paciente_id')
        .notEmpty().withMessage('El ID del paciente es obligatorio.')
        .isInt({ min: 1 }).withMessage('El ID del paciente debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            try {
                const result = await pool.query('SELECT id_paciente FROM pacientes WHERE id_paciente = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID del paciente proporcionado no existe.');
                }
            } catch (error) {
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar paciente para expediente:', error);
                throw new Error('Error interno al validar el paciente para el expediente.');
            }
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

async function createExpediente(req, res, next) {
    const { fecha_inicio, rnt, caso_nuevo, especificacion_id, observaciones, paciente_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO expedientes (fecha_inicio, rnt, caso_nuevo, especificacion_id, observaciones, paciente_id)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [fecha_inicio, rnt, caso_nuevo, especificacion_id, observaciones, paciente_id]
        );
        res.status(201).json({ success: true, data: result.rows[0] }); // Envuelve en 'data' para consistencia
    } catch (error) {
        console.error('Error al crear expediente:', error);
        console.error('Detalles del error al crear expediente:', error.detail || error.message);

        if (error.code === '23503') {
            if (error.constraint && error.constraint.includes('paciente_id')) {
                return next(new AppError('El ID del paciente proporcionado no existe.', 400));
            }
            if (error.constraint && error.constraint.includes('especificacion_id')) {
                return next(new AppError('El ID de especificación proporcionado no existe.', 400));
            }
            return next(new AppError('Error de datos: una clave foránea no existe.', 400));
        }

        next(new AppError('Error al crear expediente.', 500));
    }
}

const validateUpdateExpediente = [
    body('fecha_inicio')
        .optional()
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD).'),
    body('rnt')
        .optional()
        .isString().withMessage('El rnt debe ser una cadena de texto.')
        .isLength({ min: 1, max: 50 }).withMessage('El rnt debe tener entre 1 y 50 caracteres.'),
    body('caso_nuevo')
        .optional()
        .isBoolean().withMessage('El campo "caso_nuevo" debe ser un valor booleano (true/false).'),
    body('especificacion_id')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El ID de especificación debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            if (value === null) return true;

            try {
                const result = await pool.query('SELECT id_especificacion FROM especificaciones WHERE id_especificacion = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID de especificación proporcionado no existe.');
                }
            } catch (error) {
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar especificación para actualización:', error);
                throw new Error('Error interno al validar la especificación del expediente.');
            }
        }),
    body('observaciones')
        .optional({ nullable: true })
        .isString().withMessage('Las observaciones deben ser una cadena de texto.'),
    body('paciente_id')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El ID del paciente debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            if (value === null) return true;

            try {
                const result = await pool.query('SELECT id_paciente FROM pacientes WHERE id_paciente = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID del paciente proporcionado no existe.');
                }
            } catch (error) {
                if (error.message.includes('existe')) {
                    throw error;
                }
                console.error('Error al validar paciente para actualización de expediente:', error);
                throw new Error('Error interno al validar el paciente para el expediente.');
            }
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

async function updateExpediente(req, res, next) {
    const { id } = req.params;
    const { fecha_inicio, rnt, caso_nuevo, especificacion_id, observaciones, paciente_id } = req.body;

    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (fecha_inicio !== undefined) { fields.push(`fecha_inicio = $${paramIndex++}`); values.push(fecha_inicio); }
        if (rnt !== undefined) { fields.push(`rnt = $${paramIndex++}`); values.push(rnt); }
        if (caso_nuevo !== undefined) { fields.push(`caso_nuevo = $${paramIndex++}`); values.push(caso_nuevo); }
        if (Object.prototype.hasOwnProperty.call(req.body, 'especificacion_id')) {
            fields.push(`especificacion_id = $${paramIndex++}`);
            values.push(especificacion_id);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'observaciones')) {
            fields.push(`observaciones = $${paramIndex++}`);
            values.push(observaciones);
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'paciente_id')) {
            fields.push(`paciente_id = $${paramIndex++}`);
            values.push(paciente_id);
        }

        if (fields.length === 0) {
            return next(new AppError('No hay campos válidos para actualizar.', 400));
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE expedientes SET ${fields.join(', ')} WHERE id_expediente = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] }); // Envuelve en 'data' para consistencia
        } else {
            next(new AppError('Expediente no encontrado para actualizar.', 404));
        }
    } catch (error) {
        console.error('Error al actualizar expediente:', error);
        if (error.code === '23503') {
            if (error.constraint && error.constraint.includes('paciente_id')) {
                return next(new AppError('El ID del paciente proporcionado no existe.', 400));
            }
            if (error.constraint && error.constraint.includes('especificacion_id')) {
                return next(new AppError('El ID de especificación proporcionado no existe.', 400));
            }
            return next(new AppError('Error de datos: una clave foránea no existe.', 400));
        }
        next(new AppError('Error al actualizar expediente.', 500));
    }
}

async function deleteExpediente(req, res, next) {
    const id = parseInt(req.params.id, 10); 
    if (isNaN(id)) {
        return next(new AppError('ID de expediente no válido.', 400));
    }
    
    let client; 

    try {
        client = await pool.connect(); 
        await client.query('BEGIN'); // 1. INICIA TRANSACCIÓN

        // --- PASO CRÍTICO: OBTENER LOS IDs DE RESOLUCIONES ASOCIADAS ---
        // Necesitamos los IDs de las resoluciones antes de borrarlas, para borrar sus ítems.
        const resolucionesResult = await client.query('SELECT id_resolucion FROM resoluciones WHERE expediente_id = $1', [id]);
        const resolucionIds = resolucionesResult.rows.map(r => r.id_resolucion);

        if (resolucionIds.length > 0) {
            // 2. ELIMINAR ITEMS DE RESOLUCIONES ASOCIADAS
            // Esto resuelve el error 23503 de items_resolucion
            await client.query('DELETE FROM items_resolucion WHERE resolucion_id = ANY($1)', [resolucionIds]);
        }

        // 3. ELIMINAR RESOLUCIONES
        // Esto resuelve la dependencia entre expediente y resoluciones
        await client.query('DELETE FROM resoluciones WHERE expediente_id = $1', [id]); 
        
        // 4. ELIMINAR EL EXPEDIENTE
        const result = await client.query('DELETE FROM expedientes WHERE id_expediente = $1 RETURNING *', [id]);
        
        // 5. CONFIRMAR O ROLLBACK
        if (result.rows.length > 0) {
            await client.query('COMMIT'); 
            res.status(200).json({ 
                success: true, 
                message: 'Expediente, resoluciones e ítems han sido eliminados.', 
                deletedExpediente: result.rows[0] 
            });
        } else {
            await client.query('ROLLBACK'); 
            next(new AppError('Expediente no encontrado para eliminar.', 404));
        }
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); 
        }
        
        console.error('--- ERROR CRÍTICO SQL FINAL ---');
        console.error('Mensaje interno:', error.message);
        console.error('Código SQL (Code):', error.code);
        console.error('---------------------------------');
        
        // Manejo de errores genérico
        next(new AppError('Error al completar la eliminación en cascada.', 500));
        
    } finally {
        if (client) {
            client.release(); 
        }
    }
}

async function getResolucionesByExpedienteId(req, res, next) {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT
                r.id_resolucion,
                r.fecha,
                r.descripcion,
                r.estado_id,
                e.nombre AS estado_nombre,
                r.expediente_id,
                COALESCE(SUM(ir.importe * ir.cantidad_cuotas), 0)::NUMERIC(10, 2) AS importe_total,
                COALESCE(json_agg(json_build_object(
                    'id_item_resolucion', ir.id_item_resolucion,
                    'tipo_item_id', tir.id_tipo_item,
                    'tipo_item_nombre', tir.nombre,
                    'importe', ir.importe,
                    'cantidad_cuotas', ir.cantidad_cuotas,
                    'cuota_actual_item', COALESCE(ir.cuota_actual_item, 0)
                )) FILTER (WHERE ir.id_item_resolucion IS NOT NULL), '[]') AS items_resolucion
            FROM
                resoluciones r
            JOIN
                estados_resolucion e ON r.estado_id = e.id_estado_resolucion
            LEFT JOIN
                items_resolucion ir ON r.id_resolucion = ir.resolucion_id
            LEFT JOIN
                tipos_item_resolucion tir ON ir.tipo_item_id = tir.id_tipo_item
            WHERE
                r.expediente_id = $1
            GROUP BY
                r.id_resolucion, r.fecha, r.descripcion, r.estado_id, e.nombre, r.expediente_id
            ORDER BY
                r.fecha DESC`,
            [id]
        );

        res.json({ success: true, data: result.rows }); // Envuelve en 'data' para consistencia
    } catch (error) {
        console.error(`Error al obtener resoluciones para el expediente ID ${id}:`, error);
        next(new AppError(`Error al obtener resoluciones para el expediente ID ${id}.`, 500));
    }
}

module.exports = {
    getAllExpedientes,
    getExpedienteById,
    validateCreateExpediente,
    createExpediente,
    validateUpdateExpediente,
    updateExpediente,
    deleteExpediente,
    getResolucionesByExpedienteId,
    getExpedientesByPacienteDocumento,
};
