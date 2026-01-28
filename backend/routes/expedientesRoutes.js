// routes/expedientesRoutes.js (CORREGIDO)

const express = require('express');
const router = express.Router();
const expedientesController = require('../controllers/expedientesController');

// 1. Rutas MÁS ESPECÍFICAS deben ir PRIMERO
router.get('/documento-paciente/:documento', expedientesController.getExpedientesByPacienteDocumento); 
router.get('/:id/resoluciones', expedientesController.getResolucionesByExpedienteId); // Mover esta ARRIBA

// 2. Ruta para LISTAR TODOS
router.get('/', expedientesController.getAllExpedientes);

// 3. Rutas GENERALES con parámetros deben ir DE ÚLTIMAS
router.get('/:id', expedientesController.getExpedienteById); 

// Resto de las rutas (POST, PUT, DELETE) - El orden es menos crítico aquí, pero se mantiene:
router.post('/', expedientesController.validateCreateExpediente, expedientesController.createExpediente);
router.put('/:id', expedientesController.validateUpdateExpediente, expedientesController.updateExpediente);
router.delete('/:id', expedientesController.deleteExpediente);


module.exports = router;