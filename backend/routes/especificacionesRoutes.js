const express = require('express');
const router = express.Router();
const especificacionesController = require('../controllers/especificacionesController');

// Define la ruta GET para obtener todos los especificaciones
// Cuando se haga una petición GET a /api/especificaciones (ver App.js),
// se ejecutará la función getAllEspecificaciones del controlador.
router.get('/', especificacionesController.getAllEspecificaciones);

// Ruta para obtener una especificación por ID
router.get('/:id', especificacionesController.getEspecificacionById);

module.exports = router;