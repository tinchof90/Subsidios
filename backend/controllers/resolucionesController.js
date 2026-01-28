const pool = require('../config/database');
const { validationResult, body } = require('express-validator');
const AppError = require('../utils/appError');

// Define las IDs de los tipos de ítem para no usar "números mágicos"
const TIPO_ITEM_RETROACTIVO_ID = 1; // Asume que este es el ID de 'Retroactivo'
const TIPO_ITEM_CONSECUTIVO_ID = 2; // Asume que este es el ID de 'Consecutivo'

async function getAllResoluciones(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT
                r.id_resolucion,
                r.fecha,
                r.descripcion,
                r.estado_id,
                e.nombre AS estado_nombre,
                r.expediente_id,
                -- Calculamos importe_total sumando los importes de los ítems
                COALESCE(SUM(
                    CASE
                        -- Si es Retroactivo (ID = 1), el importe ya es el total.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_RETROACTIVO_ID} THEN ir.importe 
                        -- Si es Consecutivo (ID = 2), el importe es unitario, debe multiplicarse.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_CONSECUTIVO_ID} THEN ir.importe * ir.cantidad_cuotas 
                        ELSE 0 
                    END
                ), 0)::NUMERIC(10, 2) AS importe_total,
                -- Agrupamos los items en un array JSON
                COALESCE(json_agg(json_build_object(
                    'id_item_resolucion', ir.id_item_resolucion,
                    'tipo_item_id', tir.id_tipo_item,
                    'tipo_item_nombre', tir.nombre,
                    'importe', ir.importe,
                    'cantidad_cuotas', ir.cantidad_cuotas,
                    'cuota_actual_item', ir.cuota_actual_item
                )) FILTER (WHERE ir.id_item_resolucion IS NOT NULL), '[]') AS items_resolucion
            FROM
                resoluciones r
            JOIN
                estados_resolucion e ON r.estado_id = e.id_estado_resolucion
            LEFT JOIN
                items_resolucion ir ON r.id_resolucion = ir.resolucion_id
            LEFT JOIN
                tipos_item_resolucion tir ON ir.tipo_item_id = tir.id_tipo_item
            GROUP BY
                r.id_resolucion, r.fecha, r.descripcion, r.estado_id, e.nombre, r.expediente_id
            ORDER BY
                r.id_resolucion ASC`
        );

        result.rows.forEach(row => {
            if (row.items_resolucion && row.items_resolucion.length > 0 && row.items_resolucion[0].id_item_resolucion === null) {
                row.items_resolucion = [];
            }
        });

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener todas las resoluciones:', error);
        next(new AppError('Error al obtener todas las resoluciones.', 500));
    }
}

async function getResolucionesByExpedienteId(req, res, next) {
    const { expedienteId } = req.params;
    try {
        const result = await pool.query(
            `SELECT
                r.id_resolucion,
                r.fecha,
                r.descripcion,
                r.estado_id,
                e.nombre AS estado_nombre,
                r.expediente_id,
                COALESCE(SUM(
                    CASE
                        -- Si es Retroactivo (ID = 1), el importe ya es el total.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_RETROACTIVO_ID} THEN ir.importe 
                        -- Si es Consecutivo (ID = 2), el importe es unitario, debe multiplicarse.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_CONSECUTIVO_ID} THEN ir.importe * ir.cantidad_cuotas 
                        ELSE 0 
                    END
                ), 0)::NUMERIC(10, 2) AS importe_total,
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
            [expedienteId]
        );

        result.rows.forEach(row => {
            if (row.items_resolucion && row.items_resolucion.length > 0 && row.items_resolucion[0].id_item_resolucion === null) {
                row.items_resolucion = [];
            }
        });

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error(`Error al obtener resoluciones para el expediente ${expedienteId}:`, error);
        next(new AppError(`Error al obtener resoluciones para el expediente ${expedienteId}.`, 500));
    }
}

