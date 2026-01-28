// utils/errorHandler.js
const AppError = require('./appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400); // 400 Bad Request
};

const handleDuplicateFieldsDB = err => {
  const value = err.detail.match(/\(([^)]+)\)/)[1]; // Extrae el valor duplicado
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400); // 400 Bad Request
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400); // 400 Bad Request
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Errores operacionales, de confianza: enviar mensaje al cliente
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

  // Errores de programación o desconocidos: no filtrar detalles del error
  } else {
    // 1) Log the error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Algo salió muy mal!'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // En un entorno de desarrollo, enviamos todos los detalles del error
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // En un entorno de producción, solo enviamos errores operacionales
    let error = { ...err };
    error.message = err.message; // Para asegurar que el mensaje del error original se copie

    // Aquí puedes añadir más manejo de errores específicos de PostgreSQL si es necesario
    // Por ejemplo, para claves únicas duplicadas (err.code '23505')
    // Los errores de pg-promise o pg-pool a veces tienen un 'code' de PostgreSQL
    if (error.code === '23502') { // error not_null_violation
        error = new AppError(`Campo requerido no puede ser nulo: ${error.detail}`, 400);
    }
    if (error.code === '23505') { // unique_violation
        // Extrae el valor del campo duplicado de la cadena de error detallada
        const match = error.detail.match(/Key \((.+?)\)=\((.+?)\) already exists./);
        let msg = 'Valor duplicado. Ya existe un registro con este valor.';
        if (match && match[1] && match[2]) {
            msg = `El valor '${match[2]}' para el campo '${match[1]}' ya existe. Por favor use otro.`;
        }
        error = new AppError(msg, 400);
    }
    if (error.code === '23503') { // foreign_key_violation
        const match = error.detail.match(/Key \((.+?)\)=\((.+?)\) is not present in table "(.+?)".$/);
        let msg = 'Violación de clave foránea. El recurso relacionado no existe.';
        if (match && match[1] && match[2] && match[3]) {
            msg = `El ${match[1]} con valor '${match[2]}' no existe en la tabla ${match[3]}.`;
        }
        error = new AppError(msg, 400);
    }
    // Puedes agregar más códigos de error de PostgreSQL según sea necesario
    // Consulta la documentación de códigos de error de PostgreSQL (SQLSTATE)

    sendErrorProd(error, res);
  }
};