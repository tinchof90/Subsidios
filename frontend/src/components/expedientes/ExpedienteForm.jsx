import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AsyncSelect from 'react-select/async';
import Swal from 'sweetalert2'; 
import '../Form.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { API_BASE_URL } from '../../config';
import ResolucionesTable from '../resoluciones/ResolucionesTable';

// --- ESQUEMA DE VALIDACIÓN CON YUP para Expedientes ---
const expedienteSchema = yup.object().shape({
    fecha_inicio: yup.string()
        .required('La fecha de inicio es obligatoria.')
        .matches(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (AAAA-MM-DD).'),
    rnt: yup.string()
        .required('El RNT es obligatorio.')
        .min(3, 'El RNT debe tener al menos 3 caracteres.')
        .max(50, 'El RNT no debe exceder los 50 caracteres.'),
    caso_nuevo: yup.boolean()
        .required('Debe indicar si es un caso nuevo.')
        .typeError('El valor de "Caso Nuevo" debe ser verdadero o falso.'),
    observaciones: yup.string()
        .max(500, 'Las observaciones no deben exceder los 500 caracteres.')
        .nullable(),
    paciente_id: yup.number()
        .required('Debe seleccionar un paciente.')
        .positive('Seleccione un paciente válido.')
        .integer('El ID del paciente debe ser un número entero.')
        .typeError('Seleccione un paciente válido.'),
    especificacion_id: yup.number()
        .required('Debe seleccionar una especificación.')
        .positive('Seleccione una especificación válida.')
        .integer('El ID de la especificación debe ser un número entero.')
        .typeError('Seleccione una especificación válida.'),
});

function ExpedienteForm({ 
    expedienteToEdit, 
    onExpedienteCreated, 
    onExpedienteUpdated, 
    onClose, 
    onAddNewResolution,
    onEditResolution,
}) {
    const [especificaciones, setEspecificaciones] = useState([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [formError, setFormError] = useState(null);

    // ESTADOS DE RESOLUCIÓN LOCALES
    const [resoluciones, setResoluciones] = useState([]);
    const [loadingResoluciones, setLoadingResoluciones] = useState(false);

    const [currentExpedienteId, setCurrentExpedienteId] = useState(expedienteToEdit?.id_expediente || null);
            
    const isEditing = expedienteToEdit !== null;

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: yupResolver(expedienteSchema),
        defaultValues: {
            fecha_inicio: '',
            rnt: '',
            caso_nuevo: false,
            observaciones: '',
            paciente_id: '',
            especificacion_id: ''
        }
    });

    const [selectedPacienteOption, setSelectedPacienteOption] = useState(null);

    // --- FUNCIÓN PARA CARGAR RESOLUCIONES DEL EXPEDIENTE ACTUAL ---
    const fetchResoluciones = useCallback(async (expedienteId) => {
        if (!expedienteId) {
            setResoluciones([]);
            return;
        }
        setLoadingResoluciones(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/expedientes/${expedienteId}/resoluciones`);
            setResoluciones(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (error) {
            console.error('Error al cargar resoluciones:', error);
            setResoluciones([]);
        } finally {
            setLoadingResoluciones(false);
        }
    }, [API_BASE_URL]);

    // --- EFECTO PARA CARGAR LISTAS DEPENDIENTES (especificaciones) ---
    useEffect(() => {
        const fetchLists = async () => {
            setLoadingLists(true);
            try {
                const especificacionesRes = await axios.get(`${API_BASE_URL}/especificaciones`);
                setEspecificaciones(Array.isArray(especificacionesRes.data.data) ? especificacionesRes.data.data : []);
                setFormError(null);
            } catch (err) {
                console.error('Error al cargar listas para el formulario:', err.response?.data || err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Carga',
                    text: `No se pudieron cargar las especificaciones: ${err.response?.data?.message || err.message}`,
                });
                setFormError('Error al cargar las especificaciones para el formulario.');
            } finally {
                setLoadingLists(false);
            }
        };
        fetchLists();
    }, []);

    // --- EFECTO PARA CARGAR DATOS DEL EXPEDIENTE ---
    useEffect(() => {
        if (isEditing && expedienteToEdit) {
            const id = expedienteToEdit.id_expediente;
            const formattedDate = expedienteToEdit.fecha_inicio ? new Date(expedienteToEdit.fecha_inicio).toISOString().split('T')[0] : '';

            reset({
                fecha_inicio: formattedDate,
                rnt: expedienteToEdit.rnt || '',
                caso_nuevo: expedienteToEdit.caso_nuevo || false,
                observaciones: expedienteToEdit.observaciones || '',
                especificacion_id: String(expedienteToEdit.especificacion_id) || ''
            });

            // Configurar la opción del paciente seleccionado
            if (expedienteToEdit.paciente_id) {
                setSelectedPacienteOption({
                    value: expedienteToEdit.paciente_id,
                    label: `${expedienteToEdit.paciente_documento || ''} - ${expedienteToEdit.paciente_apellido1 || ''} ${expedienteToEdit.paciente_apellido2 || ''}, ${expedienteToEdit.paciente_nombre1 || ''} ${expedienteToEdit.paciente_nombre2 || ''}`
                });
                setValue('paciente_id', expedienteToEdit.paciente_id);
            } else {
                setSelectedPacienteOption(null);
                setValue('paciente_id', '');
            }
            // Establecer ID y cargar Resoluciones al editar
            setCurrentExpedienteId(id);
            fetchResoluciones(id);
        } else if (!isEditing) {
            reset({
                fecha_inicio: '', rnt: '', caso_nuevo: false, observaciones: '', paciente_id: '', especificacion_id: ''
            });
            setSelectedPacienteOption(null);
            setCurrentExpedienteId(null);
            setResoluciones([]); // Limpiar resoluciones al crear uno nuevo
        }
    }, [expedienteToEdit, isEditing, reset, setValue, fetchResoluciones]);

    // --- FUNCIÓN PARA CARGA ASÍNCRONA EN EL SELECT (PACIENTES) ---
    const loadPacienteOptions = useCallback(async (inputValue) => {
        try {
            // Si no hay texto, enviamos una cadena vacía o simplemente llamamos al endpoint
            const term = inputValue || '';
            const response = await axios.get(`${API_BASE_URL}/pacientes`, {
                params: { searchTerm: term }
            });

            const pacientesData = Array.isArray(response.data.data) ? response.data.data : [];

            return pacientesData.map(paciente => ({
                value: paciente.id_paciente,
                label: `${paciente.documento} - ${paciente.apellido1} ${paciente.apellido2 || ''}, ${paciente.nombre1} ${paciente.nombre2 || ''}`
            }));
        } catch (error) {
            console.error("Error al buscar pacientes:", error);
            return [];
        }
    }, [API_BASE_URL]); // Importante incluir la base URL aquí

    // --- MANEJADORES PARA EL FORMULARIO PRINCIPAL DEL EXPEDIENTE ---
    const onSubmitExpediente = async (data) => {
        setFormError(null);
        const dataToSend = {
            ...data,
            paciente_id: Number(data.paciente_id),
            especificacion_id: Number(data.especificacion_id),
            observaciones: data.observaciones === '' ? null : data.observaciones
        };

        try {
            let response;
            // 💡 Usamos la variable centralizada API_BASE_URL en lugar del texto fijo
            if (isEditing) {
                response = await axios.put(`${API_BASE_URL}/expedientes/${expedienteToEdit.id_expediente}`, dataToSend);
                onExpedienteUpdated(response.data);
                Swal.fire('¡Actualizado!', 'Expediente actualizado con éxito.', 'success');
            } else {
                response = await axios.post(`${API_BASE_URL}/expedientes`, dataToSend);
                onExpedienteCreated(response.data);
                
                // Importante: Extraer el ID correctamente según cómo lo devuelva tu backend
                // Si el backend devuelve { success: true, id_expediente: ... }
                const nuevoExpediente = response.data.data; 
                onExpedienteCreated(response.data);
                setCurrentExpedienteId(nuevoExpediente.id_expediente);

                Swal.fire('¡Creado!', 'Expediente creado con éxito. Puede agregar resoluciones ahora.', 'success');
            }
        } catch (err) {
            console.error('Error al guardar expediente:', err.response?.data || err);
            const errorMessage = err.response?.data?.message || err.message;
            setFormError(errorMessage);
            Swal.fire({
                icon: 'error',
                title: 'Error al guardar',
                text: `Hubo un problema al guardar el expediente: ${errorMessage}`,
            });
        }
    };
        
    // --- MANEJADOR DE ELIMINACIÓN DE RESOLUCIÓN (Local: solo la confirmación) ---
    const handleDeleteResolution = (id_resolucion) => {

        // 🛑 AGREGAR ESTA LÍNEA DE DIAGNÓSTICO
        console.log('Intentando eliminar resolución con ID:', id_resolucion);

        if (!id_resolucion || id_resolucion <= 0) {
            Swal.fire('Error de ID', 'El ID de la resolución es inválido o nulo.', 'error');
            return;
        }

        Swal.fire({
            title: 'Confirmar Eliminación',
            text: "¿Estás seguro de que deseas eliminar esta resolución?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then( async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE_URL}/resoluciones/${id_resolucion}`);
                    Swal.fire('Eliminada!', 'La resolución ha sido eliminada.', 'success');
                    fetchResoluciones(currentExpedienteId); // RECARGA LOCALMENTE la lista
                } catch (error) {
                    console.error('Error al eliminar resolución:', error.response?.data || error);
                    Swal.fire('Error', 'No se pudo eliminar la resolución.', 'error');
                }
            }
        });
    };

    // --- MANEJADOR PARA ABRIR EL FORMULARIO DE RESOLUCIÓN EN MODO CREACIÓN (DELEGACIÓN) ---
    const handleAddResolutionClick = () => {
        if (!currentExpedienteId) {
            Swal.fire({
                icon: 'warning',
                title: 'Advertencia',
                text: 'Por favor, primero guarde el expediente para agregar resoluciones.',
            });
            return;
        }
        // onAddNewResolution es la prop que DELEGA la apertura del form al Container
        onAddNewResolution(currentExpedienteId);
    };

    // --- RENDERIZADO PRINCIPAL ---
    if (loadingLists) {
        return (
            <div className="form-loading">
                <p>Cargando datos del formulario...</p>
            </div>
        );
    }

    return (
        <div className="form-container">
            <h2 className="form-title">{isEditing ? 'Editar Expediente' : 'Crear Expediente'}</h2>
            <form onSubmit={handleSubmit(onSubmitExpediente)} className='form'>                

                {/* Campo Fecha de Inicio */}
                <div className="form-group">
                    <label htmlFor="fecha_inicio">Fecha de Inicio del tratamiento *</label>
                    <input
                        type="date" // <--- ¡Esto es lo que funciona bien en PacienteForm!
                        id="fecha_inicio"
                        {...register('fecha_inicio')}
                        className={errors.fecha_inicio ? 'form-input input-error' : 'form-input'}
                    />
                    {/* CLASE CORREGIDA: form-error */}
                    {errors.fecha_inicio && <p className="form-error">{errors.fecha_inicio.message}</p>}
                </div>

                {/* Campo RNT */}
                <div className="form-group">
                    <label htmlFor="rnt">RNT *</label>
                    <input
                        id="rnt"
                        type="text"
                        {...register('rnt')}
                        className={errors.rnt ? 'form-input input-error' : 'form-input'} 
                    />
                    {/* CLASE CORREGIDA: form-error */}
                    {errors.rnt && <p className="form-error">{errors.rnt.message}</p>}
                </div>

                {/* Campo Caso Nuevo (Checkbox) */}
                <div className="form-group form-group-checkbox"> 
                    <label htmlFor="caso_nuevo">Caso Nuevo</label>
                    <input
                        id="caso_nuevo"
                        type="checkbox"
                        {...register('caso_nuevo')}
                        className="form-checkbox" 
                    />
                    {/* CLASE CORREGIDA: form-error */}
                    {errors.caso_nuevo && <p className="form-error">{errors.caso_nuevo.message}</p>}
                </div>

                {/* Campo Paciente (Async Select) - Usando .react-select-container */}
                <div className="form-group">
                    <label htmlFor="paciente_id">Paciente *</label>
                    <Controller
                        name="paciente_id"
                        control={control}
                        render={({ field }) => (
                            // El contenedor react-select-container es el que le da el ancho 100% al select
                            <div className={`react-select-container ${errors.paciente_id ? 'input-error' : ''}`}> 
                                <AsyncSelect
                                    id="paciente_id"
                                    cacheOptions
                                    defaultOptions // 👈 ESTO DEBE ESTAR PRESENTE para cargar la lista al abrir
                                    loadOptions={loadPacienteOptions}
                                    value={selectedPacienteOption}
                                    onChange={(option) => {
                                        setSelectedPacienteOption(option);
                                        field.onChange(option ? option.value : '');
                                    }}
                                    placeholder="Buscar paciente..."
                                    noOptionsMessage={({ inputValue }) => 
                                        !inputValue ? "Cargando pacientes..." : "No se encontraron resultados"
                                    }
                                    classNamePrefix="react-select"
                                    isClearable
                                />
                            </div>
                        )}
                    />
                    {/* CLASE CORREGIDA: form-error */}
                    {errors.paciente_id && <p className="form-error">{errors.paciente_id.message}</p>}
                </div>

                {/* Campo Especificación (Select) */}
                <div className="form-group">
                    <label htmlFor="especificacion_id">Especificación *</label>
                    <select
                        id="especificacion_id"
                        {...register('especificacion_id')}
                        // CLASE CORREGIDA: form-input
                        className={errors.especificacion_id ? 'form-input input-error' : 'form-input'} 
                    >
                        <option value="">Seleccione una especificación</option>
                        {especificaciones.map(esp => (
                            <option key={esp.id_especificacion} value={esp.id_especificacion}>
                                {esp.nombre} ({esp.cantidad_cuotas})
                            </option>
                        ))}
                    </select>
                    {errors.especificacion_id && <p className="form-error">{errors.especificacion_id.message}</p>}
                </div>

                {/* Campo Observaciones (Textarea) */}
                <div className="form-group">
                    <label htmlFor="observaciones">Observaciones</label>
                    <textarea
                        id="observaciones"
                        {...register('observaciones')}
                        className={errors.observaciones ? 'form-input input-error' : 'form-input'}
                        rows="3"
                    />
                    {/* CLASE CORREGIDA: form-error */}
                    {errors.observaciones && <p className="form-error">{errors.observaciones.message}</p>}
                </div>

                {formError && <div className="form-error api-error">{formError}</div>}

                {/* Sección de Resoluciones (visible solo si hay un expediente seleccionado/creado) */}
                {currentExpedienteId && (
                    <>
                        <h3 className="form-subtitle">Gestión de Resoluciones</h3>
                        <div className="button-group-center" style={{ marginBottom: '15px' }}>
                            <button
                                type="button"
                                className="btn-create btn-icon btn-add"
                                title='Nueva Resolución'
                                onClick={handleAddResolutionClick} 
                                disabled={isSubmitting}
                            >
                             <FontAwesomeIcon icon={faPlus} />
                            </button>
                        </div>

                        <div className="resolution-list-container">
                            {loadingResoluciones ? ( // <--- AGREGADO: Estado de carga
                                <p className='loading-message'>Cargando resoluciones...</p>
                            ) : resoluciones && resoluciones.length > 0 ? (
                            <ResolucionesTable 
                                resoluciones={resoluciones} 
                                onEdit={onEditResolution} 
                                onDelete={handleDeleteResolution} // <--- USA NUESTRO HANDLER LOCAL
                            /> 
                            ) : (
                                <p className='no-records-message'>Aún no hay resoluciones asociadas a este expediente.</p>
                            )}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="button-group-center">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar Expediente' : 'Crear Expediente')}
                    </button>
                </div>

            </form>
        </div>
    );
}

export default ExpedienteForm;