async function getResolucionById(req, res, next) {
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
                -- Calculamos importe_total sumando los importes de los ítems
                COALESCE(SUM(
                    CASE
                        -- Si es Retroactivo (ID = 1), el importe ya es el total.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_RETROACTIVO_ID} THEN ir.importe 
                        -- Si es Consecutivo (ID = 2), el importe es unitario, debe multiplicarse.
                        WHEN tir.id_tipo_item = ${TIPO_ITEM_CONSECUTIVO_ID} THEN ir.importe * ir.cantidad_cuotas 
                        ELSE 0 
                    END
                ), 0)::NUMERIC(10, 2) AS importe_total,
                -- Agrupamos los items en un array JSON
                COALESCE(json_agg(json_build_object(
                    'id_item_resolucion', ir.id_item_resolucion,
                    'tipo_item_id', tir.id_tipo_item,
                    'tipo_item_nombre', tir.nombre,
                    'importe', ir.importe,
                    'cantidad_cuotas', ir.cantidad_cuotas,
                    'cuota_actual_item', ir.cuota_actual_item
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
                r.id_resolucion = $1
            GROUP BY
                r.id_resolucion, r.fecha, r.descripcion, r.estado_id, e.nombre, r.expediente_id`,
            [id]
        );

        if (result.rows.length > 0) {
            const resolution = result.rows[0];
            if (resolution.items_resolucion && resolution.items_resolucion.length > 0 && resolution.items_resolucion[0].id_item_resolucion === null) {
                resolution.items_resolucion = [];
            }
            res.json({ success: true, data: resolution });
        } else {
            next(new AppError('Resolución no encontrada.', 404));
        }
    } catch (error) {
        console.error('Error al obtener resolución:', error);
        next(new AppError('Error al obtener resolución.', 500));
    }
}

async function searchResolucionesByFecha(req, res, next) {
    const { fechaDesde, fechaHasta } = req.query;

    if (!fechaDesde && !fechaHasta) {
        return next(new AppError('Se debe proporcionar al menos una fecha de inicio (fechaDesde) o una fecha de fin (fechaHasta) para la búsqueda.', 400));
    }

    let query = `
        SELECT
            r.id_resolucion,
            r.fecha,
            r.descripcion AS resolucion_descripcion,
            r.estado_id,
            sr.nombre AS estado_nombre,
            r.expediente_id,
            -- Calculamos importe_total sumando los importes de los ítems
            COALESCE(SUM(
                CASE
                    -- Si es Retroactivo (ID = 1), el importe ya es el total.
                    WHEN tir.id_tipo_item = ${TIPO_ITEM_RETROACTIVO_ID} THEN ir.importe 
                    -- Si es Consecutivo (ID = 2), el importe es unitario, debe multiplicarse.
                    WHEN tir.id_tipo_item = ${TIPO_ITEM_CONSECUTIVO_ID} THEN ir.importe * ir.cantidad_cuotas 
                    ELSE 0 
                END
            ), 0)::NUMERIC(10, 2) AS importe_total,
            -- Datos del Expediente
            e.fecha_inicio AS expediente_fecha_inicio,
            e.rnt AS expediente_rnt,
            e.caso_nuevo AS expediente_caso_nuevo,
            es.nombre AS especificacion_nombre,
            es.cantidad_cuotas AS especificacion_cantidad_cuotas,
            e.observaciones AS expediente_observaciones,
            e.paciente_id AS expediente_paciente_id,
            -- Datos del Paciente (a través del Expediente)
            p.documento AS paciente_documento,
            p.nombre1 AS paciente_nombre1,
            p.apellido1 AS paciente_apellido1,
            -- Agregamos los ítems de la resolución
            COALESCE(json_agg(json_build_object(
                'id_item_resolucion', ir.id_item_resolucion,
                'tipo_item_id', tir.id_tipo_item,
                'tipo_item_nombre', tir.nombre,
                'importe', ir.importe,
                'cantidad_cuotas', ir.cantidad_cuotas,
                'cuota_actual_item', ir.cuota_actual_item
            )) FILTER (WHERE ir.id_item_resolucion IS NOT NULL), '[]') AS items_resolucion
        FROM
            resoluciones r
        JOIN
            estados_resolucion sr ON r.estado_id = sr.id_estado_resolucion
        JOIN
            expedientes e ON r.expediente_id = e.id_expediente
        JOIN
            especificaciones es ON e.especificacion_id = es.id_especificacion
        JOIN
            pacientes p ON e.paciente_id = p.id_paciente
        LEFT JOIN
            items_resolucion ir ON r.id_resolucion = ir.resolucion_id
        LEFT JOIN
            tipos_item_resolucion tir ON ir.tipo_item_id = tir.id_tipo_item
    `;

    const queryParams = [];
    const conditions = [];
    let paramIndex = 1;

    // VALIDACIONES DE FECHAS
    if (fechaDesde) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde)) {
            return next(new AppError('El formato de fechaDesde debe ser AAAA-MM-DD.', 400));
        }
        conditions.push(`r.fecha >= $${paramIndex++}`);
        queryParams.push(fechaDesde);
    }

    if (fechaHasta) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)) {
            return next(new AppError('El formato de fechaHasta debe ser AAAA-MM-DD.', 400));
        }
        conditions.push(`r.fecha <= $${paramIndex++}`);
        queryParams.push(fechaHasta);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
        GROUP BY
            r.id_resolucion, r.fecha, r.descripcion, r.estado_id, sr.nombre, r.expediente_id,
            e.fecha_inicio, e.rnt, e.caso_nuevo, es.nombre, es.cantidad_cuotas, e.observaciones, e.paciente_id,
            p.documento, p.nombre1, p.apellido1
        ORDER BY r.fecha DESC`;

    try {
        const result = await pool.query(query, queryParams);
        result.rows.forEach(row => {
            // El `COALESCE` al final del json_agg ya devuelve '[]' si no hay items, por lo que esta limpieza
            // podría ser redundante si el JSON_AGG está bien construido.
            // Si el resultado es un array con un objeto que tiene id_item_resolucion en null, lo limpiamos.
            if (row.items_resolucion && row.items_resolucion.length === 1 && row.items_resolucion[0].id_item_resolucion === null) {
                row.items_resolucion = [];
            }
        });
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error(`Error al buscar resoluciones por fecha (${fechaDesde || 'n/a'} a ${fechaHasta || 'n/a'}):`, error);
        next(new AppError('Error al buscar resoluciones por fecha.', 500));
    }
}

async function getValoresCuotasByAnio(client) {
    const result = await client.query(
        `SELECT anio, importe FROM valor_cuotas ORDER BY anio ASC`
    );
    const map = {};
    result.rows.forEach(row => {
        map[row.anio] = parseFloat(row.importe);
    });
    return map;
}

// ✅ FUNCIÓN: Calcular año y mes de cada cuota
function calcularAnioyMesDeCuota(mesInicio, anioInicio, posicionCuota, esRetroactivo, totalRetroactivas) {
    let mes, anio;

    if (esRetroactivo) {
        // Para retroactivas, vamos hacia atrás desde mesInicio
        const mesesAtras = totalRetroactivas - posicionCuota;
        mes = mesInicio - mesesAtras;
        anio = anioInicio;

        while (mes <= 0) {
            mes += 12;
            anio -= 1;
        }
    } else {
        // Para consecutivas, vamos hacia adelante desde mesInicio
        const mesesAdelante = posicionCuota - 1;
        mes = mesInicio + mesesAdelante;
        anio = anioInicio;

        while (mes > 12) {
            mes -= 12;
            anio += 1;
        }
    }

    return { anio, mes };
}

// VALIDACIONES PARA CREAR RESOLUCIÓN
const validateCreateResolucion = [
    // Validaciones para los campos principales de la resolución
    body('fecha')
        .notEmpty().withMessage('La fecha es obligatoria.')
        .isISO8601().withMessage('La fecha debe ser un formato de fecha válido (YYYY-MM-DD).')
        .toDate(),
    body('descripcion')
        .optional()
        .isString().withMessage('La descripción debe ser una cadena de texto.')
        .isLength({ max: 500 }).withMessage('La descripción no debe exceder los 500 caracteres.'),
    body('estado_id')
        // 1. TRIM para quitar espacios en blanco
        .trim()
        // 2. Comprobamos si existe y no es una cadena vacía DESPUÉS del trim
        .custom(value => {
            // Permitimos 0 si fuera el caso, pero rechazamos 'null', 'undefined' o la cadena vacía.
            if (value === undefined || value === null || value === '') {
                throw new Error('El estado de la resolución es obligatorio.');
            }
            return true;
        })
        // 3. Convertimos a entero ANTES de validar el isInt para manejar valores de string ('1')
        .toInt() 
        // 4. Validamos que el resultado sea un número entero >= 1 (Activo)
        .isInt({ min: 1 }).withMessage('El ID de estado debe ser un número entero positivo.'),
    body('expediente_id')
        .notEmpty().withMessage('El ID de expediente es obligatorio.')
        .isInt({ min: 1 }).withMessage('El ID de expediente debe ser un número entero positivo.'),

    // --- Validación para el array 'items_resolucion' ---
    body('items_resolucion')
        .optional()
        .isArray({ min: 1, max: 4 }).withMessage('El campo "items_resolucion" puede tener hasta 4 bloques.')
        .custom((items_resolucion) => {
            const idsValidos = [TIPO_ITEM_RETROACTIVO_ID, TIPO_ITEM_CONSECUTIVO_ID];
            const todosValidos = items_resolucion.every(item => idsValidos.includes(item.tipo_item_id));
            
            if (!todosValidos) {
                throw new Error('Uno o más ítems tienen un tipo de ítem no válido.');
            }
            return true;
        }),

    // --- Validaciones para cada ítem dentro del array 'items_resolucion' ---
    body('items_resolucion.*.tipo_item_id')
        .notEmpty().withMessage('El tipo de ítem es obligatorio para cada ítem de resolución.')
        .isInt({ min: 1 }).withMessage('El tipo de ítem debe ser un número entero positivo.')
        .custom((value) => {
            const tipoItemIdsValidos = [TIPO_ITEM_RETROACTIVO_ID, TIPO_ITEM_CONSECUTIVO_ID];
            if (!tipoItemIdsValidos.includes(value)) {
                throw new Error('El tipo_item_id proporcionado no es válido.');
            }
            return true;
        }),
    body('items_resolucion.*.importe')
        .notEmpty().withMessage('El importe del ítem es obligatorio.')
        .isFloat({ min: 0 }).withMessage('El importe del ítem debe ser un número positivo.'),
    body('items_resolucion.*.cantidad_cuotas')
        .notEmpty().withMessage('La cantidad de cuotas es obligatoria.')
        .isInt({ min: 1 }).withMessage('La cantidad de cuotas debe ser un número entero positivo.'),
    body('items_resolucion.*').custom((item, { req, location, path }) => {
        const tipoItemId = item.tipo_item_id;
        const cuotaActual = item.cuota_actual_item;
        
        // La cuota actual SÓLO es requerida para el tipo de ítem CONSECUTIVO.
        if (tipoItemId === TIPO_ITEM_CONSECUTIVO_ID) {
            
            // Verifica que el valor esté presente (no undefined, null, o cadena vacía)
            if (cuotaActual === undefined || cuotaActual === null || cuotaActual === "") {
                throw new Error('La cuota actual (cuota_actual_item) es obligatoria para el ítem Consecutivo.');
            }
            
            const cuotaInt = Number(cuotaActual);
            
            // Verifica que sea un entero positivo (>= 1)
            if (isNaN(cuotaInt) || !Number.isInteger(cuotaInt) || cuotaInt < 1) {
                throw new Error('La cuota actual del ítem debe ser un número entero positivo (>= 1).');
            }
            
        } else {
            // Para TIPO_ITEM_RETROACTIVO_ID (y cualquier otro no consecutivo),
            // el campo es opcional.
            
            // Si el frontend envía un valor para un ítem Retroactivo,
            // nos aseguramos de que sea nulo/ausente si se espera así.
            // Puesto que tu frontend lo omite (o lo envía como null si lo has forzado),
            // y la base de datos lo permite (asumimos allowNull: true), 
            // no lanzamos un error aquí.
            
            if (cuotaActual !== undefined && cuotaActual !== null && cuotaActual !== "") {
                 // Opcional: Podrías lanzar un error aquí si CUOTA_ACTUAL_ITEM DEBE ser nulo/ausente para Retroactivo, 
                 // pero generalmente es mejor dejarlo pasar si la BDD lo permite.
            }
        }
        
        return true;
    }),

    // --- Middleware para manejar los resultados de la validación ---
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            console.error('Errores de validación detallados:', errors.array());
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

/*
async function createResolucion(req, res, next) {
    console.log('Contenido de req.body al inicio de createResolucion:', req.body);
    const { fecha, descripcion, estado_id, expediente_id, items_resolucion } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar la transacción

        // ----------------------------------------------------------------------
        // 1. Obtener Límite de Cuotas y Cuotas Asignadas (MEJORA CRÍTICA)
        // ----------------------------------------------------------------------
        const cuotasDataResult = await client.query(
            `
            SELECT 
                es.cantidad_cuotas AS limite_especificacion,
                -- Sumar la cantidad de cuotas de *todos* los ítems de *todas* las resoluciones anteriores del expediente
                COALESCE(SUM(ir.cantidad_cuotas), 0) AS cuotas_ya_asignadas
            FROM 
                expedientes ex
            JOIN 
                especificaciones es ON ex.especificacion_id = es.id_especificacion
            LEFT JOIN
                resoluciones r ON ex.id_expediente = r.expediente_id
            LEFT JOIN
                items_resolucion ir ON r.id_resolucion = ir.resolucion_id
            WHERE 
                ex.id_expediente = $1
            GROUP BY
                es.cantidad_cuotas;
            `,
            [expediente_id]
        );

        if (cuotasDataResult.rows.length === 0) {
            throw new AppError(`No se encontró el expediente ${expediente_id} o su especificación.`, 404);
        }
        
        const { limite_especificacion, cuotas_ya_asignadas } = cuotasDataResult.rows[0];
        
        if (limite_especificacion === null) {
             throw new AppError(`La especificación del expediente ${expediente_id} no define un límite de cuotas.`, 400);
        }

        const limiteCuotasEspecificacion = parseInt(limite_especificacion);
        const cuotasYaAsignadas = parseInt(cuotas_ya_asignadas);

        // ----------------------------------------------------------------------
        // 2. Aplicar la Validación de Límite de Cuotas (LÍMITE DISPONIBLE)
        // ----------------------------------------------------------------------
        const cuotasDisponibles = limiteCuotasEspecificacion - cuotasYaAsignadas;
        
        let totalCuotasPayload = 0;
        for (const item of items_resolucion) {
            // Sumamos las cuotas de la nueva resolución
            totalCuotasPayload += parseInt(item.cantidad_cuotas || 0); 
        }

        if (totalCuotasPayload > cuotasDisponibles) {
            const errorMsg = `La suma de las cuotas de la nueva resolución (${totalCuotasPayload}) excede el límite disponible (${cuotasDisponibles}). Límite total: ${limiteCuotasEspecificacion}. Cuotas ya asignadas: ${cuotasYaAsignadas}.`;
            throw new AppError(errorMsg, 400);
        }

        // ----------------------------------------------------------------------
        // 3. Iniciar Transacción e Inserción
        // ----------------------------------------------------------------------
        
        // Insertar la Resolución Principal
        const resolutionResult = await client.query(
            `INSERT INTO resoluciones (fecha, descripcion, estado_id, expediente_id)
             VALUES ($1, $2, $3, $4) RETURNING id_resolucion, fecha, descripcion, estado_id, expediente_id`,
            [fecha, descripcion, estado_id, expediente_id]
        );
        const newResolucionId = resolutionResult.rows[0].id_resolucion;

        const insertedItems = [];
        let calculatedImporteTotal = 0;

        for (const item of items_resolucion) {
            const { tipo_item_id, importe, cantidad_cuotas } = item;
            
            const cantidadCuotasFinal = parseInt(cantidad_cuotas);

            // 🛑 APLICACIÓN DE MEJORA: Lógica de Inicialización de cuota_actual_item
            let cuotaActualFinal; 

            if (tipo_item_id === TIPO_ITEM_RETROACTIVO_ID) {
                // Retroactivo: Las cuotas están consumidas inmediatamente.
                // Cuota actual debe ser igual a la cantidad total de cuotas.
                cuotaActualFinal = cantidadCuotasFinal; 
            } else if (tipo_item_id === TIPO_ITEM_CONSECUTIVO_ID) {
                // Consecutivo: Se inicializa la primera cuota como consumida (o el valor del payload, validado como >= 1)
                // Se confía en la validación (validateCreateResolucion) de que es >= 1.
                cuotaActualFinal = parseInt(item.cuota_actual_item) || 1; 
            } else {
                 // Fallback para tipos de ítem inesperados
                cuotaActualFinal = 0; 
            }
            
            // Insertar el Item de la Resolución
            const itemResult = await client.query(
                `INSERT INTO items_resolucion (resolucion_id, tipo_item_id, importe, cantidad_cuotas, cuota_actual_item)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [newResolucionId, tipo_item_id, importe, cantidadCuotasFinal, cuotaActualFinal]
            );
            
            insertedItems.push(itemResult.rows[0]);
            calculatedImporteTotal += parseFloat(item.importe) * cantidadCuotasFinal;
        }

        await client.query('COMMIT'); // Confirmar la transacción

        res.status(201).json({
            success: true,
            data: {
                ...resolutionResult.rows[0],
                importe_total: parseFloat(calculatedImporteTotal.toFixed(2)),
                items_resolucion: insertedItems
            }
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); 
        }
        
        console.error('Error al crear resolución con ítems:', error);
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Error al crear resolución.';
        next(new AppError(message, statusCode));
    } finally {
        if (client) {
            client.release();
        }
    }
}
*/

// ✅ FUNCIÓN MODIFICADA: createResolucion
async function createResolucion(req, res, next) {
    const { fecha, descripcion, estado_id, expediente_id, items_resolucion } = req.body;

    // 🛑 Limpieza de fecha para evitar desfases de zona horaria
    let fechaParaBD = fecha; 
    if (fecha && typeof fecha === 'string') {
        fechaParaBD = fecha.split('T')[0];
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener el mapa de precios { anio: importe }
        const valorCuotasByAnio = await getValoresCuotasByAnio(client);

        // 2. Obtener datos del expediente para calcular periodos
        const expedienteResult = await client.query(
            `SELECT fecha_inicio FROM expedientes WHERE id_expediente = $1`,
            [expediente_id]
        );
        
        if (expedienteResult.rows.length === 0) {
            throw new AppError(`No se encontró el expediente ${expediente_id}.`, 404);
        }

        const fechaInicioExp = new Date(expedienteResult.rows[0].fecha_inicio);
        const anioInicio = fechaInicioExp.getFullYear();
        const mesInicio = fechaInicioExp.getMonth() + 1;

        // 3. Validación de límites (Solo para la primera resolución)
        const resolucionesCountResult = await client.query(
            `SELECT COUNT(*) AS total FROM resoluciones WHERE expediente_id = $1`,
            [expediente_id]
        );
        
        if (parseInt(resolucionesCountResult.rows[0].total) === 0) {
            const limiteResult = await client.query(
                `SELECT es.cantidad_cuotas FROM expedientes ex 
                 JOIN especificaciones es ON ex.especificacion_id = es.id_especificacion 
                 WHERE ex.id_expediente = $1`, [expediente_id]
            );
            const limite = parseInt(limiteResult.rows[0]?.cantidad_cuotas || 0);
            const totalPayload = items_resolucion.reduce((sum, i) => sum + parseInt(i.cantidad_cuotas), 0);
            
            if (totalPayload > limite) {
                throw new AppError(`Excede el límite de ${limite} cuotas.`, 400);
            }
        }

        // 4. Insertar la Resolución
        const resResult = await client.query(
            `INSERT INTO resoluciones (fecha, descripcion, estado_id, expediente_id)
             VALUES ($1, $2, $3, $4) RETURNING id_resolucion, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, estado_id, expediente_id`,
            [fechaParaBD, descripcion, estado_id, expediente_id]
        );
        const newId = resResult.rows[0].id_resolucion;

        // 5. Calcular total de retroactivas para el posicionamiento del calendario
        const totalRetroactivas = items_resolucion
            .filter(i => parseInt(i.tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID)
            .reduce((s, i) => s + parseInt(i.cantidad_cuotas), 0);

        const insertedItems = [];
        let calculatedImporteTotal = 0;

        // 6. PROCESAR ÍTEMS
        for (const item of items_resolucion) {
            const { tipo_item_id, cantidad_cuotas, cuota_actual_item } = item;
            const cantCuotas = parseInt(cantidad_cuotas);
            const esRetro = parseInt(tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID;
            
            let importeAcumulado = 0;
            let importeUnitarioBase = 0;

            // Iteramos cada cuota del ítem para sumar sus valores reales por año
            for (let i = 1; i <= cantCuotas; i++) {
                // Si es consecutivo, su posición en el tiempo depende de su 'cuota_actual_item'
                const posicionEnCalendario = esRetro ? i : (parseInt(cuota_actual_item) + i - 1);
                
                const { anio } = calcularAnioyMesDeCuota(
                    mesInicio, anioInicio, posicionEnCalendario, esRetro, totalRetroactivas
                );

                const precioAnio = valorCuotasByAnio[anio];
                if (!precioAnio) {
                    throw new AppError(`Falta configurar el Valor Cuota para el año ${anio}`, 400);
                }

                importeAcumulado += precioAnio;
                
                // Guardamos el precio de la primera cuota de este ítem como base unitaria
                if (i === 1) importeUnitarioBase = precioAnio;
            }

            // Decidimos qué importe guardar en la DB:
            // Retroactivo -> El acumulado total (porque es un pago único).
            // Consecutivo -> El unitario (porque el sistema lo usará para liquidar mes a mes).
            const importeAGuardar = esRetro ? importeAcumulado : importeUnitarioBase;
            const cuotaActualFinal = esRetro ? cantCuotas : (parseInt(cuota_actual_item) || 1);

            const itemRes = await client.query(
                `INSERT INTO items_resolucion (resolucion_id, tipo_item_id, importe, cantidad_cuotas, cuota_actual_item)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [newId, tipo_item_id, parseFloat(importeAGuardar.toFixed(2)), cantCuotas, cuotaActualFinal]
            );

            insertedItems.push(itemRes.rows[0]);
            
            // Sumamos al total de la resolución:
            calculatedImporteTotal += esRetro ? importeAcumulado : (importeUnitarioBase * cantCuotas);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: {
                ...resResult.rows[0],
                importe_total: parseFloat(calculatedImporteTotal.toFixed(2)),
                items_resolucion: insertedItems
            }
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        next(new AppError(error.message || 'Error al crear resolución.', error.statusCode || 500));
    } finally {
        client.release();
    }
}

// VALIDACIONES PARA ACTUALIZAR RESOLUCIÓN
const validateUpdateResolucion = [
    body('fecha')
        .optional()
        .isISO8601().withMessage('La fecha debe ser una fecha válida (YYYY-MM-DD).')
        .toDate(),

    body('estado_id')
        .optional()
        .isInt({ min: 1 }).withMessage('El ID de estado debe ser un número entero positivo.')
        .custom(async (value, { req }) => {
            try {
                const result = await pool.query('SELECT id_estado_resolucion FROM estados_resolucion WHERE id_estado_resolucion = $1', [value]);
                if (result.rows.length === 0) {
                    throw new Error('El ID de estado proporcionado no existe.');
                }
            } catch (error) {
                console.error('Error de validación de estado_resolucion:', error);
                throw new Error('Error al validar el estado de la resolución.');
            }
        }),

    body('descripcion')
        .optional()
        .isString().withMessage('La descripción debe ser una cadena de texto.')
        .isLength({ max: 500 }).withMessage('La descripción no debe exceder los 500 caracteres.'),
    
    body('expediente_id')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El ID de expediente debe ser un número entero positivo.'),
    
    body('items_resolucion')
        .optional() // <--- Hace opcional la actualización de ítems
        .isArray({ min: 1, max: 2 }).withMessage('El campo "items_resolucion" debe ser un array con 1 o 2 ítems.')
        
        // Custom Validator 2.1: Unicidad de Tipos de Ítem
        .custom((items_resolucion) => {
            let retroactivoCount = 0;
            let consecutivoCount = 0;

            items_resolucion.forEach(item => {
                const tipoId = item.tipo_item_id;
                
                if (tipoId === TIPO_ITEM_RETROACTIVO_ID) {
                    retroactivoCount++;
                } else if (tipoId === TIPO_ITEM_CONSECUTIVO_ID) {
                    consecutivoCount++;
                }
            });

            if (retroactivoCount > 1) {
                throw new Error('Una resolución solo puede tener un máximo de un ítem de tipo "Retroactivo".');
            }
            if (consecutivoCount > 1) {
                throw new Error('Una resolución solo puede tener un máximo de un ítem de tipo "Consecutivo".');
            }
            return true;
        }),
        
    // Custom Validator 2.2: Validación de campos por ítem (Solo se ejecutan si el array está presente)
    body('items_resolucion.*.tipo_item_id')
        .notEmpty().withMessage('El tipo de ítem es obligatorio para cada ítem de resolución.')
        .isInt({ min: 1 }).withMessage('El tipo de ítem debe ser un número entero positivo.')
        .custom((value) => {
            const tipoItemIdsValidos = [TIPO_ITEM_RETROACTIVO_ID, TIPO_ITEM_CONSECUTIVO_ID];
            if (!tipoItemIdsValidos.includes(value)) {
                throw new Error('El tipo_item_id proporcionado no es válido.');
            }
            return true;
        }),

    body('items_resolucion.*.importe')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('El importe del ítem debe ser un número positivo.'),

    body('items_resolucion.*.cantidad_cuotas')
        .notEmpty().withMessage('La cantidad de cuotas es obligatoria.')
        .isInt({ min: 1 }).withMessage('La cantidad de cuotas debe ser un número entero positivo.'),

    body('items_resolucion.*').custom((item) => {
        const tipoItemId = item.tipo_item_id;
        const cuotaActual = item.cuota_actual_item;
        
        // La cuota actual SÓLO es requerida y validada para el tipo de ítem CONSECUTIVO.
        if (tipoItemId === TIPO_ITEM_CONSECUTIVO_ID) {
            
            if (cuotaActual === undefined || cuotaActual === null || cuotaActual === "") {
                throw new Error('La cuota actual (cuota_actual_item) es obligatoria para el ítem Consecutivo.');
            }
            
            const cuotaInt = Number(cuotaActual);
            
            if (isNaN(cuotaInt) || !Number.isInteger(cuotaInt) || cuotaInt < 1) {
                throw new Error('La cuota actual del ítem debe ser un número entero positivo (>= 1).');
            }
        } 
        return true;
    }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            console.error('Errores de validación de actualización:', errors.array());
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

/*
// Nuevo updateResolucion, reemplazando el que tienes
async function updateResolucion(req, res, next) {
    const { id } = req.params;
    // Desestructuramos items_resolucion, que ahora es opcional en el PUT
    const { fecha, estado_id, descripcion, expediente_id, items_resolucion } = req.body; 

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        let resolucionActualizada = null;
        let itemsActualizados = null;
        let finalImporteTotal = 0;
        let currentExpedienteId = expediente_id; // Usar el ID del payload si viene

        // ----------------------------------------------------------------------
        // 1. Manejo de la Actualización de la Resolución Principal
        // ----------------------------------------------------------------------
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (fecha !== undefined) { fields.push(`fecha = $${paramIndex++}`); values.push(fecha); }
        if (estado_id !== undefined) { fields.push(`estado_id = $${paramIndex++}`); values.push(estado_id); }
        if (descripcion !== undefined) { fields.push(`descripcion = $${paramIndex++}`); values.push(descripcion); }
        if (expediente_id !== undefined) { fields.push(`expediente_id = $${paramIndex++}`); values.push(expediente_id); }
        
        // Si hay campos principales para actualizar, lo hacemos
        if (fields.length > 0) {
            values.push(id);
            const result = await client.query(
                `UPDATE resoluciones SET ${fields.join(', ')} WHERE id_resolucion = $${paramIndex} RETURNING *`,
                values
            );
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return next(new AppError('Resolución no encontrada para actualizar.', 404));
            }
            resolucionActualizada = result.rows[0];
            // Aseguramos el expediente_id si fue actualizado
            currentExpedienteId = resolucionActualizada.expediente_id;
        }

        // ----------------------------------------------------------------------
        // 2. Manejo de Reemplazo Total de Ítems
        // ----------------------------------------------------------------------
        if (items_resolucion) { // Solo si el array de items viene en el payload

            // 2.1 Recuperar Expediente ID (si no vino en el payload ni se actualizó)
            if (!currentExpedienteId) {
                const currentData = await client.query('SELECT expediente_id FROM resoluciones WHERE id_resolucion = $1', [id]);
                if (currentData.rows.length === 0) {
                    throw new AppError('Resolución no encontrada para validar ítems.', 404);
                }
                currentExpedienteId = currentData.rows[0].expediente_id;
            }

            // ----------------------------------------------------------------------
            // 2.2 Validación de Límite de Cuotas (ACUMULADO - CRÍTICA)
            // ----------------------------------------------------------------------
            const cuotasDataResult = await client.query(
                `
                SELECT 
                    es.cantidad_cuotas AS limite_especificacion,
                    -- Sumar las cuotas de TODAS las resoluciones del expediente, EXCEPTO la actual ($2)
                    COALESCE(SUM(ir.cantidad_cuotas), 0) AS cuotas_ya_asignadas_en_otras
                FROM 
                    expedientes ex
                JOIN 
                    especificaciones es ON ex.especificacion_id = es.id_especificacion
                LEFT JOIN
                    resoluciones r ON ex.id_expediente = r.expediente_id
                LEFT JOIN
                    items_resolucion ir ON r.id_resolucion = ir.resolucion_id
                WHERE 
                    ex.id_expediente = $1
                    AND r.id_resolucion != $2 -- <-- ¡EXCLUIR LA RESOLUCIÓN ACTUAL!
                GROUP BY
                    es.cantidad_cuotas;
                `,
                [currentExpedienteId, id] 
            );

            if (cuotasDataResult.rows.length === 0) {
                throw new AppError(`No se encontró el expediente ${currentExpedienteId} o su especificación.`, 404);
            }

            const { limite_especificacion, cuotas_ya_asignadas_en_otras } = cuotasDataResult.rows[0];
            
            if (limite_especificacion === null) {
                 throw new AppError(`La especificación del expediente ${currentExpedienteId} no define un límite de cuotas.`, 400);
            }

            const limiteCuotasEspecificacion = parseInt(limite_especificacion);
            const cuotasYaAsignadasEnOtras = parseInt(cuotas_ya_asignadas_en_otras);

            // Calcular el total de cuotas en el payload que el usuario quiere insertar
            const totalCuotasPayload = items_resolucion.reduce((sum, item) => sum + parseInt(item.cantidad_cuotas || 0), 0);
            
            // Cuotas realmente disponibles para esta resolución
            const cuotasDisponibles = limiteCuotasEspecificacion - cuotasYaAsignadasEnOtras;

            if (totalCuotasPayload > cuotasDisponibles) {
                const errorMsg = `La suma de las cuotas de los ítems a actualizar (${totalCuotasPayload}) excede el límite disponible (${cuotasDisponibles}). Límite total: ${limiteCuotasEspecificacion}. Cuotas ya asignadas en otras resoluciones: ${cuotasYaAsignadasEnOtras}.`;
                throw new AppError(errorMsg, 400);
            }
            
            // 2.3 Eliminación y Reinserción (REEMPLAZO TOTAL)
                
            // A. Eliminar ítems anteriores
            await client.query('DELETE FROM items_resolucion WHERE resolucion_id = $1', [id]);
                
            // B. Insertar ítems nuevos del payload
            itemsActualizados = [];
            let calculatedImporteTotal = 0;

            for (const item of items_resolucion) {
                const { tipo_item_id, importe, cantidad_cuotas } = item;
                const cantidadCuotasFinal = parseInt(cantidad_cuotas);

                // 🛑 APLICACIÓN DE MEJORA: Lógica de Inicialización de cuota_actual_item
                let cuotaActualFinal; 

                if (parseInt(tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID) {
                    // Retroactivo: Todas las cuotas están consumidas al inicio (ej: 3/3).
                    cuotaActualFinal = cantidadCuotasFinal; 
                } else if (parseInt(tipo_item_id) === TIPO_ITEM_CONSECUTIVO_ID) {
                    // Consecutivo: Usamos el valor del payload (cuota_actual_item) o 1 por defecto.
                    // Esto permite al usuario restablecer cuotas si es necesario, o mantenerlas.
                    cuotaActualFinal = parseInt(item.cuota_actual_item) || 1; 
                } else {
                     // Fallback 
                    cuotaActualFinal = 0; 
                }
                
                const itemResult = await client.query(
                    `INSERT INTO items_resolucion (resolucion_id, tipo_item_id, importe, cantidad_cuotas, cuota_actual_item)
                    VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [id, tipo_item_id, importe, cantidadCuotasFinal, cuotaActualFinal] // Usamos cuotaActualFinal
                );
                itemsActualizados.push(itemResult.rows[0]);
                calculatedImporteTotal += parseFloat(item.importe) * cantidadCuotasFinal;
            }
            finalImporteTotal = parseFloat(calculatedImporteTotal.toFixed(2));
        }

        // Si no se actualizaron campos principales ni items
        if (!resolucionActualizada && !itemsActualizados) {
            await client.query('ROLLBACK');
            // Nota: Aquí se lanza error 400, no 404, porque la resolución sí existe, pero el payload está vacío.
            return next(new AppError('No hay campos válidos de la resolución o ítems para actualizar.', 400));
        }
            
        await client.query('COMMIT');

        // ----------------------------------------------------------------------
        // 3. Preparar Respuesta Final
        // ----------------------------------------------------------------------
        // Si solo se actualizó la resolución, recuperamos los items y el total para la respuesta
        if (!itemsActualizados) {
            // ... (la lógica de recuperación de datos finales es la misma y está bien)
            const finalData = await client.query(
                `SELECT 
                    r.id_resolucion, r.fecha, r.descripcion, r.estado_id, r.expediente_id,
                    COALESCE(SUM(ir.importe * ir.cantidad_cuotas), 0)::NUMERIC(10, 2) AS importe_total,
                    COALESCE(json_agg(json_build_object(
                        'id_item_resolucion', ir.id_item_resolucion, 'tipo_item_id', ir.tipo_item_id,
                        'importe', ir.importe, 'cantidad_cuotas', ir.cantidad_cuotas, 'cuota_actual_item', ir.cuota_actual_item
                    )) FILTER (WHERE ir.id_item_resolucion IS NOT NULL), '[]') AS items_resolucion
                FROM resoluciones r 
                LEFT JOIN items_resolucion ir ON r.id_resolucion = ir.resolucion_id
                WHERE r.id_resolucion = $1
                GROUP BY r.id_resolucion`,
                [id]
            );
            return res.json({ success: true, data: finalData.rows[0] });
        }
        
        // Si se actualizaron los items, ya tenemos los datos en memoria
        res.json({ 
            success: true, 
            data: {
                // Aseguramos que se devuelvan los datos actualizados (si hubieron) o los originales
                ...(resolucionActualizada || req.body), 
                id_resolucion: id,
                expediente_id: currentExpedienteId, // Aseguramos que se devuelve el ID correcto
                importe_total: finalImporteTotal,
                items_resolucion: itemsActualizados
            }
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error al actualizar resolución (y/o items):', error);
        const statusCode = error.statusCode || 500;
        next(new AppError(error.message || 'Error al actualizar resolución.', statusCode));
    } finally {
        if (client) {
            client.release();
        }
    }
}
*/

async function updateResolucion(req, res, next) {
    const { id } = req.params;
    const { fecha, estado_id, descripcion, expediente_id, items_resolucion } = req.body; 

    // Asegura que solo se use la parte de la fecha (YYYY-MM-DD) - Esto evita que Node.js interprete la fecha como UTC 00:00
    let fechaParaBD = fecha; 
    if (fecha && typeof fecha === 'string') {
        // Si la cadena incluye la hora (T00:00:00Z), la eliminamos
        fechaParaBD = fecha.split('T')[0];
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        let resolucionActualizada = null;
        let itemsActualizados = null;
        let finalImporteTotal = 0;
        let currentExpedienteId = expediente_id;

        // 1. Actualización de la Resolución Principal
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (fecha !== undefined) { fields.push(`fecha = $${paramIndex++}`); values.push(fechaParaBD); }
        if (estado_id !== undefined) { fields.push(`estado_id = $${paramIndex++}`); values.push(estado_id); }
        if (descripcion !== undefined) { fields.push(`descripcion = $${paramIndex++}`); values.push(descripcion); }
        
        if (fields.length > 0) {
            values.push(id);
            const result = await client.query(
                `UPDATE resoluciones SET ${fields.join(', ')} WHERE id_resolucion = $${paramIndex} RETURNING id_resolucion, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, estado_id, expediente_id`,
                values
            );
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return next(new AppError('Resolución no encontrada para actualizar.', 404));
            }
            resolucionActualizada = result.rows[0];
            currentExpedienteId = resolucionActualizada.expediente_id;
        }

        // 2. Manejo de Items y Validación
        if (items_resolucion) {

            if (!currentExpedienteId) {
                const currentData = await client.query('SELECT expediente_id FROM resoluciones WHERE id_resolucion = $1', [id]);
                if (currentData.rows.length === 0) {
                    throw new AppError('Resolución no encontrada para validar ítems.', 404);
                }
                currentExpedienteId = currentData.rows[0].expediente_id;
            }

            // A. Validación de Límite de Cuotas (Lógica para la segunda resolución, etc.)
            const cuotasDataResult = await client.query(
                `SELECT 
                    es.cantidad_cuotas AS limite_especificacion,
                    COALESCE(sub.cuotas_ya_asignadas_en_otras, 0) AS cuotas_ya_asignadas_en_otras
                FROM 
                    expedientes ex
                JOIN 
                    especificaciones es ON ex.especificacion_id = es.id_especificacion
                LEFT JOIN (
                    SELECT 
                        r.expediente_id, 
                        SUM(ir.cantidad_cuotas) AS cuotas_ya_asignadas_en_otras
                    FROM 
                        resoluciones r
                    JOIN 
                        items_resolucion ir ON r.id_resolucion = ir.resolucion_id
                    WHERE 
                        r.id_resolucion != $2 -- Excluye la resolución que estamos actualizando
                    GROUP BY 
                        r.expediente_id
                ) AS sub ON ex.id_expediente = sub.expediente_id
                WHERE 
                    ex.id_expediente = $1;`,
                [currentExpedienteId, id] 
            );

            if (cuotasDataResult.rows.length === 0) {
                throw new AppError(`No se encontró el expediente ${currentExpedienteId} o su especificación.`, 404);
            }

            const { limite_especificacion, cuotas_ya_asignadas_en_otras } = cuotasDataResult.rows[0];
            
            if (limite_especificacion === null) {
                 throw new AppError(`La especificación del expediente ${currentExpedienteId} no define un límite de cuotas.`, 400);
            }

            const limiteCuotasEspecificacion = parseInt(limite_especificacion);
            const cuotasYaAsignadasEnOtras = parseInt(cuotas_ya_asignadas_en_otras);
            const totalCuotasPayload = items_resolucion.reduce((sum, item) => sum + parseInt(item.cantidad_cuotas || 0), 0);
            const cuotasDisponibles = limiteCuotasEspecificacion - cuotasYaAsignadasEnOtras;

            if (totalCuotasPayload > cuotasDisponibles) {
                const errorMsg = `La suma de las cuotas de los ítems a actualizar (${totalCuotasPayload}) excede el límite disponible (${cuotasDisponibles}).`;
                throw new AppError(errorMsg, 400);
            }

            // 🛑 B. ESTRATEGIA DE ACTUALIZACIÓN DE ÍTEMS (UPSERT SEGURO)

            // B.1. Recoger IDs de ítems ENVIADOS para saber cuáles mantener
            const submittedItemIds = items_resolucion
                .map(item => item.id_item_resolucion)
                .filter(id => id); 
                
            // B.2. Eliminar Ítems HUÉRFANOS (los que existían y no fueron enviados en el payload)
            if (submittedItemIds.length > 0) {
                // DELETE WHERE resolucion_id = $1 AND id_item_resolucion NOT IN ($2, $3, ...)
                await client.query(
                    `DELETE FROM items_resolucion 
                     WHERE resolucion_id = $1 AND id_item_resolucion NOT IN (${submittedItemIds.map((_, i) => `$${i + 2}`).join(', ')})`,
                    [id, ...submittedItemIds]
                );
            } else {
                // Si el payload tiene ítems, pero ninguno es existente (e.g., eliminó todos), hacemos DELETE ALL.
                // Si el payload está vacío, también hacemos DELETE ALL.
                await client.query('DELETE FROM items_resolucion WHERE resolucion_id = $1', [id]);
            }
            
            // Obtener valores de cuotas por año
            const valorCuotasByAnio = await getValoresCuotasByAnio(client);

            // Obtener fecha de inicio del expediente
            const expRes = await client.query('SELECT fecha_inicio FROM expedientes WHERE id_expediente = $1', [currentExpedienteId]);
            if (expRes.rows.length === 0) {
                throw new AppError('No se encontró el expediente para calcular importes.', 404);
            }
            const fechaInicio = new Date(expRes.rows[0].fecha_inicio);
            const anioInicio = fechaInicio.getFullYear();
            const mesInicio = fechaInicio.getMonth() + 1; // 1-12

            // Contar total de retroactivas
            const totalRetroactivas = items_resolucion
                .filter(it => parseInt(it.tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID)
                .reduce((s, it) => s + (parseInt(it.cantidad_cuotas || 0)), 0);

            itemsActualizados = [];
            let calculatedImporteTotal = 0;

            // B.3. UPSERT: Insertar ítems nuevos o Actualizar ítems existentes
            for (const item of items_resolucion) {
                const { id_item_resolucion, tipo_item_id, cantidad_cuotas } = item;
                const cantidadCuotasFinal = parseInt(cantidad_cuotas) || 0;

                // RECALCULO DE IMPORTE (suma cuota-a-cuota por año)
                let importeTotalItem = 0;
                for (let noCuota = 1; noCuota <= cantidadCuotasFinal; noCuota++) {
                    const esRetro = parseInt(tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID;
                    
                    // 💡 IMPORTANTE: Si es consecutivo, la posición depende de cuota_actual_item
                    const posicionEnCalendario = esRetro ? noCuota : (parseInt(item.cuota_actual_item) + noCuota - 1);
                    
                    const { anio } = calcularAnioyMesDeCuota(mesInicio, anioInicio, posicionEnCalendario, esRetro, totalRetroactivas);
                    
                    const precioParaEsteAnio = valorCuotasByAnio[anio];
                    if (!precioParaEsteAnio) {
                        throw new AppError(`Falta configurar el precio para el año ${anio}`, 400);
                    }
                    importeTotalItem += precioParaEsteAnio;
                }

                let importeAInsertar = 0;
                let cuotaActualFinal = 0;

                // ✅ LÓGICA DIFERENCIADA POR TIPO
                if (parseInt(tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID) {
                    // Retroactivo: insertar el TOTAL (y la cuota actual es el total de cuotas)
                    importeAInsertar = importeTotalItem;
                    cuotaActualFinal = cantidadCuotasFinal;
                } else if (parseInt(tipo_item_id) === TIPO_ITEM_CONSECUTIVO_ID) {
                    // Consecutivo: insertar el UNITARIO (primera cuota que se pagará)
                    const { anio: anioPrimera } = calcularAnioyMesDeCuota(mesInicio, anioInicio, 1, false, totalRetroactivas);
                    if (!valorCuotasByAnio[anioPrimera]) {
                        throw new AppError(`No se puede determinar el importe unitario para el consecutivo: el año ${anioPrimera} no tiene precio definido.`, 400);
                    }
                    importeAInsertar = valorCuotasByAnio[anioPrimera] || 0;
                    cuotaActualFinal = parseInt(item.cuota_actual_item) || 1;
                } else {
                    // Ítem Genérico: usar el importe total calculado (si aplica, sino 0)
                    importeAInsertar = importeTotalItem; 
                    cuotaActualFinal = 0;
                }

                // **ACCIÓN DB: UPDATE o INSERT**
                if (id_item_resolucion) {
                    // UPDATE: Ítem existente
                    const itemResult = await client.query(
                        `UPDATE items_resolucion SET
                             tipo_item_id = $2, importe = $3, cantidad_cuotas = $4, cuota_actual_item = $5
                         WHERE id_item_resolucion = $1
                         RETURNING *`,
                        [id_item_resolucion, tipo_item_id, parseFloat(importeAInsertar.toFixed(2)), cantidadCuotasFinal, cuotaActualFinal]
                    );
                    itemsActualizados.push(itemResult.rows[0]);
                } else {
                    // INSERT: Ítem nuevo
                    const itemResult = await client.query(
                        `INSERT INTO items_resolucion (resolucion_id, tipo_item_id, importe, cantidad_cuotas, cuota_actual_item)
                         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                        [id, tipo_item_id, parseFloat(importeAInsertar.toFixed(2)), cantidadCuotasFinal, cuotaActualFinal]
                    );
                    itemsActualizados.push(itemResult.rows[0]);
                }

                // Acumular total para la respuesta final
                if (parseInt(tipo_item_id) === TIPO_ITEM_RETROACTIVO_ID) {
                    calculatedImporteTotal += importeTotalItem;
                } else {
                    calculatedImporteTotal += importeAInsertar * cantidadCuotasFinal;
                }
            }
            finalImporteTotal = parseFloat(calculatedImporteTotal.toFixed(2));
        }

        // 3. Commit y Respuesta
        if (!resolucionActualizada && !itemsActualizados) {
            await client.query('ROLLBACK');
            return next(new AppError('No hay campos válidos de la resolución o ítems para actualizar.', 400));
        }
        
        await client.query('COMMIT');

        // Lógica para devolver el resultado (si no se actualizaron ítems, se hace un SELECT final)
        if (!itemsActualizados) {
            const finalData = await client.query(
                `SELECT 
                    r.id_resolucion, TO_CHAR(r.fecha, 'YYYY-MM-DD') AS fecha, r.descripcion, r.estado_id, r.expediente_id,
                    COALESCE(SUM(CASE WHEN ir.tipo_item_id = $2 THEN ir.importe ELSE ir.importe * ir.cantidad_cuotas END), 0)::NUMERIC(10, 2) AS importe_total,
                    COALESCE(json_agg(json_build_object(
                        'id_item_resolucion', ir.id_item_resolucion, 'tipo_item_id', ir.tipo_item_id,
                        'importe', ir.importe, 'cantidad_cuotas', ir.cantidad_cuotas, 'cuota_actual_item', ir.cuota_actual_item
                    )) FILTER (WHERE ir.id_item_resolucion IS NOT NULL), '[]') AS items_resolucion
                FROM resoluciones r 
                LEFT JOIN items_resolucion ir ON r.id_resolucion = ir.resolucion_id
                WHERE r.id_resolucion = $1
                GROUP BY r.id_resolucion`,
                [id, TIPO_ITEM_RETROACTIVO_ID]
            );
            return res.json({ success: true, data: finalData.rows[0] });
        }
        
        // Respuesta cuando se actualizaron ítems
        res.json({ 
            success: true, 
            data: {
                ...(resolucionActualizada || req.body), 
                id_resolucion: id,
                expediente_id: currentExpedienteId,
                importe_total: finalImporteTotal,
                items_resolucion: itemsActualizados
            }
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error al actualizar resolución (y/o items):', error);
        const statusCode = error.statusCode || 500;
        next(new AppError(error.message || 'Error al actualizar resolución.', statusCode));
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function deleteResolucion(req, res, next) {
    const { id } = req.params;
    try {
        // Primero eliminamos los items asociados, si existen
        await pool.query('DELETE FROM items_resolucion WHERE resolucion_id = $1', [id]);
        // Luego eliminamos la resolución
        const result = await pool.query(
            'DELETE FROM resoluciones WHERE id_resolucion = $1 RETURNING *',
            [id]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, message: 'Resolución eliminada exitosamente', deletedResolucion: result.rows[0] });
        } else {
            next(new AppError('Resolución no encontrada para eliminar.', 404));
        }
    } catch (error) {
        console.error('Error al eliminar resolución:', error);
        next(new AppError('Error al eliminar resolución.', 500));
    }
}

// Exportar las funciones y validadores del controlador
module.exports = {
    getAllResoluciones,
    getResolucionById,
    getResolucionesByExpedienteId,
    searchResolucionesByFecha,
    validateCreateResolucion,
    createResolucion,
    validateUpdateResolucion,
    updateResolucion,
    deleteResolucion,
};
