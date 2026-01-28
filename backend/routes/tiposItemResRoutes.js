const express = require('express');
const router = express.Router();
// Asegúrate de que la ruta a tu controlador de Tipos de Item sea correcta
const tiposItemResController = require('../controllers/tiposItemResController'); 

// Define la ruta GET para obtener todos los Tipos de Item
// Cuando se haga una petición GET a /api/tiposItemResolucion (ver App.js),
// se ejecutará la función getAllTiposItemRes  del controlador.
router.get('/', tiposItemResController.getAllTiposItemRes);

module.exports = router;