const express = require('express');
// No necesitamos importar Multer aquí porque lo recibiremos como argumento

// Importa todas las funciones y los middlewares de validación del controlador
const pacientesController = require('../controllers/pacientesController');
const { param } = require('express-validator');
const AppError = require('../utils/appError');
const { validationResult } = require('express-validator');

// Middleware de validación para el ID en los parámetros de ruta (reutilizable)
const validateId = [
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero válido.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new AppError('El ID proporcionado no es válido.', 400));
        }
        next();
    }
];

// Middleware de validación para el documento en los parámetros de ruta
const validateDocumentoParam = [
    param('documento')
        .notEmpty().withMessage('El documento es obligatorio.')
        .isString().withMessage('El documento debe ser una cadena de texto.')
        .isLength({ min: 7, max: 8 }).withMessage('El documento debe tener entre 7 y 8 caracteres.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(err => err.msg);
            return next(new AppError(`Errores de validación en el documento: ${errorMessages.join(' ')}`, 400));
        }
        next();
    }
];

// =======================================================
// Rutas de Pacientes (AHORA EXPORTADAS COMO FUNCIÓN)
// =======================================================

// Exporta una función que recibe la instancia 'upload' de Multer
module.exports = (upload) => { // <<--- MODIFICACIÓN CLAVE: ENVUELVE TODO EN UNA FUNCIÓN Y RECIBE 'upload'
    const router = express.Router(); // <<--- El router se crea DENTRO de la función

    // GET todas los pacientes (con paginación)
    router.get('/', pacientesController.getPacientes);    

    // GET paciente por documento
    router.get('/documento/:documento', validateDocumentoParam, pacientesController.getPacienteByDocumento);

    // GET paciente por ID
    router.get('/:id', validateId, pacientesController.getPacienteById);

    // GET expedientes por ID de paciente
    router.get('/:id/expedientes', validateId, pacientesController.getExpedientesByPacienteId);

    // GET pacientes por ID de centro
    router.get('/centro/:id/pacientes', validateId, pacientesController.getPacientesByCentroId);

    // POST crear nuevo paciente
    router.post('/', pacientesController.validateCreatePaciente, pacientesController.createPaciente);

    // PUT actualizar paciente por ID
    router.put('/:id', validateId, pacientesController.validateUpdatePaciente, pacientesController.updatePaciente);

    // DELETE paciente por ID
    router.delete('/:id', validateId, pacientesController.deletePaciente);


    // <<--- NUEVAS RUTAS PARA ARCHIVOS DEL PACIENTE ---
    // POST para subir uno o más archivos a un paciente específico
    // 'archivos' debe coincidir con el 'name' del input file en tu frontend (en PacienteForm.jsx)
    router.post('/:paciente_id/archivos', upload.array('archivos', 5), pacientesController.uploadPacienteFiles); // Permite hasta 5 archivos

    // GET para obtener todos los archivos de un paciente específico
    router.get('/:paciente_id/archivos', pacientesController.getPacienteFiles);

    // DELETE para eliminar un archivo específico de un paciente
    // id_paciente es el ID del paciente, id_archivo es el ID del registro en la tabla archivos_paciente
    router.delete('/:paciente_id/archivos/:id_archivo', pacientesController.deletePacienteFile);
    // <<--- FIN NUEVAS RUTAS ---


    return router; // <<--- Retorna el router configurado
};