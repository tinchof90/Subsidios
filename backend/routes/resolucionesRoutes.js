// routes/resolucionesRoutes.js

const express = require('express');
const router = express.Router();
const resolucionesController = require('../controllers/resolucionesController');

//Buscar resoluciones por rango de fechas
router.get('/buscar', resolucionesController.searchResolucionesByFecha);

//Obtener resoluciones por ID de Expediente
// Esta es la ruta para listar las resoluciones de un expediente específico.
// Nota: La colocamos antes de '/:id' para que no se confunda con un ID de resolución.
router.get('/expediente/:expedienteId', resolucionesController.getResolucionesByExpedienteId); // <-- ¡Nueva ruta!

// Rutas GET existentes
router.get('/', resolucionesController.getAllResoluciones);
router.get('/:id', resolucionesController.getResolucionById);

// Resto de las rutas (POST, PUT, DELETE)
// Si vas a crear resoluciones desde el ExpedienteForm, es buena idea usar el expediente_id en la URL
// para que sea más RESTful y claro.
router.post('/expediente/:expedienteId',
    resolucionesController.validateCreateResolucion,
    resolucionesController.createResolucion
); // <-- Ruta de creación ajustada

router.put('/:id', resolucionesController.validateUpdateResolucion, resolucionesController.updateResolucion);
router.delete('/:id', resolucionesController.deleteResolucion);

module.exports = router;