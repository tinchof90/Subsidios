const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const multer = require('multer'); // <<--- Añade esta importación para Multer
const path = require('path');     // <<--- Añade esta importación para Path

// Importar las rutas
//const pacientesRoutes = require('./routes/pacientesRoutes');
const expedientesRoutes = require('./routes/expedientesRoutes');
const resolucionesRoutes = require('./routes/resolucionesRoutes');
const centrosRoutes = require('./routes/centrosRoutes');
const departamentosRoutes = require('./routes/departamentosRoutes');
const especificacionesRoutes = require('./routes/especificacionesRoutes');
const estadosResRoutes = require('./routes/estadosResRoutes');
const tiposItemResRoutes = require('./routes/tiposItemResRoutes');
const valorCuotasRoutes = require('./routes/valorCuotasRoutes');
console.log('Objeto de rutas de cuotas:', valorCuotasRoutes);

// Importar el manejador de errores y la clase AppError
const AppError = require('./utils/appError');
const globalErrorHandler = require('./utils/errorHandler');

// Importa el job de cuotas de resolución
const { updateMonthlyResolutionStatus } = require('./jobs/resolutionScheduler');

// --- Inicialización de Express ---
const app = express();
const port = 3000;

// --- Configuración de CORS ---
// Es CRUCIAL que este middleware esté AQUÍ, antes de app.use(express.json()) y tus rutas
app.use(cors({
    origin: 'http://localhost:5173' // Permite solicitudes SOLAMENTE desde tu frontend de Vite
}));
// --- Fin de la configuración de CORS ---

// Middleware para parsear JSON en las peticiones
app.use(express.json());
// Middleware para parsear datos de formularios (necesario para Multer en algunos casos)
app.use(express.urlencoded({ extended: true }));

// <<--- NUEVO: Servir archivos estáticos desde la carpeta 'uploads'
// Esto hace que los archivos subidos a 'uploads/' sean accesibles vía http://localhost:3000/uploads/nombre_del_archivo.ext
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// <<--- FIN NUEVO

// <<--- NUEVO: Configuración de Almacenamiento de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // La carpeta 'uploads/' debe existir en la raíz de tu proyecto de backend
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Genera un nombre de archivo único para evitar conflictos:
    // campoDelFormulario-timestamp-numeroAleatorio.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Crea una instancia de Multer con la configuración de almacenamiento
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limita el tamaño del archivo a 10MB (ajusta si es necesario)
  fileFilter: (req, file, cb) => {
    // Opcional: Filtra los tipos de archivo permitidos para seguridad
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/; // Regex de tipos permitidos
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase()); // Verifica extensión
    const mimetype = allowedTypes.test(file.mimetype); // Verifica tipo MIME

    if (extname && mimetype) {
      return cb(null, true); // Permite el archivo
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes, PDF y documentos.'));
    }
  }
});

// Importa las rutas de pacientes AHORA y les pasas la instancia 'upload'
// Esto es importante porque las rutas de pacientes necesitarán 'upload' para manejar los archivos
const pacientesRoutes = require('./routes/pacientesRoutes')(upload);

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.send('¡Hola desde el backend de Pensiones!');
});

// Usar las rutas de la API
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/resoluciones', resolucionesRoutes);
app.use('/api/centros', centrosRoutes);
app.use('/api/departamentos', departamentosRoutes); 
app.use('/api/especificaciones', especificacionesRoutes); 
app.use('/api/estadosRes', estadosResRoutes);
app.use('/api/tiposItemResolucion', tiposItemResRoutes);
app.use('/api/valorCuotas', valorCuotasRoutes);

// Ruta de prueba de conexión a la base de datos (la conservamos por ahora)
const pool = require('./config/database');
app.get('/api/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        const currentTime = result.rows[0].now;
        client.release();
        res.json({ message: 'Conexión a la base de datos exitosa', currentTime });
    } catch (error) {
        console.error('Error al conectar a la base de datos', error);
        res.status(500).json({ error: 'Error al conectar a la base de datos', details: error.message });
    }
});

// Manejo de rutas no encontradas (404)
app.all('*', (req, res, next) => {
    next(new AppError(`No se puede encontrar ${req.originalUrl} en este servidor!`, 404));
});

// <<--- NUEVO: Middleware para manejo de errores de Multer (colócalo ANTES del globalErrorHandler)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.' });
    }
    // Puedes manejar otros errores específicos de Multer aquí si es necesario
    return res.status(400).json({ message: err.message }); // Para otros errores Multer
  }
  // Si el error no es de Multer, pásalo al siguiente middleware de errores
  next(err);
});
// <<--- FIN NUEVO: Middleware Multer

// Middleware global de manejo de errores (el último en la cadena)
app.use(globalErrorHandler);

/*Configuración y Ejecución del Cron Job - La expresión '0 0 1 * *' significa:
0 en el minuto (a la medianoche)
0 en la hora (a la medianoche)
1 en el día del mes (el primer día de cada mes)
* en el mes (cada mes)
* en el día de la semana (cualquier día de la semana)*/

cron.schedule('0 0 1 * *', () => {
    updateMonthlyResolutionStatus();
}, {
    timezone: "America/Montevideo" // ¡IMPORTANTE! Ajusta a tu zona horaria para asegurar que se ejecute a la hora correcta
});

// Opcional: Ejecutar el job una vez al iniciar el servidor para pruebas rápidas.
// ¡Coméntalo o quítalo en un entorno de producción para evitar ejecuciones inesperadas!
updateMonthlyResolutionStatus();


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});