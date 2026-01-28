const pool = require('../config/database');
const AppError = require('../utils/appError');

// 1. OBTENER por ID (getFeeById) - NUEVA FUNCIÓN
exports.getFeeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('SELECT * FROM valor_cuotas WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            // Si no se encuentra la cuota, lanzamos un error 404
            return next(new AppError('Cuota no encontrada con el ID proporcionado.', 404));
        }
        
        // Devolvemos la primera (y única) fila
        res.json(result.rows[0]);
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};

exports.createFee = async (req, res, next) => {
    try {
        const { anio, importe } = req.body;

        // Validamos que el año sea razonable (no menor al inicio del sistema ni muy a futuro)
        const anioActual = new Date().getFullYear();
        if (anio < 2020 || anio > anioActual + 1) {
            return next(new AppError(`El año ${anio} no es válido para el registro.`, 400));
        }

        const result = await pool.query(
            'INSERT INTO valor_cuotas (anio, importe) VALUES ($1, $2) RETURNING *',
            [anio, importe]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { 
            return next(new AppError(`Ya existe un valor de cuota configurado para el año ${req.body.anio}.`, 409));
        }
        next(new AppError('No se pudo crear el valor de la cuota.', 500));
    }
};

// Update fee
exports.updateFee = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Usamos anio e importe para coincidir con la BD (valor_cuotas)
        const { anio, importe } = req.body; 

        const result = await pool.query(
            'UPDATE valor_cuotas SET anio = $1, importe = $2 WHERE id = $3 RETURNING *',
            [anio, importe, id] // Se pasan las variables con nombre en español
        );
        if (result.rows.length === 0) return next(new AppError('Cuota no encontrada', 404));
        res.json(result.rows[0]);
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};

exports.deleteFee = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 🔍 MEJORA DE SEGURIDAD: 
        // Antes de borrar, verificamos si hay expedientes que usen este año.
        // Asumiendo que tus expedientes tienen una columna 'anio' o similar.
        const usoQuery = 'SELECT id_expediente FROM expedientes WHERE EXTRACT(YEAR FROM fecha_pago) = (SELECT anio FROM valor_cuotas WHERE id = $1) LIMIT 1';
        const enUso = await pool.query(usoQuery, [id]);

        if (enUso.rows.length > 0) {
            return next(new AppError('No se puede eliminar este valor porque ya existen expedientes/pagos asociados a este año.', 400));
        }

        const result = await pool.query('DELETE FROM valor_cuotas WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return next(new AppError('Registro no encontrado.', 404));
        
        res.json({ message: 'Valor anual eliminado con éxito.' });
    } catch (err) {
        next(new AppError('Error al intentar eliminar el registro.', 500));
    }
};

// List fees (no requiere cambios)
exports.listFees = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM valor_cuotas ORDER BY anio DESC');
        res.json(result.rows);
    } catch (err) {
        next(new AppError(err.message, 500));
    }
};

// Obtener el valor de cuota por año (útil para cálculos automáticos)
exports.getFeeByYear = async (req, res, next) => {
    try {
        const { anio } = req.params;
        const result = await pool.query('SELECT importe FROM valor_cuotas WHERE anio = $1', [anio]);
        
        if (result.rows.length === 0) {
            return next(new AppError(`No se ha definido un valor de cuota para el año ${anio}`, 404));
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        next(new AppError('Error al consultar el valor anual.', 500));
    }
};

