const pool = require('../config/database'); // Asumo que esta es tu conexión a PostgreSQL
const AppError = require('../utils/appError');
const { validationResult, body, param } = require('express-validator');
const fs = require('fs/promises'); // Para eliminar archivos físicos
const path = require('path');     // Para manejar rutas de archivos

// Función auxiliar para obtener un paciente por ID con centro_nombre (¡muy útil!)
async function getPacienteCompletoById(id) {
    const query = `
        SELECT p.*, c.nombre as nombre_centro
        FROM pacientes p
        LEFT JOIN centros c ON p.centro_id = c.id_centro
        WHERE p.id_paciente = $1
    `;
    const result = await pool.query(query, [id]);
    const paciente = result.rows[0];

    if (paciente) {
        // Al ser JSONB, paciente.apoderado ya es un objeto.
        // Solo nos aseguramos de que no sea null para evitar errores en el frontend.
        paciente.apoderado = paciente.apoderado || { 
            activo: false, 
            nombre: '', 
            documento: '', 
            fecha_nacimiento: '' 
        };
    }
    return paciente;
}

// =======================================================
// Funciones del Controlador (Exports)
// =======================================================

// GET all pacientes con paginación y búsqueda
exports.getPacientes = async (req, res, next) => {
    // Usar nombres consistentes con el frontend
    const { page = 1, limit = 10, searchTerm = '', centroId } = req.query; 
    const offset = (page - 1) * limit;

    try {
        const queryParams = [];
        const whereClauses = [];

        if (searchTerm && searchTerm.trim() !== '') {
            queryParams.push(`%${searchTerm}%`);
            whereClauses.push(`(p.documento LIKE $${queryParams.length} OR p.nombre1 LIKE $${queryParams.length} OR p.apellido1 LIKE $${queryParams.length})`);
        }

        // 🟢 MEJORA: Validación más estricta del centroId
        if (centroId && centroId !== 'undefined' && centroId !== '') {
            queryParams.push(centroId);
            whereClauses.push(`p.centro_id = $${queryParams.length}`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Definimos los índices para LIMIT y OFFSET dinámicamente
        const limitIndex = queryParams.length + 1;
        const offsetIndex = queryParams.length + 2;

        const query = `
            SELECT p.*, c.nombre as nombre_centro 
            FROM pacientes p 
            LEFT JOIN centros c ON p.centro_id = c.id_centro 
            ${whereString} 
            ORDER BY p.apellido1 ASC 
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;

        // Pasamos exactamente lo que la consulta espera
        const result = await pool.query(query, [...queryParams, limit, offset]);
        
        const countQuery = `SELECT COUNT(*) FROM pacientes p ${whereString}`;
        const countResult = await pool.query(countQuery, queryParams);

        res.json({
            pacientes: result.rows.map(p => ({
                ...p,
                apoderado: p.apoderado || { activo: false, nombre: '', documento: '', fecha_nacimiento: '' }
            })),
            total: parseInt(countResult.rows[0].count),
            currentPage: parseInt(page),
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        });
    } catch (error) {
        console.error("Error en getPacientes:", error);
        next(new AppError('Error al obtener pacientes.', 500));
    }
};

// GET paciente by ID (se mantiene como la tienes, ya retorna centro_nombre)
exports.getPacienteById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM pacientes WHERE id_paciente = $1', [id]);
        const paciente = result.rows[0];

        if (!paciente) return next(new AppError('Paciente no encontrado.', 404));

        // 🟢 NORMALIZACIÓN: Si apoderado es null en DB, enviamos un objeto vacío estructurado
        paciente.apoderado = paciente.apoderado || { 
            activo: false, 
            nombre: '', 
            documento: '', 
            fecha_nacimiento: '' 
        };

        res.json(paciente);
    } catch (error) {
        next(new AppError('Error al obtener el paciente.', 500));
    }
};

// GET paciente by Documento (se mantiene como la tienes, ya retorna centro_nombre)
exports.getPacienteByDocumento = async (req, res, next) => {
    const { documento } = req.params;
    try {
        const query = `
            SELECT p.*, c.nombre as nombre_centro
            FROM pacientes p
            LEFT JOIN centros c ON p.centro_id = c.id_centro
            WHERE p.documento = $1
        `;
        const result = await pool.query(query, [documento]);
        const paciente = result.rows[0];

        if (!paciente) {
            return next(new AppError('No se encontró un paciente con ese documento.', 404));
        }

        // 🟢 NORMALIZACIÓN: 
        // Al ser JSONB, si existe, ya es un objeto. 
        // Si es null, le asignamos la estructura por defecto para el Frontend.
        paciente.apoderado = paciente.apoderado || { 
            activo: false, 
            nombre: '', 
            documento: '', 
            fecha_nacimiento: '' 
        };

        res.status(200).json(paciente);
    } catch (error) {
        console.error('Error al obtener paciente por documento:', error);
        next(new AppError('Error al buscar el paciente.', 500));
    }
};

// GET pacientes by Centro ID (se mantiene como la tienes, ya retorna centro_nombre)
exports.getPacientesByCentroId = async (req, res, next) => {
    const { centroId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM pacientes WHERE centro_id = $1 ORDER BY apellido1, nombre1', 
            [centroId]
        );

        // 🟢 MAPEADO: Normalizamos cada paciente de la lista
        const pacientes = result.rows.map(p => ({
            ...p,
            apoderado: p.apoderado || { activo: false, nombre: '', documento: '', fecha_nacimiento: '' }
        }));

        res.json(pacientes);
    } catch (error) {
        next(new AppError('Error al obtener pacientes del centro.', 500));
    }
};

// =======================================================
// CREATE paciente (con apoderado JSONB)
// =======================================================
exports.createPaciente = async (req, res, next) => {
    const {
        documento, nombre1, nombre2, apellido1, apellido2,
        fecha_nacimiento, sexo, direccion, telefono, centro_id,
        fecha_comienzo, apoderado
    } = req.body;

    try {
        // 1. VALIDACIÓN PROACTIVA: Verificar si el documento ya existe
        const existePaciente = await pool.query(
            'SELECT id_paciente FROM pacientes WHERE documento = $1', 
            [documento]
        );

        if (existePaciente.rows.length > 0) {
            return next(new AppError('Ya existe un paciente registrado con este documento.', 400));
        }

        // 2. MANEJO DE APODERADO (JSONB): 
        // Aprovechamos que el driver 'pg' serializa objetos automáticamente.
        const apoderadoData = (apoderado && apoderado.activo === true) 
            ? apoderado 
            : null;

        // 3. INSERCIÓN
        const result = await pool.query(
            `INSERT INTO pacientes
             (documento, nombre1, nombre2, apellido1, apellido2,
              fecha_nacimiento, sexo, direccion, telefono, centro_id,
              fecha_comienzo, apoderado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING id_paciente`,
            [
                documento, nombre1, nombre2, apellido1, apellido2,
                fecha_nacimiento, sexo, direccion, telefono, centro_id,
                fecha_comienzo,
                apoderadoData 
            ]
        );

        const newPacienteId = result.rows[0].id_paciente;
        
        // Obtenemos el objeto completo (con nombre de centro, etc.) para la respuesta
        const newPacienteCompleto = await getPacienteCompletoById(newPacienteId);
        
        res.status(201).json(newPacienteCompleto);

    } catch (error) {
        console.error('Error al crear paciente:', error);
        
        // Manejo de errores de integridad referencial (por si el centro no existe)
        if (error.code === '23503') {
            return next(new AppError('El centro de salud seleccionado no es válido.', 400));
        }
        
        // Error genérico para fallos inesperados
        next(new AppError('Error interno del servidor al registrar el paciente.', 500));
    }
};

// =======================================================
// UPDATE paciente (con apoderado JSONB)
// =======================================================
exports.updatePaciente = async (req, res, next) => {
    const { id } = req.params;
    const {
        documento, nombre1, nombre2, apellido1, apellido2,
        fecha_nacimiento, sexo, direccion, telefono, centro_id,
        fecha_comienzo, apoderado
    } = req.body;

    try {
        // 1. VALIDACIÓN PROACTIVA: Si se intenta cambiar el documento, verificar que no exista ya
        if (documento !== undefined) {
            const duplicado = await pool.query(
                'SELECT id_paciente FROM pacientes WHERE documento = $1 AND id_paciente != $2',
                [documento, id]
            );
            if (duplicado.rows.length > 0) {
                return next(new AppError('El documento ingresado ya pertenece a otro paciente.', 400));
            }
        }

        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Construcción dinámica de la consulta
        if (documento !== undefined) { fields.push(`documento = $${paramIndex++}`); values.push(documento); }
        if (nombre1 !== undefined) { fields.push(`nombre1 = $${paramIndex++}`); values.push(nombre1); }
        if (nombre2 !== undefined) { fields.push(`nombre2 = $${paramIndex++}`); values.push(nombre2); }
        if (apellido1 !== undefined) { fields.push(`apellido1 = $${paramIndex++}`); values.push(apellido1); }
        if (apellido2 !== undefined) { fields.push(`apellido2 = $${paramIndex++}`); values.push(apellido2); }
        if (fecha_nacimiento !== undefined) { fields.push(`fecha_nacimiento = $${paramIndex++}`); values.push(fecha_nacimiento); }
        if (sexo !== undefined) { fields.push(`sexo = $${paramIndex++}`); values.push(sexo); }
        if (direccion !== undefined) { fields.push(`direccion = $${paramIndex++}`); values.push(direccion); }
        if (telefono !== undefined) { fields.push(`telefono = $${paramIndex++}`); values.push(telefono); }
        
        if (Object.prototype.hasOwnProperty.call(req.body, 'fecha_comienzo')) {
            fields.push(`fecha_comienzo = $${paramIndex++}`);
            values.push(fecha_comienzo === '' ? null : fecha_comienzo);
        }
        
        if (Object.prototype.hasOwnProperty.call(req.body, 'centro_id')) {
            fields.push(`centro_id = $${paramIndex++}`);
            values.push(centro_id);
        }

        // Manejo de APODERADO (JSONB)
        if (Object.prototype.hasOwnProperty.call(req.body, 'apoderado')) {
            fields.push(`apoderado = $${paramIndex++}`);
            const apoderadoData = (apoderado && apoderado.activo === true) 
                ? apoderado 
                : null;
            values.push(apoderadoData);
        }

        if (fields.length === 0) return next(new AppError('No hay campos válidos para actualizar.', 400));

        // Añadir el ID para la cláusula WHERE
        values.push(id);
        
        const updateResult = await pool.query(
            `UPDATE pacientes SET ${fields.join(', ')} WHERE id_paciente = $${paramIndex} RETURNING id_paciente`,
            values
        );

        if (updateResult.rows.length === 0) {
            return next(new AppError('Paciente no encontrado para actualizar.', 404));
        }

        // Devolvemos el paciente con datos normalizados (nombre de centro, etc.)
        const updatedPacienteCompleto = await getPacienteCompletoById(id);
        res.json(updatedPacienteCompleto);

    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        
        // Error de clave foránea (centro_id inexistente)
        if (error.code === '23503') {
            return next(new AppError('El centro de salud seleccionado no existe.', 400));
        }
        
        next(new AppError('Error interno al intentar actualizar el paciente.', 500));
    }
};

// DELETE paciente (se mantiene como la tienes)
exports.deletePaciente = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM pacientes WHERE id_paciente = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Paciente eliminado exitosamente', deletedPaciente: result.rows[0] });
        } else {
            next(new AppError('Paciente no encontrado para eliminar', 404));
        }
    } catch (error) {
        console.error('Error al eliminar paciente:', error);
        if (error.code === '23503') {
            // Este error (foreign key violation) ya está manejado por ON DELETE CASCADE en la BD para archivos
            // Pero aún podría ocurrir si hay expedientes o resoluciones asociadas que no tienen CASCADE
            return next(new AppError('No se puede eliminar el paciente porque tiene datos asociados (expedientes, resoluciones).', 409));
        }
        next(new AppError('Error al eliminar paciente.', 500));
    }
};

// GET expedientes by Paciente ID (se mantiene como la tienes)
exports.getExpedientesByPacienteId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                e.id_expediente,
                e.fecha_inicio,
                e.rnt,
                e.caso_nuevo,
                e.especificacion_id,
                s.nombre_especificacion AS especificacion_nombre,
                e.observaciones,
                e.paciente_id,
                p.documento AS paciente_documento,
                p.nombre1 AS paciente_nombre1,
                p.apellido1 AS paciente_apellido1
            FROM
                expedientes e
            JOIN
                pacientes p ON e.paciente_id = p.id_paciente
            LEFT JOIN
                especificaciones s ON e.especificacion_id = s.id_especificacion
            WHERE
                e.paciente_id = $1
            ORDER BY e.fecha_inicio DESC
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error(`Error al obtener expedientes para el paciente ID ${id}:`, error);
        next(new AppError(`Error al obtener expedientes para el paciente ID ${id}.`, 500));
    }
};

// =======================================================
// NUEVAS FUNCIONES PARA LA GESTIÓN DE ARCHIVOS
// =======================================================

// --- Función para subir archivos a un paciente ---
exports.uploadPacienteFiles = async (req, res, next) => {    
    const pacienteIdUrl = req.params.paciente_id;
    const files = req.files;

    if (!files || files.length === 0) {
        return next(new AppError('No se subieron archivos.', 400));
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const patientCheck = await client.query('SELECT id_paciente FROM pacientes WHERE id_paciente = $1', [pacienteIdUrl]);
        if (patientCheck.rows.length === 0) {
            for (const file of files) {
                await fs.unlink(file.path).catch(err => console.error(`Error al eliminar archivo físico ${file.path}:`, err));
            }
            await client.query('ROLLBACK');
            return next(new AppError('Paciente no encontrado para asociar archivos.', 404));
        }

        const insertedFilesData = [];
        for (const file of files) {
            const insertSql = `
                INSERT INTO archivos (paciente_id, nombre, nombre_original, fecha_subida)
                VALUES ($1, $2, $3, NOW())
                RETURNING id_archivo, paciente_id, nombre, nombre_original, fecha_subida
            `;
            const result = await client.query(insertSql, [
                pacienteIdUrl,
                file.filename, // Nombre único generado por Multer (guardado en el servidor)
                file.originalname // Nombre original del archivo subido por el usuario
            ]);
            insertedFilesData.push(result.rows[0]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            status: 'success',
            message: 'Archivos subidos exitosamente.',
            data: insertedFilesData
        });

    } catch (error) {
        console.error('Error al subir y guardar archivos del paciente:', error);
        if (client) {
            await client.query('ROLLBACK').catch(err => console.error('Error al hacer rollback:', err));
        }
        for (const file of files) {
            await fs.unlink(file.path).catch(err => console.error(`Error al eliminar archivo físico ${file.path} tras fallo en DB:`, err));
        }
        next(new AppError('Error interno del servidor al procesar archivos.', 500));
    } finally {
        if (client) {
            client.release();
        }
    }
};

// --- Función para obtener archivos de un paciente ---
exports.getPacienteFiles = async (req, res, next) => {
    const paciente_id = req.params.paciente_id;

    try {
        const result = await pool.query(
            'SELECT id_archivo, nombre, nombre_original, fecha_subida FROM archivos WHERE paciente_id = $1 ORDER BY fecha_subida DESC',
            [paciente_id]
        );

        // ¡¡¡AQUÍ DEBES PONER EL CONSOLE.LOG!!!
        console.log(`[Backend] Archivos recuperados de la DB para paciente_id ${paciente_id}:`, result.rows);
        // También puedes loguear la URL completa para verificar
        console.log(`[Backend] Petición GET para archivos de paciente: /api/pacientes/${paciente_id}/archivos`);

        res.status(200).json({
            status: 'success',
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener archivos del paciente:', error);
        next(new AppError('Error interno del servidor al obtener archivos.', 500));
    }
};

// --- Función para eliminar un archivo específico ---
exports.deletePacienteFile = async (req, res, next) => {
    const paciente_id = req.params.paciente_id;
    const id_archivo = req.params.id_archivo;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Iniciar una transacción

        const fileRecordResult = await client.query(
            // Aquí se elimina la coma extra y se selecciona 'nombre' correctamente
            'SELECT nombre FROM archivos WHERE id_archivo = $1 AND paciente_id = $2',
            [id_archivo, paciente_id]
        );

        if (fileRecordResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(new AppError('Archivo no encontrado o no pertenece a este paciente.', 404));
        }

        const fileToDelete = fileRecordResult.rows[0];
        // Construir la ruta completa al archivo físico
        const filePath = path.join(__dirname, '..', 'uploads', fileToDelete.nombre);

        // 2. Eliminar el archivo físicamente del sistema de archivos
        await fs.unlink(filePath)
            .catch(err => {
                // Si el archivo no existe en disco (ENOENT), no es un error crítico
                // ya que el objetivo es eliminar el registro de la DB.
                if (err.code === 'ENOENT') {
                    console.warn(`Advertencia: El archivo físico ${filePath} no se encontró en el disco al intentar eliminarlo. Continuando con la eliminación del registro de la DB.`);
                } else {
                    throw err; // Re-lanza otros errores al eliminar el archivo físico
                }
            });

        // 3. Eliminar el registro del archivo de la base de datos
        const deleteResult = await client.query(
            'DELETE FROM archivos WHERE id_archivo = $1 AND paciente_id = $2 RETURNING *',
            [id_archivo, paciente_id]
        );

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Debería haber una fila si llegamos aquí
            return next(new AppError('Error al eliminar el registro del archivo en la base de datos.', 500));
        }

        await client.query('COMMIT'); // Confirmar la transacción

        res.status(200).json({
            status: 'success',
            message: 'Archivo eliminado exitosamente.'
        });

    } catch (error) {
        console.error('Error al eliminar el archivo del paciente:', error);
        if (client) {
            await client.query('ROLLBACK').catch(err => console.error('Error al hacer rollback:', err));
        }
        next(new AppError('Error interno del servidor al eliminar archivo.', 500));
    } finally {
        if (client) {
            client.release();
        }
    }
};

// =======================================================
// Validaciones (Middlewares) (se mantienen como las tienes)
// =======================================================

const validateCentroActivo = async (req, res, next) => {
    const centro_id = req.body.centro_id;

    // Si el campo centro_id no se proporciona, no hay nada que validar (es opcional).
    if (!centro_id) {
        return next(); 
    }

    try {
        const id = parseInt(centro_id, 10);
        
        // 2. Consultar el estado BOOLEANO del centro en la base de datos
        // Usamos 'estado' en lugar de 'estado_id'
        const result = await pool.query(
            `SELECT estado FROM centros WHERE id_centro = $1`, 
            [id]
        );

        if (result.rows.length === 0) {
            // Este error ya lo atrapa la Foreign Key, pero es más informativo:
            return next(new AppError('Error: El centro ID proporcionado no existe.', 400));
        }

        const centro = result.rows[0];
        
        // ⭐ BLOQUEO CLAVE: Si el estado es FALSE, el centro está inactivo.
        if (centro.estado === false) { 
            return next(new AppError('No se puede asignar un paciente a un centro que NO está activo.', 400));
        }

        // Si centro.estado es TRUE, pasa la validación
        next();

    } catch (error) {
        console.error('Error al validar estado del centro:', error);
        next(new AppError('Error interno del servidor al validar el centro.', 500));
    }
};

exports.validateCreatePaciente = [
    body('documento')
        .notEmpty().withMessage('El documento es obligatorio.')
        .custom(async (value) => {
            const result = await pool.query('SELECT id_paciente FROM pacientes WHERE documento = $1', [value]);
            if (result.rows.length > 0) {
                throw new Error('Ya existe un paciente registrado con este documento.');
            }
            return true;
        }),

    body('nombre1')
        .notEmpty().withMessage('El primer nombre es obligatorio.')
        .isString().withMessage('El primer nombre debe ser una cadena de texto.')
        .isLength({ min: 3, max: 25 }).withMessage('El primer nombre debe tener entre 3 y 25 caracteres.'),

    body('apellido1')
        .notEmpty().withMessage('El primer apellido es obligatorio.')
        .isString().withMessage('El primer apellido debe ser una cadena de texto.')
        .isLength({ min: 3, max: 25 }).withMessage('El primer apellido debe tener entre 3 y 25 caracteres.'),

    body('fecha_nacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es obligatoria.')
        .isISO8601().withMessage('La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD).')
        .toDate(),

    body('sexo')
        .notEmpty().withMessage('El sexo es obligatorio.')
        .isString().withMessage('El sexo debe ser una cadena de texto.')
        .isIn(['M', 'F', 'O']).withMessage('El sexo debe ser M, F o O.'),

    body('direccion')
        .optional({ nullable: true })
        .isString().withMessage('La dirección debe ser una cadena de texto.')
        .isLength({ max: 100 }).withMessage('La dirección no debe exceder los 100 caracteres.'),

    body('telefono')
        .optional({ nullable: true })
        .isString().withMessage('El teléfono debe ser una cadena de texto.')
        .isLength({ min: 7, max: 15 }).withMessage('El teléfono debe tener entre 7 y 15 caracteres.'),

    body('centro_id')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El centro ID debe ser un número entero positivo.')
        .custom(async (value) => {
            if (value) {
                const centro = await pool.query('SELECT id_centro FROM centros WHERE id_centro = $1', [value]);
                if (centro.rows.length === 0) {
                    throw new Error('El ID del centro proporcionado no existe.');
                }
            }
            return true;
        }),

    body('nombre2')
        .optional({ nullable: true })
        .isString().withMessage('El segundo nombre debe ser una cadena de texto.'),

    body('apellido2')
        .optional({ nullable: true })
        .isString().withMessage('El segundo apellido debe ser una cadena de texto.'),
    
    body('fecha_comienzo')
        .optional({ nullable: true }) // Permite que sea opcional y nulo
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD).')
        .toDate() // Convierte a objeto Date
        .custom((value, { req }) => {
            if (value && value < new Date(new Date().setHours(0, 0, 0, 0))) {
                throw new Error('La fecha de inicio no puede ser anterior a hoy.');
            }
            return true;
        }),
        
    // AÑADIR VALIDACIONES CONDICIONALES PARA APODERADO
    body('apoderado').optional({ nullable: true }), // Permite que apoderado sea null o no exista

    // Validaciones de los subcampos del apoderado, CONDICIONALES a que 'apoderado.activo' sea TRUE
    body('apoderado.activo').toBoolean(), // Convierte el valor booleano (si existe)

    // Validación del nombre: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.nombre')
        .if(body('apoderado.activo').equals(true)) // 🔑 CLAVE: La validación solo se ejecuta si activo es true
        .notEmpty().withMessage('El nombre del apoderado es obligatorio')
        .isString().withMessage('El nombre del apoderado debe ser texto')
        .isLength({ max: 100 }).withMessage('Máximo 100 caracteres para el nombre del apoderado')
        .bail(), // Detiene la cadena de validación si falla

    // Validación del documento: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.documento')
        .if(body('apoderado.activo').equals(true)) // 🔑 CLAVE: La validación solo se ejecuta si activo es true
        .notEmpty().withMessage('El documento del apoderado es obligatorio')
        .isString().withMessage('El documento del apoderado debe ser texto')
        .isLength({ max: 20 }).withMessage('Máximo 20 caracteres para el documento del apoderado')
        .bail(),

    // Validación de la fecha: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.fecha_nacimiento')
        .if(body('apoderado.activo').equals(true)) // 🔑 CLAVE: La validación solo se ejecuta si activo es true
        .notEmpty().withMessage('La fecha de nacimiento del apoderado es obligatoria')
        .isISO8601().withMessage('La fecha de nacimiento del apoderado debe ser válida (YYYY-MM-DD)')
        .toDate()
        .custom(value => {
            if (value && value > new Date()) {
                throw new Error('La fecha de nacimiento del apoderado no puede ser en el futuro');
            }
            return true;
        }),
    // 🛑 MIDDLEWARE DE REGLA DE NEGOCIO: Valida que el centro_id exista y esté activo (estado = true)
    validateCentroActivo,

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

exports.validateUpdatePaciente = [
    param('id').isInt().withMessage('El ID del paciente debe ser un número entero.'),
    body('documento')
        .optional()
        .isString().withMessage('El documento debe ser una cadena de texto.')
        .isLength({ min: 7, max: 8 }).withMessage('El documento debe tener entre 7 y 8 caracteres.'),

    body('nombre1')
        .optional()
        .isString().withMessage('El primer nombre debe ser una cadena de texto.')
        .isLength({ min: 3, max: 25 }).withMessage('El primer nombre debe tener entre 3 y 25 caracteres.'),

    body('apellido1')
        .optional()
        .isString().withMessage('El primer apellido debe ser una cadena de texto.')
        .isLength({ min: 3, max: 25 }).withMessage('El primer apellido debe tener entre 3 y 25 caracteres.'),

    body('fecha_nacimiento')
        .optional()
        .isISO8601().withMessage('La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD).')
        .toDate(),

    body('sexo')
        .optional()
        .isString().withMessage('El sexo debe ser una cadena de texto.')
        .isIn(['M', 'F', 'O']).withMessage('El sexo debe ser M, F o O.'),

    body('direccion')
        .optional({ nullable: true })
        .isString().withMessage('La dirección debe ser una cadena de texto.')
        .isLength({ max: 100 }).withMessage('La dirección no debe exceder los 100 caracteres.'),

    body('telefono')
        .optional({ nullable: true })
        .isString().withMessage('El teléfono debe ser una cadena de texto.')
        .isLength({ min: 7, max: 15 }).withMessage('El teléfono debe tener entre 7 y 15 caracteres.'),

    body('nombre2')
        .optional({ nullable: true })
        .isString().withMessage('El segundo nombre debe ser una cadena de texto.'),

    body('apellido2')
        .optional({ nullable: true })
        .isString().withMessage('El segundo apellido debe ser una cadena de texto.'),

    body('centro_id')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El centro ID debe ser un número entero positivo.'),
    
    body('fecha_comienzo')
        .optional({ nullable: true })
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (YYYY-MM-DD).')
        .toDate()
        .custom((value, { req }) => {
            if (value && value < new Date(new Date().setHours(0, 0, 0, 0))) {
                throw new Error('La fecha de inicio no puede ser anterior a hoy.');
            }
            return true;
        }),

    // Validaciones para Apoderado (JSONB)
    body('apoderado')
        .optional({ nullable: true }), // Permite que el objeto apoderado no se envíe

    // Convierte el valor booleano (si existe)
    body('apoderado.activo').optional().toBoolean(),

    // Validación de nombre: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.nombre')
        .if(body('apoderado.activo').equals(true))
        .notEmpty().withMessage('El nombre del apoderado es obligatorio si el apoderado está activo')
        .isString().withMessage('El nombre del apoderado debe ser texto')
        .isLength({ max: 100 }).withMessage('Máximo 100 caracteres para el nombre del apoderado')
        .bail(),

    // Validación del documento: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.documento')
        .if(body('apoderado.activo').equals(true))
        .notEmpty().withMessage('El documento del apoderado es obligatorio si el apoderado está activo')
        .isString().withMessage('El documento del apoderado debe ser texto')
        .isLength({ max: 20 }).withMessage('Máximo 20 caracteres para el documento del apoderado')
        .bail(),

    // Validación de la fecha: SOLO si 'apoderado.activo' es TRUE
    body('apoderado.fecha_nacimiento')
        .if(body('apoderado.activo').equals(true))
        .notEmpty().withMessage('La fecha de nacimiento del apoderado es obligatoria si el apoderado está activo')
        .isISO8601().withMessage('La fecha de nacimiento del apoderado debe ser válida (YYYY-MM-DD)')
        .toDate()
        .custom(value => {
            if (value && value > new Date()) {
                throw new Error('La fecha de nacimiento del apoderado no puede ser en el futuro');
            }
            return true;
        }),

    // 🛑 MIDDLEWARE DE REGLA DE NEGOCIO: Valida que el centro_id exista y esté activo (estado = true)
    validateCentroActivo,

    // Middleware de manejo de errores
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

