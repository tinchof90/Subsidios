const express = require('express');
const router = express.Router();
// Asegúrate de que la ruta a tu controlador de estados de resolución sea correcta
const estadosResController = require('../controllers/estadosResController'); 

// Define la ruta GET para obtener todos los estados de resolución
// Cuando se haga una petición GET a /api/estadosRes (ver App.js),
// se ejecutará la función getAllEstadosResolucion del controlador.
router.get('/', estadosResController.getAllEstadosResolucion);

module.exports = router;