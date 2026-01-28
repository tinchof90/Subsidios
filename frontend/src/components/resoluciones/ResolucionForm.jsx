import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import '../Form.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

const retroactivoTipoItemValue = 1; 
const consecutivoTipoItemValue = 2;

/**
 * SOLUCIÓN DEFINITIVA PARA EL PROBLEMA DE ZONA HORARIA (-1 DÍA).
 * Forzamos la hora a las 12 PM UTC antes de extraer los componentes de la fecha.
 * * @param {string | Date} dateInput El valor de la fecha (ej: '2025-12-12T00:00:00.000Z' o '2025-12-12').
 * @returns {string} La fecha en formato 'YYYY-MM-DD' para el input type="date".
 */
const formatDateToInputString = (dateInput) => {
    if (!dateInput) {
        return '';
    }
    
    // 1. Convertir a objeto Date
    const date = new Date(dateInput);

    if (isNaN(date.getTime())) {
        console.error("formatDateToInputString: Fecha inválida recibida:", dateInput);
        return '';
    }

    // ⭐ 2. PASO CRÍTICO: Establecer la hora a 12:00 PM en UTC.
    // Esto asegura que, al convertir, la fecha se mantenga en el día correcto.
    date.setUTCHours(12, 0, 0, 0); 
    
    // 3. Extraer componentes usando los métodos UTC.
    // Ahora, los métodos getUTC* devolverán los componentes del día correcto.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth es base 0
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Esquema de validación con Yup
const resolucionSchema = (consecutivoTipoItemValue) => yup.object().shape({
    fecha: yup.date()
        .required('La fecha de resolución es obligatoria.')
        .typeError('Formato de fecha inválido.'),
    descripcion: yup.string()
        .required('La descripción de la resolución es obligatoria.')
        .max(500, 'La descripción no debe exceder los 500 caracteres.'),
    estado_id: yup.number()        
        .typeError('Seleccione un estado válido.') // 1. Maneja la conversión de tipo (si llega cadena vacía)
        .nullable() // 2. 💡 CLAVE: Permite que el valor sea NULL. React-Select envía NULL al borrar.        
        .integer('El ID del estado debe ser un número entero.') // 3. Aplica la validación de que sea un entero y positivo (solo si no es null).
        .positive('Seleccione un estado válido.')
        .required('El estado de la resolución es obligatorio(front)'), // 4. Valida que, si es null (por haber sido borrado), falle por ser obligatorio.
    items_resolucion: yup.array().of(
                        yup.object().shape({
                            tipo_item_id: yup.number()
                                .required('El tipo de ítem es obligatorio.')
                                .positive('Seleccione un tipo de ítem válido.')
                                .integer('El ID del tipo de ítem debe ser un número entero.')
                                .typeError('Seleccione un tipo de ítem válido.'),
                            importe: yup.number()
                                .optional() // <--- HACER OPCIONAL EN YUP
                                .nullable() // <--- PERMITIR NULL
                                .typeError('Formato de importe inválido.'),
                            cantidad_cuotas: yup.number()
                                .required('La cantidad de cuotas es obligatoria.')
                                .min(1, 'La cantidad de cuotas debe ser al menos 1.')
                                .integer('La cantidad de cuotas debe ser un número entero.')
                                .typeError('Ingrese una cantidad de cuotas válida.'),
                            cuota_actual_item: yup.number()
                                .when('tipo_item_id', {
                                    is: (val) => String(val) === String(consecutivoTipoItemValue),
                                    then: (schema) => schema
                                        .required('La cuota actual es obligatoria para el ítem Consecutivo.')
                                        .min(1, 'La cuota actual debe ser al menos 1.')
                                        .integer('La cuota actual debe ser un número entero.')
                                        .typeError('Ingrese una cuota actual válida.'),
                                    otherwise: (schema) => schema.nullable().notRequired()
                                })
        })
    ).min(1, 'Debe agregar al menos un ítem a la resolución.')
    .max(4, 'Solo se permiten un máximo de 4 ítems por resolución.'),
});

// ⭐ AJUSTE DE PROPS: Añadidas resolucionToEdit y onResolutionUpdated
function ResolucionForm({ 
    expedienteId, 
    resolucionToEdit = null, 
    onResolutionAdded, 
    onResolutionUpdated, 
    onCancel
}) {

    const [savingResolucion, setSavingResolucion] = useState(false);
    const [cantidadCuotasEspec, setCantidadCuotasEspec] = useState(null);
    const [totalResolucionesExistentes, setTotalResolucionesExistentes] = useState(0); // 👈 NUEVO ESTADO
    const [especificacionId, setEspecificacionId] = useState(null);
    const [formError, setFormError] = useState(null);
    // Lógica clave (se usará en los handlers y useCallbacks)
    const isFirstResolution = totalResolucionesExistentes === 0;

    // ⭐ ESTADOS LOCALES PARA LAS LISTAS DE OPCIONES
    const [estadosResolucion, setEstadosResolucion] = useState([]);
    const [loadingEstados, setLoadingEstados] = useState(true);
    const [tiposItemOptions, setTiposItemOptions] = useState([]);
    const [loadingTiposItem, setLoadingTiposItem] = useState(false);

    // ESTADOS para el cálculo de importe
    const [baseFeeMensual, setBaseFeeMensual] = useState(0); 
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

    // ... otros estados ...
    const [ratesData, setRatesData] = useState([]); // Guardará el array de valor_cuotas
    const [anioInicio, setAnioInicio] = useState(null);
    const [mesInicio, setMesInicio] = useState(null);

    // ⭐ AJUSTE DE ESTADO: Añadido isEditing
    const isEditing = resolucionToEdit !== null && resolucionToEdit !== undefined;

    // Usamos las variables seguras para encontrar los IDs
    //const retroactivoTipoItemValue = tiposItemOptions.find(t => t.label === TIPO_RETROACTIVO_LABEL)?.value;
    //const consecutivoTipoItemValue = tiposItemOptions.find(t => t.label === TIPO_CONSECUTIVO_LABEL)?.value;

    const schema = resolucionSchema(consecutivoTipoItemValue);


    const API_BASE_URL = 'http://localhost:3000/api';  
    const ESTADO_POR_DEFECTO_ID = 1; 
    
    // 2. Define el ID del estado (¡Asegúrate que este sea el ID numérico de "Activo" en tu BD!)
    const ESTADO_ACTIVO_ID = 1; // Ajusta este valor si el ID de Activo es diferente

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        getValues,
        trigger,
        formState: { errors, isSubmitting },
        setError
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
                fecha: formatDateToInputString(new Date()),
                descripcion: '',
                estado_id: ESTADO_ACTIVO_ID,
                items_resolucion: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items_resolucion",
    });

    const getItemValue = (index, fieldName) => {
        return getValues(`items_resolucion.${index}.${fieldName}`); 
    };

    // ----------------------------------------------------------------------
    // FUNCIÓN CLAVE: CALCULAR Y ESTABLECER IMPORTE
    // ----------------------------------------------------------------------
    const calculateAndSetImporte = useCallback((index, cuotas) => {
        const numCuotas = parseInt(cuotas) || 0;
        
        // 1. Obtenemos los valores actuales del formulario
        const items = getValues('items_resolucion');
        const item = items[index];
        
        if (!item) return;

        const itemTipoId = item.tipo_item_id;
        const cuotaActual = parseInt(item.cuota_actual_item) || 1;
        
        // 2. Necesitamos determinar el AÑO de este ítem para buscar su precio
        // Usamos la misma lógica que el backend: Fecha Inicio Expediente + Posición de Cuota
        let calculatedImporte = 0;
        let valorCuotaAnual = baseFeeMensual; // Valor por defecto (año inicio)

        // Si tenemos la lista de tasas cargada (asumiendo que guardaste tasasRes.data en un estado llamado ratesData)
        // Buscamos el año específico basado en la cuota_actual_item
        if (anioInicio && ratesData) {
            // Cálculo rápido de año: cada 12 cuotas saltamos un año
            // Esto es una estimación para el Front, el Back hará el cálculo exacto mes a mes
            const saltoAnios = Math.floor((mesInicio + cuotaActual - 2) / 12);
            const anioEfectivo = anioInicio + saltoAnios;
            
            const rateEncontrada = ratesData.find(r => parseInt(r.anio) === anioEfectivo);
            if (rateEncontrada) {
                valorCuotaAnual = parseFloat(rateEncontrada.importe);
            }
        }

        // 3. ⭐ APLICAR LÓGICA SEGÚN EL TIPO DE ÍTEM ⭐
        if (String(itemTipoId) === String(retroactivoTipoItemValue)) {
            // RETROACTIVO: Se muestra el TOTAL acumulado
            // (Nota: si el retroactivo pisa dos años, aquí mostramos una base, 
            // el backend luego grabará la suma exacta)
            calculatedImporte = valorCuotaAnual * numCuotas;

        } else if (String(itemTipoId) === String(consecutivoTipoItemValue)) {
            // CONSECUTIVO: Se muestra el valor UNITARIO mensual
            calculatedImporte = valorCuotaAnual;

        } else {
            calculatedImporte = 0;
        }

        // 4. Actualizar el campo 'importe' en el formulario
        setValue(`items_resolucion.${index}.importe`, calculatedImporte.toFixed(2));
        trigger(`items_resolucion.${index}.importe`);

        // 5. Dependencias: Asegúrate de incluir 'ratesData', 'anioInicio' y 'mesInicio' 
        // que deberías haber seteado en el useEffect de carga de metadatos.
    }, [baseFeeMensual, setValue, trigger, getValues, ratesData, anioInicio, mesInicio]);

    // ----------------------------------------------------------------------
    // FUNCIÓN CLAVE: Calcular y actualizar las cuotas del Consecutivo
    // ----------------------------------------------------------------------
    const updateConsecutivoCuotas = useCallback((items) => {

        // 🛑 CAMBIO CLAVE: Solo aplica la lógica si es la PRIMERA resolución.
        if (!isFirstResolution) {
            // Si no es la primera, no sobrescribimos el valor ingresado por el usuario.
            return; 
        }

        if (cantidadCuotasEspec === null) return;

        // Aseguramos que 'items' sea un array antes de usar .find()
        const safeItems = items || [];
        const retroactivoItem = safeItems.find(item => String(item.tipo_item_id) === String(retroactivoTipoItemValue));

        // 2. 💡 SIMPLIFICACIÓN: Encontrar el índice del Consecutivo directamente en los valores.
        const consecutivoIndex = safeItems.findIndex(item => String(item.tipo_item_id) === String(consecutivoTipoItemValue));

        if (consecutivoIndex > -1) {
            const cuotasRetroactivo = retroactivoItem ? parseInt(retroactivoItem.cantidad_cuotas || 0) : 0;

            let cuotasRestantes = cantidadCuotasEspec - cuotasRetroactivo;

            if (cuotasRestantes < 1) cuotasRestantes = 1; 

            const cuotasConsecutivo = cuotasRestantes;

            setValue(`items_resolucion.${consecutivoIndex}.cantidad_cuotas`, cuotasConsecutivo);
            calculateAndSetImporte(consecutivoIndex, cuotasConsecutivo);
            setValue(`items_resolucion.${consecutivoIndex}.cuota_actual_item`, 1);
        }
    }, [cantidadCuotasEspec, retroactivoTipoItemValue, consecutivoTipoItemValue, setValue, calculateAndSetImporte, fields, getValues]); 

    // ----------------------------------------------------------------------
    // useEffect 1: Carga de Metadatos (Tarifa Base y Cuotas de Especificación)
    // ----------------------------------------------------------------------
    useEffect(() => {
        const fetchAllMetadata = async () => {
            if (!expedienteId) {
                setIsLoadingMetadata(false);
                return;
            }

            setIsLoadingMetadata(true);
            setLoadingEstados(true);
            setLoadingTiposItem(true);

            try {
                // 1. Ejecutamos todas las peticiones en paralelo para mayor velocidad
                const [expedienteRes, tasasRes, estadosRes, tiposRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/expedientes/${expedienteId}`),
                    axios.get(`${API_BASE_URL}/valorCuotas`),
                    axios.get(`${API_BASE_URL}/estadosRes`),
                    axios.get(`${API_BASE_URL}/tiposItemResolucion`)
                ]);

                // --- PROCESAMIENTO DE TASAS Y EXPEDIENTE ---
                const expedienteData = expedienteRes.data.data;
                const rates = Array.isArray(tasasRes.data) ? tasasRes.data : [];
                
                // Guardamos todas las tasas para el cálculo dinámico por año
                setRatesData(rates);

                if (expedienteData && expedienteData.fecha_inicio) {
                    // Usamos UTC para evitar el error del día anterior
                    const fecha = new Date(expedienteData.fecha_inicio);
                    const startYear = fecha.getUTCFullYear();
                    const startMonth = fecha.getUTCMonth() + 1;

                    // Guardamos anio y mes de inicio para la lógica de saltos de año
                    setAnioInicio(startYear);
                    setMesInicio(startMonth);

                    // Tarifa base inicial (año de inicio)
                    const baseRate = rates.find(rate => parseInt(rate.anio) === startYear);
                    if (baseRate) {
                        setBaseFeeMensual(parseFloat(baseRate.importe));
                    }
                }

                // Metadatos de control
                setTotalResolucionesExistentes(expedienteData?.total_resoluciones_existentes ?? 0);
                setCantidadCuotasEspec(Number(expedienteData?.especificacion_cantidad_cuotas) || null);
                setEspecificacionId(expedienteData?.especificacion_id || null);

                // --- PROCESAMIENTO DE ESTADOS ---
                const formattedEstados = estadosRes.data.data.map(e => ({
                    value: e.id_estado_resolucion,
                    label: e.nombre,
                }));
                setEstadosResolucion(formattedEstados);

                // --- PROCESAMIENTO DE TIPOS DE ÍTEM ---
                const formattedTipos = tiposRes.data.data.map(t => ({
                    value: t.id_tipo_item,
                    label: t.nombre,
                }));
                setTiposItemOptions(formattedTipos);

            } catch (error) {
                console.error('Error crítico al cargar metadatos del formulario:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error de conexión',
                    text: 'No se pudieron cargar los datos necesarios para la resolución.',
                    confirmButtonColor: '#3085d6'
                });
            } finally {
                setIsLoadingMetadata(false);
                setLoadingEstados(false);
                setLoadingTiposItem(false);
            }
        };

        fetchAllMetadata();
    }, [expedienteId, API_BASE_URL]); // Agregamos dependencias base

    // ----------------------------------------------------------------------
    // useEffect 2: Poblado del Formulario en Edición (SOLUCIÓN al Select Vacío)
    // ----------------------------------------------------------------------
    useEffect(() => {
        // Solo poblar si:
        // 1. Estamos editando (isEditing)
        // 2. Tenemos la data (resolucionToEdit)
        // 3. Los metadatos de la API interna terminaron (!isLoadingMetadata)
        // 4. Las listas de opciones de estados y tipos de item están cargadas.
        if (isEditing && resolucionToEdit && !isLoadingMetadata && tiposItemOptions.length > 0 && estadosResolucion.length > 0) {

            // 💡 LÓGICA DE LIMPIEZA PARA estado_id 💡
            let initialEstadoId = resolucionToEdit.estado_id;
            if (estadosResolucion.find(e => e.value === resolucionToEdit.estado_id) === undefined) {
                // Si el ID no se encuentra en las opciones cargadas, usamos el ID por defecto.
                initialEstadoId = ESTADO_POR_DEFECTO_ID; 
            }

            // Mapear los ítems para el formulario
            const initialItems = resolucionToEdit.items_resolucion.map(item => {
                // Asegurar que el importe esté en formato string '0.00' 
                // ya que viene como número de la base de datos
                const importeFormatted = parseFloat(item.importe || 0).toFixed(2);
                            
                // Si es un ítem consecutivo, la cuota actual viene de la DB o se establece a 1
                const isConsecutivo = String(item.tipo_item_id) === String(consecutivoTipoItemValue);
                const cuotaActual = isConsecutivo ? (item.cuota_actual_item || 1) : null;

                return {
                    ...item,
                    importe: importeFormatted,
                    cuota_actual_item: cuotaActual,
                };
            });

            // Establecer todos los valores del formulario
            reset({
            // 💡 CLAVE: Convertir string de fecha a objeto Date para DatePicker
                fecha: resolucionToEdit.fecha ? formatDateToInputString(resolucionToEdit.fecha) : '',
                descripcion: resolucionToEdit.descripcion,
                estado_id: initialEstadoId,
                items_resolucion: initialItems
            });
        }
    // Clave: Depende de todos los elementos necesarios para rellenar
    }, [isEditing, resolucionToEdit, reset, isLoadingMetadata, estadosResolucion, tiposItemOptions, consecutivoTipoItemValue]); 

    useEffect(() => {
        // Solo llama si es la primera resolución O si es edición
        if (!isLoadingMetadata && cantidadCuotasEspec !== null && (isFirstResolution || isEditing)) { 
            updateConsecutivoCuotas(getValues('items_resolucion'));
        }  
    }, [cantidadCuotasEspec, isLoadingMetadata, getValues, updateConsecutivoCuotas, isFirstResolution, isEditing]); // 👈 Dependencias Añadidas

// ----------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------
const handleCantidadCuotasChange = (index, value) => {
    const newCuota = parseInt(value) || 0;
    const currentTipoId = getItemValue(index, 'tipo_item_id');

    setValue(`items_resolucion.${index}.cantidad_cuotas`, newCuota);
    calculateAndSetImporte(index, newCuota);

    // Si el ítem actual es retroactivo y es la primera resolución, actualizamos el consecutivo
    if (isFirstResolution && String(currentTipoId) === String(retroactivoTipoItemValue)) {
        updateConsecutivoCuotas(getValues('items_resolucion'));
    }
};

const handleItemResolucionSelectChange = (index, selectedOption) => {
    const newTipoId = selectedOption ? selectedOption.value : null;
    const currentItems = getValues('items_resolucion');

    // 1. Obtener el ID del tipo de ítem ANTERIOR para la lógica de reversión
    const oldTipoId = currentItems[index]?.tipo_item_id;

    // 2. Lógica de Restricción Mutua (Retroactivo y Consecutivo)
    const retroactivoPresente = currentItems.some((item, i) => i !== index && String(item.tipo_item_id) === String(retroactivoTipoItemValue));
    const consecutivoPresente = currentItems.some((item, i) => i !== index && String(item.tipo_item_id) === String(consecutivoTipoItemValue));

    if (newTipoId === retroactivoTipoItemValue && retroactivoPresente) {
        Swal.fire({ 
            icon: 'error', 
            title: 'Conflicto de Ítems', 
            text: 'Solo puede haber un ítem de tipo Retroactivo por resolución.', 
        });
        setValue(`items_resolucion.${index}.tipo_item_id`, oldTipoId);
        return;
    }
        
    // Restricción de orden (Retroactivo antes de Consecutivo si ambos existen)
    if (newTipoId === consecutivoTipoItemValue && retroactivoPresente && index === 0) {
        // Esto ocurre si intentas cambiar el primer ítem a Consecutivo cuando el segundo ya es Retroactivo (es un error de formulario)
        Swal.fire({ 
            icon: 'error', 
            title: 'Orden Requerido', 
            text: 'Si ya existe un segundo ítem (Retroactivo), este ítem (Consecutivo) debe ser el segundo.', 
        });
        setValue(`items_resolucion.${index}.tipo_item_id`, oldTipoId);
        return;
    }

    // ⭐ PASO CLAVE: Establecer el nuevo ID después de pasar todas las validaciones
    setValue(`items_resolucion.${index}.tipo_item_id`, newTipoId);

    let cuotasToUse = currentItems[index]?.cantidad_cuotas || 1;
    let shouldUpdateConsecutivo = false;

    if (String(newTipoId) === String(retroactivoTipoItemValue)) {
        // Ítem Retroactivo
        setValue(`items_resolucion.${index}.cantidad_cuotas`, parseInt(cuotasToUse));
        setValue(`items_resolucion.${index}.cuota_actual_item`, null);
        shouldUpdateConsecutivo = true;
    } else if (String(newTipoId) === String(consecutivoTipoItemValue)) {
        // Ítem Consecutivo: Asegurar cuota_actual_item
        const currentCuotaActual = getValues(`items_resolucion.${index}.cuota_actual_item`);
        if (currentCuotaActual === null || currentCuotaActual < 1) {
            setValue(`items_resolucion.${index}.cuota_actual_item`, 1);
        }
        shouldUpdateConsecutivo = true;
    } else {
        // Ítem Genérico / Deseleccionado
        setValue(`items_resolucion.${index}.cuota_actual_item`, null);
    }

    // ⭐ REFINAMIENTO: Recalcular importe SOLO si NO es Consecutivo.
    // El Consecutivo es recalculado correctamente (cantidad y importe) por updateConsecutivoCuotas.
    if (String(newTipoId) !== String(consecutivoTipoItemValue)) {
        calculateAndSetImporte(index, cuotasToUse);
    }

    // Si la acción afectó el flujo Retroactivo/Consecutivo, actualizamos el consecutivo si existe
    if (shouldUpdateConsecutivo || String(oldTipoId) === String(retroactivoTipoItemValue)) {
        // updateConsecutivoCuotas usará el newTipoId que acabamos de setear para recalcular las cuotas restantes
        updateConsecutivoCuotas(getValues('items_resolucion'));
    }
};

const handleAddItemResolucion = () => {
    
    // --- Definición del ítem base a añadir ---
    let itemToAdd = { 
        tipo_item_id: null, // Lo definiremos en la lógica de abajo
        importe: '0.00', 
        cantidad_cuotas: 1, 
        cuota_actual_item: 1 
    };

    // 1. Restricción de Máximo: Impedir más de 2 ítems (Retroactivo + Consecutivo)
    if (fields.length >= 4) {
        Swal.fire({ 
            icon: 'error',
            title: 'Máximo Alcanzado',
            text: 'Solo se permiten los ítems Retroactivo y Consecutivo (máximo 2).'
        });
        return;
    }
 
    append(itemToAdd);

    // 4. Inicializar importe y recalcular (necesario para el consecutivo)
    setTimeout(() => {
        calculateAndSetImporte(newIndex, 1);
    }, 0);
};

const handleRemoveItemResolucion = (index) => {

    // 1. 🛑 RESTRICCIÓN: Si solo queda 1 ítem, no permitimos la eliminación.
    if (fields.length === 1) {
        Swal.fire({
            icon: 'error',
            title: 'Ítem Requerido',
            text: 'La resolución debe contener al menos un ítem. No se puede eliminar el último ítem restante.',
        });
        return; // Detiene la ejecución aquí
    }
      
    // 2. ✅ CONFIRMACIÓN: Si hay más de 1 ítem, pedimos confirmación antes de eliminar.
    Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir la eliminación de este ítem!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡Eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Si el usuario confirma, eliminamos.
            remove(index);
            Swal.fire(
                '¡Eliminado!',
                'El ítem ha sido removido de la resolución.',
                'success'
            );

            // Después de eliminar, recalculamos las cuotas del consecutivo por si acaso
            // Se utiliza setTimeout para asegurar que RHF actualice el estado del fieldArray
            setTimeout(() => {
                updateConsecutivoCuotas(getValues('items_resolucion'));
            }, 0);
        }
    });
};

const onSubmit = async (data) => {
    setSavingResolucion(true);
    setFormError(null);

    try {
        // 1. 🛡️ VALIDACIÓN DE LÍMITE DE CUOTAS (Frontend)
        const totalCuotasCargadas = data.items_resolucion.reduce(
            (sum, item) => sum + (parseInt(item.cantidad_cuotas) || 0), 0
        );

        if (cantidadCuotasEspec !== null && totalCuotasCargadas > cantidadCuotasEspec) {
            Swal.fire({
                icon: 'error',
                title: 'Límite excedido',
                text: `La suma de cuotas (${totalCuotasCargadas}) supera el máximo permitido por la especificación (${cantidadCuotasEspec}).`,
                confirmButtonColor: '#d33'
            });
            setSavingResolucion(false);
            return;
        }

        // 2. PREPARACIÓN DE ÍTEMS PARA EL BACKEND
        const itemsToSend = data.items_resolucion.map(item => {
            const isConsecutivo = String(item.tipo_item_id) === String(consecutivoTipoItemValue);
            
            const baseItem = {
                tipo_item_id: Number(item.tipo_item_id),
                cantidad_cuotas: Number(item.cantidad_cuotas || 0),
                importe: parseFloat(item.importe) || 0,
            };

            // Solo enviamos cuota_actual_item si es consecutivo
            if (isConsecutivo) {
                baseItem.cuota_actual_item = Number(item.cuota_actual_item || 1);
            } else {
                baseItem.cuota_actual_item = null;
            }

            // Si estamos editando, preservamos el ID del ítem existente
            if (item.id_item_resolucion) {
                baseItem.id_item_resolucion = item.id_item_resolucion;
            }

            return baseItem;
        });

        // 3. FORMATEO DE FECHA (Evitando desfase de zona horaria)
        const year = data.fecha.getFullYear();
        const month = String(data.fecha.getMonth() + 1).padStart(2, '0');
        const day = String(data.fecha.getDate()).padStart(2, '0');
        const fechaFormatted = `${year}-${month}-${day}`;

        // 4. CONSTRUCCIÓN DEL PAYLOAD FINAL
        const payload = {
            fecha: fechaFormatted,
            descripcion: data.descripcion,
            estado_id: Number(data.estado_id),
            expediente_id: Number(expedienteId),
            items_resolucion: itemsToSend,
        };

        let response;
        if (isEditing) {
            // --- MODO EDICIÓN ---
            const url = `${API_BASE_URL}/resoluciones/${resolucionToEdit.id_resolucion}`;
            response = await axios.put(url, payload);
            
            Swal.fire('¡Actualizado!', 'La resolución y sus ítems se actualizaron correctamente.', 'success');
            if (onResolutionUpdated) onResolutionUpdated(response.data.data);
        } else {
            // --- MODO CREACIÓN ---
            const url = `${API_BASE_URL}/resoluciones/expediente/${expedienteId}`;
            response = await axios.post(url, payload);
            
            Swal.fire('¡Guardado!', 'La resolución ha sido generada exitosamente.', 'success');
            if (onResolutionAdded) onResolutionAdded(response.data.data);
            
            // Resetear formulario y añadir el primer ítem por defecto
            reset();
            setTimeout(() => handleAddItemResolucion(), 100);
        }

    } catch (error) {
        console.error('Error en el envío:', error.response?.data || error);
        const errorMessage = error.response?.data?.message || 'Error al procesar la resolución.';
        Swal.fire('Error', errorMessage, 'error');
        setFormError(errorMessage);
    } finally {
        setSavingResolucion(false);
    }
};

// ----------------------------------------------------------------------
// RENDERIZADO DEL COMPONENTE FINAL (JSX COMPLETO)
// ----------------------------------------------------------------------

// Helper para buscar el valor por ID
const getEstadoDefaultValue = (id) => estadosResolucion.find(e => String(e.value) === String(id)) || null;
const getTipoItemDefaultValue = (id) => tiposItemOptions.find(t => String(t.value) === String(id)) || null;

// Condición de carga combinada
if (isLoadingMetadata || loadingEstados || loadingTiposItem) {
    return <p className="loading-message">Cargando datos base y opciones de formulario...</p>;
}

// Identificar si el Retroactivo está presente para deshabilitar las cuotas del Consecutivo.
const retroactivoPresente = fields.some(field => {
    // Es necesario obtener el tipo_item_id actual a través de getValues
    const index = fields.findIndex(f => f.id === field.id);
    const tipoId = getValues(`items_resolucion.${index}.tipo_item_id`);
    return String(tipoId) === String(retroactivoTipoItemValue);
});

// Calculamos el total de cuotas que el usuario ha ingresado en el formulario actualmente
const totalCuotasIngresadas = fields.reduce((sum, _, index) => {
    const valor = getValues(`items_resolucion.${index}.cantidad_cuotas`);
    return sum + (parseInt(valor) || 0);
}, 0);

// Determinamos el color del contador para alertar al usuario
const isOverLimit = cantidadCuotasEspec !== null && totalCuotasIngresadas > cantidadCuotasEspec;
const contadorColor = isOverLimit ? '#dc3545' : '#28a745'; // Rojo si se pasa, verde si está ok

return (
    <div className="form-container">
        <h2 className="form-title">
            {isEditing ? `Editar Resolución #${resolucionToEdit.id_resolucion} ` 
            : `Nueva Resolución para Expediente #${expedienteId} `}             
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className='form'>

            {/* --- SECCIÓN DE DATOS GENERALES --- */}
            <input
                type="hidden"
                id="expedienteId"
                {...register('expediente_id', { valueAsNumber: true })} 
                defaultValue={expedienteId}
            />
            
            <div className="form-group">
                <label htmlFor="fecha">Fecha:</label>
                <input
                    type="date"
                    id="fecha"
                    {...register('fecha')}
                    className={errors.fecha ? 'form-input input-error' : 'form-input'}
                />
                {errors.fecha && <p className="form-error">{errors.fecha.message}</p>}
            </div>
            
            <div className="form-group">
                <label htmlFor="descripcion">Descripción:</label>
                <textarea
                    id="descripcion"
                    {...register('descripcion')}
                    className={errors.descripcion ? 'form-input input-error' : 'form-input'}
                    rows="3"
                />
                {errors.descripcion && <p className="form-error">{errors.descripcion.message}</p>}
            </div>
            
            <div className="form-group">
                <label htmlFor="estado_id">Estado:</label>
                <select
                    id="estado_id"
                    {...register('estado_id', { valueAsNumber: true })}
                    className={errors.estado_id ? 'form-input input-error' : 'form-input'} 
                >
                    <option value="">Seleccione un estado</option>
                    {estadosResolucion.map(est => (
                        <option key={est.value} value={est.value}>
                            {est.label}
                        </option>
                    ))}
                </select>
                {errors.estado_id && <p className="form-error">{errors.estado_id.message}</p>}
            </div>

            {/* --- 📊 SECCIÓN DEL CONTADOR DE CUOTAS (CON CORRECCIÓN DE GRID) --- */}
            {cantidadCuotasEspec !== null && (
                <div className="cuotas-counter-full-width">
                    <div style={{
                        padding: '10px 20px',
                        backgroundColor: isOverLimit ? '#fff5f5' : '#f8fafc',
                        border: `2px solid ${contadorColor}`,
                        borderRadius: '15px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        minWidth: '320px',
                        textAlign: 'center'
                    }}>
                        <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: '700', 
                            color: '#64748b',
                            textTransform: 'uppercase',
                            display: 'block',
                            letterSpacing: '1.5px'
                        }}>
                            Cupo de Especificación
                        </span>
                        
                        <div style={{ 
                            fontSize: '2.8rem', 
                            fontWeight: '900', 
                            color: contadorColor,
                            margin: '10px 0',
                            lineHeight: '1'
                        }}>
                            {totalCuotasIngresadas} <span style={{ color: '#cbd5e1', fontSize: '1.8rem', fontWeight: '300' }}>/</span> {cantidadCuotasEspec}
                        </div>

                        <span style={{ 
                            fontSize: '1rem', 
                            color: '#475569',
                            fontWeight: '500',
                            display: 'block'
                        }}>
                            Cuotas Totales Asignadas
                        </span>

                        {isOverLimit && (
                            <div style={{ 
                                marginTop: '12px',
                                padding: '8px',
                                backgroundColor: '#fee2e2',
                                borderRadius: '8px',
                                color: '#b91c1c',
                                fontSize: '0.9rem',
                                fontWeight: 'bold'
                            }}>
                                ⚠️ Exceso de {totalCuotasIngresadas - cantidadCuotasEspec} cuotas
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* --- SECCIÓN DE ÍTEMS DE RESOLUCIÓN --- */}
            <h3 className="form-subtitle">Ítems de la Resolución</h3>

            <div className="button-group-center">
                <button 
                    type="button" 
                    onClick={handleAddItemResolucion} 
                    className="btn-create btn-icon btn-add"
                    title={ fields.length >= 4 ? 'Límite alcanzado': 'Nuevo ítem' }
                    disabled={fields.length >= 4 || isSubmitting}
                >
                    <FontAwesomeIcon icon={faPlus} />  
                </button>
            </div>

            <div className="items-main-container">
                {fields.length > 0 && (
                    <div className="items-wrapper-grid"> 
                        {fields.map((field, index) => {
                            const currentTipoId = getItemValue(index, 'tipo_item_id');
                            const isConsecutivo = String(currentTipoId) === String(consecutivoTipoItemValue);
                            const isRetroactivo = String(currentTipoId) === String(retroactivoTipoItemValue);
                            
                            // Ajuste de habilitación para permitir el desglose por años
                            const isCuotasDisabled = isEditing; 

                            return (
                                <div key={field.id} className="item-resolucion-card">
                                    <h4>Ítem {index + 1}</h4>
                                    <div className="item-resolucion-grid">
                                        <div className="form-group">
                                            <label>Tipo de Ítem:</label>
                                            <Controller
                                                name={`items_resolucion.${index}.tipo_item_id`}
                                                control={control}
                                                render={({ field: selectField }) => (
                                                    <Select
                                                        value={getTipoItemDefaultValue(selectField.value)}
                                                        onChange={(selectedOption) => {
                                                            handleItemResolucionSelectChange(index, selectedOption);
                                                            selectField.onChange(selectedOption ? selectedOption.value : null);
                                                        }}
                                                        options={tiposItemOptions}
                                                        placeholder="Seleccione un tipo"
                                                        classNamePrefix="react-select"
                                                        isDisabled={loadingTiposItem}
                                                        isClearable={true} 
                                                        styles={{ control: (base) => ({ 
                                                            ...base, 
                                                            borderColor: errors.items_resolucion?.[index]?.tipo_item_id ? '#dc3545' : base.borderColor 
                                                        })}}
                                                    />
                                                )}
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Cantidad de Cuotas:</label>
                                            <Controller
                                                name={`items_resolucion.${index}.cantidad_cuotas`}
                                                control={control}
                                                render={({ field: inputField }) => (
                                                    <input
                                                        type="number"
                                                        {...inputField}
                                                        disabled={isCuotasDisabled}
                                                        onChange={(e) => {
                                                            inputField.onChange(e); 
                                                            handleCantidadCuotasChange(index, e.target.value);
                                                        }}
                                                        className={`form-input ${errors.items_resolucion?.[index]?.cantidad_cuotas ? 'input-error' : ''} ${isCuotasDisabled ? 'input-disabled' : ''}`}
                                                        min="1"
                                                    />
                                                )}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Importe ({isConsecutivo ? 'Mensual' : 'Total'}):</label>
                                            <input
                                                type="text"
                                                value={`$ ${getItemValue(index, 'importe')}`} 
                                                className="form-input input-disabled"
                                                disabled={true}
                                            />
                                        </div>

                                        {isConsecutivo && (
                                            <div className="form-group">
                                                <label>Cuota Actual:</label>
                                                <Controller
                                                    name={`items_resolucion.${index}.cuota_actual_item`}
                                                    control={control}
                                                    render={({ field: cuotaField }) => (
                                                        <input
                                                            type="number"
                                                            {...cuotaField}
                                                            disabled={isEditing}
                                                            className={`form-input ${errors.items_resolucion?.[index]?.cuota_actual_item ? 'input-error' : ''} ${isEditing ? 'input-disabled' : ''}`}
                                                            min="1"
                                                            onChange={(e) => {
                                                                cuotaField.onChange(e);
                                                                calculateAndSetImporte(index, getValues(`items_resolucion.${index}.cantidad_cuotas`));
                                                            }}
                                                        />
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {fields.length > 1 && (
                                            <div className="item-remove-button-container">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveItemResolucion(index)}
                                                    className="btn-danger btn-icon btn-remove-item"
                                                    title="Eliminar Ítem"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )} 
            </div>            
            
            {errors.items_resolucion && typeof errors.items_resolucion.message === 'string' && (
                <p className="form-error" style={{ textAlign: 'center' }}>{errors.items_resolucion.message}</p>
            )}

            {formError && <p className="form-error general-error">{formError}</p>}            

            <div className="button-group-center">
                <button type="button" onClick={onCancel} className="btn-secondary">
                    Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting || savingResolucion}>
                    {isSubmitting || savingResolucion ? 'Guardando...' : (isEditing ? 'Actualizar Resolución' : 'Guardar Resolución')}
                </button>                    
            </div>
        </form>
    </div>
);
}

export default ResolucionForm;