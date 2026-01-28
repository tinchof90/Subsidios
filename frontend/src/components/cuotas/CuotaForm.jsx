// src/components/cuotas/CuotaForm.jsx (Con React Hook Form y Yup)
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form'; // ⬅️ React Hook Form
import { yupResolver } from '@hookform/resolvers/yup'; // ⬅️ Resolver de Yup
import * as yup from 'yup'; // ⬅️ Yup para el esquema
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import "../Form.css";
import { API_BASE_URL } from '../../config'; // Ajusta los ../ según la carpeta

const BASE_URL = `${API_BASE_URL}/valorCuotas`;

// Definición del esquema de validación dentro del archivo, o importado
const cuotaSchema = yup.object().shape({
    anio: yup
        .number()
        .typeError('El Año debe ser un número')
        .integer('El Año debe ser un número entero')
        .min(2000, 'El Año debe ser posterior o igual a 2000')
        .max(2100, 'El Año no puede ser mayor a 2100')
        .required('El Año es obligatorio')
        .transform((value, originalValue) => (originalValue === '' ? undefined : value)),

    importe: yup
        .number()
        .typeError('El Importe debe ser un número')
        .positive('El Importe debe ser un valor positivo')
        .required('El Importe es obligatorio')
        .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
});

/**
 * Componente de formulario para crear (POST) o editar (PUT) un valor de cuota.
 */
function CuotaForm({ cuotaToEdit, onCuotaSaved, onClose }) {
    const [serverError, setServerError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Inicialización de React Hook Form
    const { 
        register, 
        handleSubmit, 
        formState: { errors }, 
        reset 
    } = useForm({
        // Usamos yupResolver para conectar Yup con RHF
        resolver: yupResolver(cuotaSchema),
        // Valores por defecto: si estamos editando, usamos los datos de la cuota
        defaultValues: {
            // Convertimos a string o usamos cadena vacía para compatibilidad con inputs
            anio: cuotaToEdit ? cuotaToEdit.anio : '', 
            importe: cuotaToEdit ? cuotaToEdit.importe : '',
        },
    });

    // Usamos useEffect para resetear el formulario cuando se cambia de modo (Crear <-> Editar)
    useEffect(() => {
        // RHF necesita que le digamos explícitamente qué valores usar si cambian las props
        reset({
            anio: cuotaToEdit ? cuotaToEdit.anio : '', 
            importe: cuotaToEdit ? cuotaToEdit.importe : '',
        });
        setServerError(null); // Limpiamos errores del servidor al cambiar de modo
    }, [cuotaToEdit, reset]);

    // Función de Envío (maneja POST y PUT)
    const onSubmit = async (data) => {
        setServerError(null);
        setIsSubmitting(true);
        
        // RHF ya validó el formato, ahora realizamos la petición HTTP
        const dataToSend = {
            anio: parseInt(data.anio, 10),
            importe: parseFloat(data.importe)
        };

        try {
            let url = BASE_URL;
            let method = axios.post;

            if (cuotaToEdit) {
                // Lógica de EDICIÓN (PUT)
                url = `${BASE_URL}/${cuotaToEdit.id}`;
                method = axios.put;
            } 
            
            const response = await method(url, dataToSend);
            
            // Llamamos al callback exitoso
            onCuotaSaved(response.data); 

        } catch (error) {
            console.error("Error al guardar la cuota:", error.response?.data || error);
            // Mostrar mensaje de error del backend
            const errorMessage = error.response?.data?.message || 'Error desconocido al guardar la cuota.';
            setServerError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = cuotaToEdit ? `Editar Cuota: ID ${cuotaToEdit.id}` : 'Crear Nuevo Valor de Cuota';

    return (
        <div className="form-card">
            
            {/* Mensaje de Error del Servidor: Usa un div de alerta para mejor estilo */}
            {serverError && (
                <div className="alert-error">
                    <p>{serverError}</p>
                </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="form">
                
                {/* NUEVO CONTENEDOR PARA LA FILA DE DOS COLUMNAS */}
                <div className="form-row-2-cols"> 
                    
                    {/* Campo Año */}
                    <div className="form-group">
                        <label htmlFor="anio">Año:</label>
                        <input 
                            id="anio"
                            type="number"
                            {...register('anio', { 
                                required: 'El año es obligatorio'
                            })} 
                            disabled={isSubmitting || !!cuotaToEdit}
                            className={`form-input ${!!cuotaToEdit ? 'input-disabled-edit' : ''}`}
                        />
                        {errors.anio && <p className="form-error-message">{errors.anio.message}</p>}
                    </div>

                    {/* Campo Importe */}
                    <div className="form-group">
                        <label htmlFor="importe">Importe ($):</label>
                        <input 
                            id="importe"
                            type="number"
                            step="0.01" 
                            {...register('importe', {
                                required: 'El importe es obligatorio',
                                min: { value: 0.01, message: 'El importe debe ser mayor a 0' }
                            })}
                            disabled={isSubmitting}
                            className="form-input"
                        />
                        {errors.importe && <p className="form-error-message">{errors.importe.message}</p>}
                    </div>

                </div>
                
                {/* Botones de Acción */}
                <div className="form-actions">     
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onClose} 
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Guardando...' : cuotaToEdit ? 'Actualizar' : 'Guardar'}
                    </button>
                </div>

            </form>
        </div>
    );
}

export default CuotaForm;