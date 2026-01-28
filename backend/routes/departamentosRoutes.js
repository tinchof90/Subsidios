const express = require('express');
const router = express.Router();
// Asegúrate de que la ruta a tu controlador de departamentos sea correcta
const departamentosController = require('../controllers/departamentosController'); 

// Define la ruta GET para obtener todos los departamentos
// Cuando se haga una petición GET a /api/departamentos (ver App.js),
// se ejecutará la función getAllDepartamentos del controlador.
router.get('/', departamentosController.getAllDepartamentos);

module.exports = router;