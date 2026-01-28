// routes/valorCuotasRoutes.js

const express = require('express');
const router = express.Router();
const valorCuotasController = require('../controllers/valorCuotasController');
const { param, validationResult } = require('express-validator');
const AppError = require('../utils/appError');

// Middleware de validación para el ID en los parámetros de ruta
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

// 1. GET Listar todos (general)
router.get('/', valorCuotasController.listFees);

// 2. GET Obtener por ID (necesita un controlador si no existe)
router.get('/:id', validateId, valorCuotasController.getFeeById); // <-- Esta función debe existir en el controlador

// 3. POST Crear nuevo valor de cuota
// Aquí podrías añadir un middleware de validación más robusto (e.g., para anio e importe)
router.post('/', valorCuotasController.createFee);

// 4. PUT Actualizar por ID
router.put('/:id', validateId, valorCuotasController.updateFee);

// 5. DELETE Eliminar por ID
router.delete('/:id', validateId, valorCuotasController.deleteFee);

router.get('/anio/:anio', valorCuotasController.getFeeByYear);

module.exports = router;
