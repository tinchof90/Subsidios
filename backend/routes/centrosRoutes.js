const express = require('express');
const router = express.Router();
const centrosController = require('../controllers/centrosController'); // Importa el controlador
const pacientesController = require('../controllers/pacientesController'); // Necesario para la ruta de pacientes

// Rutas para Centros

// 1. Rutas GET para obtener centros (generales y por ID)
router.get('/', centrosController.getAllCentros);
router.get('/:id', centrosController.getCentroById);

// 2. Ruta para obtener todos los pacientes de un centro específico
// Esta ruta es más específica y se resuelve correctamente antes de la ruta genérica ':id' si fuera necesario.
router.get('/:id/pacientes', pacientesController.getPacientesByCentroId);

// 3. Rutas de modificación (POST, PUT, DELETE) para centros, con validaciones
router.post('/', centrosController.validateCreateCentro, centrosController.createCentro);
router.put('/:id', centrosController.validateUpdateCentro, centrosController.updateCentro);
router.delete('/:id', centrosController.deleteCentro);

module.exports = router;