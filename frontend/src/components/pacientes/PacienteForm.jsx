import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes, faUpload, faTrash, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import Modal from '../modal/Modal';
import "../Form.css";
import { API_BASE_URL } from '../../config';

const PACIENTES_ENDPOINT = `${API_BASE_URL}/pacientes`;

// Esquema de validación con Yup, ajustado a tus atributos
const schema = yup.object().shape({
    // Datos principales del paciente
    documento: yup.string().required('El documento es obligatorio').max(20, 'Máximo 20 caracteres'),
    nombre1: yup.string().required('El primer nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
    nombre2: yup.string().max(50, 'Máximo 50 caracteres'),
    apellido1: yup.string().required('El primer apellido es obligatorio').max(50, 'Máximo 50 caracteres'),
    apellido2: yup.string().max(50, 'Máximo 50 caracteres'),
    sexo: yup.string().required('El sexo es obligatorio').oneOf(['M', 'F', 'O'], 'Sexo inválido'),
    fecha_nacimiento: yup.date()
        .required('La fecha de nacimiento es obligatoria')
        .typeError('Formato de fecha inválido')
        .max(new Date(), 'La fecha de nacimiento no puede ser en el futuro'),
    direccion: yup.string().max(255, 'Máximo 255 caracteres'),
    telefono: yup.string().max(20, 'Máximo 20 caracteres'),
    centro_id: yup.number()
        .nullable(true)
        .transform((value, originalValue) => originalValue === '' ? null : (isNaN(originalValue) ? undefined : Number(originalValue)))
        .test('is-number-or-null', 'Debe ser un número válido o estar vacío', value => value === null || (typeof value === 'number' && !isNaN(value))),
    fecha_comienzo: yup.date()
        .nullable()
        .transform((curr, orig) => orig === '' ? null : curr)
        // .min(new Date(new Date().setHours(0, 0, 0, 0)), 'La fecha no puede ser anterior a hoy') // Se comenta la validación min por si quieres fechas de inicio pasadas
        .typeError('La fecha de inicio del expediente no es válida'),

    // Objeto apoderado
    apoderado: yup.object().shape({
        activo: yup.boolean(), 
        nombre: yup.string().when('activo', {
            is: true,
            then: schema => schema.required('El nombre del apoderado es obligatorio').max(100, 'Máximo 100 caracteres'),
            otherwise: schema => schema.notRequired().nullable(true).transform(val => (val === '' ? null : val)),
        }),
        documento: yup.string().when('activo', {
            is: true,
            then: schema => schema.required('El documento del apoderado es obligatorio').max(20, 'Máximo 20 caracteres'),
            otherwise: schema => schema.notRequired().nullable(true).transform(val => (val === '' ? null : val)),
        }),
        fecha_nacimiento: yup.date().when('activo', {
            is: true,
            then: schema => schema.required('La fecha de nacimiento del apoderado es obligatoria')
                .typeError('Formato de fecha inválido')
                .max(new Date(), 'La fecha de nacimiento del apoderado no puede ser en el futuro'),
            otherwise: schema => schema.notRequired().nullable(true).transform((curr, orig) => orig === '' ? null : curr),
        }),
    })
    .default({ activo: false, nombre: '', documento: '', fecha_nacimiento: '' }) 
    .nullable(true) 
    .optional(),
});

const PacienteForm = ({ pacienteToEdit, onPacienteCreated, onPacienteUpdated, onSuccessClose }) => {
    const [loadingBackend, setLoadingBackend] = useState(false);
    const [loadingCentros, setLoadingCentros] = useState(true);
    const [centros, setCentros] = useState([]);
    const [files, setFiles] = useState([]);
    const [newFile, setNewFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [selectedFileName, setSelectedFileName] = useState(''); 
    const fileInputRef = useRef(null); 

    // --- ESTADO PARA EL MODAL DE ALERTAS ---
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        showConfirmButton: false, 
        onConfirm: null,
        onClose: null, 
    });

    const showAlertModal = (title, message, type = 'info') => {
        setModalState({
            isOpen: true,
            title: title,
            message: message,
            showConfirmButton: false,
            onConfirm: null,
            onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
        });
    };

    const showConfirmModal = (title, message, onConfirmAction) => {
        setModalState({
            isOpen: true,
            title: title,
            message: message,
            showConfirmButton: true,
            onConfirm: () => {
                onConfirmAction();
                setModalState(prev => ({ ...prev, isOpen: false }));
            },
            onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
        });
    };

    const isEditing = !!pacienteToEdit;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
        getValues,
        watch
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            sexo: 'M',
            documento: '',
            nombre1: '',
            nombre2: '',
            apellido1: '',
            apellido2: '',
            fecha_nacimiento: '',
            direccion: '',
            telefono: '',
            centro_id: '',
            fecha_comienzo: '',
            // Inicialización completa del apoderado
            apoderado: { 
                activo: false,
                nombre: '',
                documento: '',
                fecha_nacimiento: '',
            }
        },
    });

    const apoderadoWatch = watch('apoderado.activo');

    // Efecto para cargar los centros
    useEffect(() => {
        const fetchCentrosData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/centros`);
                if (Array.isArray(response.data.data)) {
                    setCentros(response.data.data);
                } else {
                    console.error('La propiedad "data" de la API de centros no es un array:', response.data);
                    setCentros([]);
                    showAlertModal('Error de Carga', 'Error: La estructura de la respuesta de centros no es válida.');
                }
            } catch (err) {
                console.error('Error al cargar centros:', err);
                showAlertModal('Error de Carga', 'Error al cargar centros: ' + (err.response?.data?.message || err.message));
                setCentros([]);
            } finally {
                setLoadingCentros(false);
            }
        };
        fetchCentrosData();
    }, []);

    // Efecto para precargar los datos del paciente a editar (CORREGIDO)
    useEffect(() => {
        if (pacienteToEdit) {

            console.log("Datos de la API (pacienteToEdit):", pacienteToEdit);
            
            const { apoderado, fecha_nacimiento, fecha_comienzo, ...rest } = pacienteToEdit;

            // 1. Formateo de fechas principales
            const fechaNacimientoClean = fecha_nacimiento 
                ? new Date(fecha_nacimiento).toISOString().split('T')[0] 
                : '';
            const fechaComienzoClean = fecha_comienzo 
                ? new Date(fecha_comienzo).toISOString().split('T')[0] 
                : '';
            
            // 2. Manejar el objeto apoderado y sus fechas
            const apoderadoData = apoderado || {};
            const isApoderadoActivo = !!apoderadoData.activo;
            //const isApoderadoActivo = apoderadoData.activo === true || !!apoderadoData.nombre;
            
            const apoderadoClean = {
                activo: isApoderadoActivo,
                nombre: apoderadoData.nombre || '',
                documento: apoderadoData.documento || '',
                fecha_nacimiento: apoderadoData.fecha_nacimiento
                    ? new Date(apoderadoData.fecha_nacimiento).toISOString().split('T')[0]
                    : '',
            };
            
            // 3. Aplicar todos los valores
            reset({
                ...rest,
                fecha_nacimiento: fechaNacimientoClean,
                fecha_comienzo: fechaComienzoClean,
                centro_id: rest.centro_id || '',
                apoderado: apoderadoClean,
            });

            // 4. Lógica de archivos
            setValue('id_paciente', pacienteToEdit.id_paciente);
            fetchFiles(pacienteToEdit.id_paciente);
        } else {
            // Lógica para formulario vacío (Crear)
            reset({
                sexo: 'M',
                documento: '',
                nombre1: '',
                nombre2: '',
                apellido1: '',
                apellido2: '',
                fecha_nacimiento: '',
                direccion: '',
                telefono: '',
                centro_id: '',
                fecha_comienzo: '',
                apoderado: { 
                    activo: false,
                    nombre: '',
                    documento: '',
                    fecha_nacimiento: '',
                },
            });
        }
        setSelectedFileName('');
        setNewFile(null);
    }, [pacienteToEdit, reset, setValue]);

    // Función para obtener los archivos asociados a un paciente
    const fetchFiles = async (pacienteId) => {
        if (!pacienteId) return;
        try {
            const response = await axios.get(`${PACIENTES_ENDPOINT}/${pacienteId}/archivos`);
            setFiles(response.data.data);
        } catch (err) {
            console.error('Error al cargar archivos:', err);
            showAlertModal('Error de Archivos', 'Error al cargar archivos: ' + (err.response?.data?.message || err.message));
        }
    };

    // Manejador de envío del formulario principal (CORREGIDO)
    const onSubmit = async (data) => {
        setLoadingBackend(true);
        try {
            let response;
            
            // Limpieza inicial de la data
            const dataToSend = {
                ...data,
                centro_id: data.centro_id === '' ? null : Number(data.centro_id),
                fecha_comienzo: data.fecha_comienzo || null,
                fecha_nacimiento: data.fecha_nacimiento || null,
            };

            // Limpiar el objeto apoderado si no está activo
            if (!dataToSend.apoderado || dataToSend.apoderado.activo === false) {
                dataToSend.apoderado = {
                    activo: false,
                    nombre: null,       
                    documento: null,    
                    fecha_nacimiento: null,
                };
            } else {
                // Si está activo, asegurarse de que los campos vacíos (string vacíos) sean null
                dataToSend.apoderado.nombre = dataToSend.apoderado.nombre || null;
                dataToSend.apoderado.documento = dataToSend.apoderado.documento || null;
                dataToSend.apoderado.fecha_nacimiento = dataToSend.apoderado.fecha_nacimiento || null;
            }

            if (isEditing) {
                response = await axios.put(`${PACIENTES_ENDPOINT}/${pacienteToEdit.id_paciente}`, dataToSend);
                
                // El hijo solo notifica al padre sobre la actualización y el cierre.
                onPacienteUpdated(response.data); 
                
                if (onSuccessClose) {
                    onSuccessClose(); 
                }

            } else {
                response = await axios.post(PACIENTES_ENDPOINT, dataToSend);
                onPacienteCreated(response.data);
                setValue('id_paciente', response.data.id_paciente);
                showAlertModal('Éxito', 'Paciente creado exitosamente.');
            }
        } catch (err) {
            console.error('Error al guardar paciente:', err.response?.data || err);
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido al guardar el paciente.';
            showAlertModal('Error al Guardar', 'Error al guardar paciente: ' + errorMessage); 
        } finally {
            setLoadingBackend(false);
        }
    };

    // Manejador para cuando se selecciona un archivo
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setNewFile(file);
        setSelectedFileName(file ? file.name : '');
    };

    // Nueva función para simular el click en el input de archivo
    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    // Manejador para subir un nuevo archivo
    const handleFileUpload = async () => {
        const pacienteId = pacienteToEdit?.id_paciente || getValues('id_paciente');

        if (!pacienteId) {
            showAlertModal('Información', 'Primero debes crear o seleccionar un paciente para subir archivos.');
            return;
        }

        if (!newFile) {
            showAlertModal('Advertencia', 'Por favor, selecciona un archivo para subir.');
            return;
        }

        setUploadingFile(true);
        const formData = new FormData();
        formData.append('archivos', newFile);

        try {
            await axios.post(`${PACIENTES_ENDPOINT}/${pacienteId}/archivos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showAlertModal('Éxito', 'Archivo subido exitosamente.');
            setNewFile(null);
            setSelectedFileName('');
            fetchFiles(pacienteId);
        } catch (err) {
            console.error('Error al subir archivo:', err.response?.data || err);
            const errorMessage = err.response?.data?.message || err.message || 'Hubo un error desconocido.';
            showAlertModal('Error de Subida', 'Error al subir archivo: ' + errorMessage);
        } finally {
            setUploadingFile(false);
        }
    };

    // Manejador para eliminar un archivo existente
    const handleDeleteFile = (fileId, fileName) => {
        showConfirmModal(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar el archivo "${fileName}"?`,
            async () => {
                const pacienteId = pacienteToEdit?.id_paciente || getValues('id_paciente');

                if (!pacienteId) {
                    showAlertModal('Error', 'No se pudo determinar el paciente para eliminar el archivo.');
                    return;
                }

                try {
                    await axios.delete(`${PACIENTES_ENDPOINT}/${pacienteId}/archivos/${fileId}`);
                    showAlertModal('Éxito', `Archivo "${fileName}" eliminado exitosamente.`);
                    fetchFiles(pacienteId);
                } catch (err) {
                    console.error('Error al eliminar archivo:', err.response?.data || err);
                    const errorMessage = err.response?.data?.message || err.message || 'Hubo un error desconocido.';
                    showAlertModal('Error de Eliminación', 'Error al eliminar archivo: ' + errorMessage);
                }
            }
        );
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit(onSubmit)} className='form'>

                {/* Campo Documento */}
                <div className="form-group">
                    <label htmlFor="documento">Documento:</label>
                    <input
                        type="text"
                        id="documento"
                        {...register('documento')}
                        className={errors.documento ? 'form-input input-error' : 'form-input'}
                    />
                    {errors.documento && <p className="form-error">{errors.documento.message}</p>}
                </div>

                {/* Campo Primer Nombre */}
                <div className="form-group">
                    <label htmlFor="nombre1">Primer Nombre:</label>
                    <input
                        type="text"
                        id="nombre1"
                        {...register('nombre1')}
                        className={errors.nombre1 ? 'form-input input-error' : 'form-input'}
                    />
                    {errors.nombre1 && <p className="form-error">{errors.nombre1.message}</p>}
                </div>

                {/* Campo Segundo Nombre */}
                <div className="form-group">
                    <label htmlFor="nombre2">Segundo Nombre:</label>
                    <input
                        type="text"
                        id="nombre2"
                        {...register('nombre2')}
                        className="form-input"
                    />
                </div>

                {/* Campo Primer Apellido */}
                <div className="form-group">
                    <label htmlFor="apellido1">Primer Apellido:</label>
                    <input
                        type="text"
                        id="apellido1"
                        {...register('apellido1')}
                        className={errors.apellido1 ? 'form-input input-error' : 'form-input'}
                    />
                    {errors.apellido1 && <p className="form-error">{errors.apellido1.message}</p>}
                </div>

                {/* Campo Segundo Apellido */}
                <div className="form-group">
                    <label htmlFor="apellido2">Segundo Apellido:</label>
                    <input
                        type="text"
                        id="apellido2"
                        {...register('apellido2')}
                        className="form-input"
                    />
                </div>

                {/* Campo Sexo */}
                <div className="form-group">
                    <label htmlFor="sexo">Sexo:</label>
                    <select
                        id="sexo"
                        {...register('sexo')}
                        className={errors.sexo ? 'form-input input-error' : 'form-input'}
                    >
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                    </select>
                    {errors.sexo && <p className="form-error">{errors.sexo.message}</p>}
                </div>

                {/* Campo Fecha de Nacimiento */}
                <div className="form-group">
                    <label htmlFor="fecha_nacimiento">Fecha de Nacimiento:</label>
                    <input
                        type="date"
                        id="fecha_nacimiento"
                        {...register('fecha_nacimiento')}
                        className={errors.fecha_nacimiento ? 'form-input input-error' : 'form-input'}
                    />
                    {errors.fecha_nacimiento && <p className="form-error">{errors.fecha_nacimiento.message}</p>}
                </div>

                {/* Campo Dirección */}
                <div className="form-group">
                    <label htmlFor="direccion">Dirección:</label>
                    <input
                        type="text"
                        id="direccion"
                        {...register('direccion')}
                        className="form-input"
                    />
                </div>

                {/* Campo Teléfono */}
                <div className="form-group">
                    <label htmlFor="telefono">Teléfono:</label>
                    <input
                        type="text"
                        id="telefono"
                        {...register('telefono')}
                        className="form-input"
                    />
                </div>                

                {/* Campo Centro ID */}
                <div className="form-group">
                    <label htmlFor="centro_id">Centro:</label>
                    {loadingCentros ? (
                        <p>Cargando centros...</p>
                    ) : (
                        <select
                            id="centro_id"
                            {...register('centro_id')}
                            className={errors.centro_id ? 'form-input input-error' : 'form-input'}
                        >
                            <option value="">-- Seleccionar Centro --</option>
                            {centros.map((centro) => (
                                <option key={centro.id_centro} value={centro.id_centro}>
                                    {centro.nombre}
                                </option>
                            ))}
                        </select>
                    )}
                    {errors.centro_id && <p className="form-error">{errors.centro_id.message}</p>}
                </div>

                {/* Campo Fecha inicio */}
                <div className="form-group">
                    <label htmlFor="fecha_comienzo">Fecha de Inicio:</label>
                    <input type="date" id="fecha_comienzo"
                    {...register('fecha_comienzo')}
                    className={errors.fecha_comienzo ? 'form-input input-error' : 'form-input'}
                    />
                    {errors.fecha_comienzo && <p className="form-error">{errors.fecha_comienzo.message}</p>}
                </div>                

                {/* Campo checkbox APODERADO */}
                <div className="form-group form-group-checkbox">
                    <label htmlFor="apoderado_activo" className="form-label">Tiene apoderado</label>
                    <input
                        type="checkbox"
                        id="apoderado_activo"
                        {...register('apoderado.activo')}
                        className="form-checkbox"
                    />
                </div>

                {/* Campos condicionales APODERADO */}
                {apoderadoWatch && (
                    <>
                        <div className="form-group">
                            <label htmlFor="apoderado_nombre">Nombre Completo Apoderado:</label>
                            <input
                                type="text"
                                id="apoderado_nombre"
                                {...register('apoderado.nombre')}
                                className={errors.apoderado?.nombre ? 'form-input input-error' : 'form-input'}
                            />
                            {errors.apoderado?.nombre && (
                                <p className="form-error">{errors.apoderado.nombre.message}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="apoderado_documento">Documento Apoderado:</label>
                            <input
                                type="text"
                                id="apoderado_documento"
                                {...register('apoderado.documento')}
                                className={errors.apoderado?.documento ? 'form-input input-error' : 'form-input'}
                            />
                            {errors.apoderado?.documento && (
                                <p className="form-error">{errors.apoderado.documento.message}</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="apoderado_fecha_nacimiento">Fecha de Nacimiento Apoderado:</label>
                            <input
                                type="date"
                                id="apoderado_fecha_nacimiento"
                                {...register('apoderado.fecha_nacimiento')}
                                className={errors.apoderado?.fecha_nacimiento ? 'form-input input-error' : 'form-input'}
                            />
                            {errors.apoderado?.fecha_nacimiento && (
                                <p className="form-error">{errors.apoderado.fecha_nacimiento.message}</p>
                            )}
                        </div>
                    </>
                )}

                {/* Campo id_paciente (oculto) */}
                {(isEditing || getValues('id_paciente')) && (
                    <input
                        type="hidden"
                        {...register('id_paciente')}
                    />
                )}

                {/* Campo fecha_creacion (oculto y solo lectura) */}
                {isEditing && pacienteToEdit?.fecha_creacion && (
                    <input
                        type="hidden"
                        {...register('fecha_creacion')}
                    />
                )}

                {/* Button Actualizar Paciente */}
                <div className="button-group">
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSubmitting || loadingBackend || loadingCentros}
                    >
                        {isSubmitting || loadingBackend ? 'Guardando...' : (isEditing ? 'Actualizar Paciente' : 'Crear Paciente')}
                    </button> 		                    
                </div>
                
            </form>
            
            {/* 📁 Sección de gestión de archivos - solo visible si estamos editando o si ya hay un paciente creado */}
            {(isEditing || getValues('id_paciente')) && (
                <div className="file-upload-section">
                    <h3>Gestión de Archivos</h3>
                    <div className="file-upload-controls">
                        {/* El input de archivo real, oculto y con la referencia */}
                        <input
                            type="file"
                            onChange={handleFileChange}
                            key={newFile ? newFile.name : 'no-file'} 
                            style={{ display: 'none' }}
                            ref={fileInputRef} 
                        />
                        {/* Botón personalizado que activa el input oculto */}
                        <button
                            type="button" 
                            onClick={handleButtonClick}
                            className="btn btn-secondary" 
                        >
                            Seleccionar Archivo
                        </button>

                        {/* Mostrar el nombre del archivo seleccionado */}
                        {selectedFileName && (
                            <p className="selected-file-name mt-2">
                                Archivo: <strong>{selectedFileName}</strong>
                            </p>
                        )}
                        {!selectedFileName && (
                            <p className="text-muted mt-2">Ningún archivo seleccionado.</p>
                        )}

                        {/* Botón de subir archivo */}
                        <button
                            onClick={handleFileUpload}
                            disabled={uploadingFile || !newFile}
                            className="btn-primary mt-2"
                        >
                            <FontAwesomeIcon icon={faUpload} /> {uploadingFile ? 'Subiendo...' : 'Subir Archivo'}
                        </button>
                    </div>

                    {files.length > 0 && (
                        <div className="file-list">
                            <h4>Archivos cargados:</h4>
                            <ul>
                                {files.map((file) => (
                                    <li key={file.id_archivo} className="file-item">
                                        <a href={`http://localhost:3000/uploads/${file.nombre}`} target="_blank" rel="noopener noreferrer">
                                            <FontAwesomeIcon icon={faFileAlt} /> {file.nombre_original}
                                        </a>
                                        <button 
                                            onClick={() => handleDeleteFile(file.id_archivo, file.nombre_original)} 
                                            title="Eliminar archivo" 
                                            className="btn-delete-file"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {files.length === 0 && <p style={{textAlign: 'center'}}>No hay archivos para este paciente.</p>}
                </div>
            )}            

            {/* 💡 RENDERIZAR EL MODAL */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={modalState.onClose}
                title={modalState.title}
                message={modalState.message}
                showConfirmButton={modalState.showConfirmButton}
                onConfirm={modalState.onConfirm}
            />
        </div>
    );
};

export default PacienteForm;