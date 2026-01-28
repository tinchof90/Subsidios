import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import "../Form.css";
import { API_BASE_URL } from '../../config'; // ⬅️ Importamos la constante

// --- ESQUEMA DE VALIDACIÓN CON YUP ---
const centroSchema = yup.object().shape({
  codigo: yup.string()
    .required('El código es obligatorio')
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(20, 'El código no debe exceder los 20 caracteres'),
  nombre: yup.string()
    .required('El nombre del centro es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no debe exceder los 100 caracteres'),
  estado: yup.string()
    .required('El estado es obligatorio')
    .oneOf(['true', 'false'], 'El estado debe ser Activo o Inactivo'), // Ejemplo de estados
  departamento_id: yup.number()
    .required('El departamento es obligatorio')
    .positive('Selecciona un departamento válido')
    .integer('El ID del departamento debe ser un número entero'),
});

function CentroForm({ onCentroCreated, onCentroUpdated, centroToEdit, onClose }) {
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [departamentos, setDepartamentos] = useState([]); // Nuevo estado para los departamentos

  const isEditing = centroToEdit !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(centroSchema),
    // Define los valores por defecto basados en las nuevas propiedades
    defaultValues: {
      codigo: '',
      nombre: '',
      estado: '',
      departamento_id: '', 
    }
  });

  // Efecto para cargar los departamentos cuando el componente se monta
  useEffect(() => {
    const fetchDepartamentos = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/departamentos`); 
        if (!response.ok) throw new Error('Error al cargar los departamentos.');
        const data = await response.json();
        setDepartamentos(data.data || data);
      } catch (err) {
        console.error("Error al cargar departamentos:", err);
        // Maneja el error, quizás mostrando un mensaje al usuario
      }
    };
    fetchDepartamentos();
  }, []); // Se ejecuta solo una vez al montar el componente

  // Efecto 2: Precargar datos al editar un centro, SÓLO CUANDO los departamentos estén cargados
  useEffect(() => {
    console.log("useEffect para reset se ejecuta.");
    // Asegúrate de que estamos editando, que el centroToEdit existe, Y que los departamentos ya se cargaron
    if (isEditing && centroToEdit && departamentos.length > 0) { 
      console.log("Centro a editar (centroToEdit):", centroToEdit);
      console.log("ID del departamento a precargar:", centroToEdit.departamento_id);
      console.log("ID del departamento convertido a string:", String(centroToEdit.departamento_id));

      reset({
        codigo: centroToEdit.codigo || '',
        nombre: centroToEdit.nombre || '',
        estado: typeof centroToEdit.estado === 'boolean' ? String(centroToEdit.estado) : '',
        departamento_id: centroToEdit.departamento_id ? String(centroToEdit.departamento_id) : '',
      });
      console.log("Valor de departamento_id después del reset:", centroToEdit.departamento_id ? String(centroToEdit.departamento_id) : '');
    } else if (!isEditing) {
      console.log("No hay centro para editar. Reiniciando formulario.");
      reset({
        codigo: '',
        nombre: '',
        estado: '',
        departamento_id: '',
      });
    }
  }, [centroToEdit, isEditing, reset, departamentos]); // AÑADE 'departamentos' como dependencia

  const onSubmit = async (data) => {
    setLoadingBackend(true);
    setErrorBackend(null);

    try {
      const url = isEditing
        ? `${API_BASE_URL}/centros/${centroToEdit.id_centro}`
        : `${API_BASE_URL}/centros`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...data,
            estado: data.estado === 'true' // Convierte a booleano antes de enviar
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el centro.');
      }

      const responseData = await response.json();

      if (isEditing) {
        onCentroUpdated(responseData);
      } else {
        onCentroCreated(responseData);
      }
      reset(); // Limpiar el formulario después de guardar exitosamente
    } catch (err) {
      console.error("Error al enviar el formulario:", err);
      setErrorBackend(err.message);
      alert(`Error: ${err.message}`); // Usaremos una notificación mejor más adelante
    } finally {
      setLoadingBackend(false);
    }
  };

  return (    
    <div className="form-container">
      <h1>{isEditing ? 'Editar Centro' : 'Crear Nuevo Centro'}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className='form'>

        {/* Código */}
        <div className="form-group">
          <label htmlFor="codigo">Código:</label>
          <input type="text" id="codigo"
            {...register('codigo')}
            // MODIFICADO: Añadida clase 'form-input'
            className={errors.codigo ? 'form-input input-error' : 'form-input'}
          />
          {/* MODIFICADO: Clase del mensaje de error a 'form-error' */}
          {errors.codigo && <p className="form-error">{errors.codigo.message}</p>}
        </div>

        {/* Nombre */}
        <div className="form-group">
          <label htmlFor="nombre">Nombre:</label>
          <input type="text" id="nombre"
            {...register('nombre')}
            // MODIFICADO: Añadida clase 'form-input'
            className={errors.nombre ? 'form-input input-error' : 'form-input'}
          />
          {/* MODIFICADO: Clase del mensaje de error a 'form-error' */}
          {errors.nombre && <p className="form-error">{errors.nombre.message}</p>}
        </div>

        {/* Estado */}
        <div className="form-group">
          <label htmlFor="estado">Estado:</label>
          <select id="estado"
            {...register('estado')}
            // MODIFICADO: Añadida clase 'form-input'
            className={errors.estado ? 'form-input input-error' : 'form-input'}
          >
            <option value="">Selecciona un estado</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
          {/* MODIFICADO: Clase del mensaje de error a 'form-error' */}
          {errors.estado && <p className="form-error">{errors.estado.message}</p>}
        </div>

        {/* Departamento */}
        <div className="form-group">
          <label htmlFor="departamento_id">Departamento:</label>
          <select id="departamento_id"
            {...register('departamento_id', { valueAsNumber: true })}
            // MODIFICADO: Añadida clase 'form-input'
            className={errors.departamento_id ? 'form-input input-error' : 'form-input'}
          >
            <option value="">Selecciona un departamento</option>
            {departamentos.length > 0 && departamentos.map((dep) => (
              <option key={dep.id_departamento} value={dep.id_departamento}>
                {dep.nombre}
              </option>
            ))}
          </select>
          {/* MODIFICADO: Clase del mensaje de error a 'form-error' */}
          {errors.departamento_id && <p className="form-error">{errors.departamento_id.message}</p>}
        </div>

        {/* Clase del mensaje de error a 'form-error' */}
        {errorBackend && <p className="form-error">{errorBackend}</p>}

        <div className="button-group"> {/* Agregado button-group para consistencia */}
            <button type="submit"
                // MODIFICADO: Añadidas clases 'btn btn-primary'
                className="btn btn-primary"
                disabled={isSubmitting || loadingBackend}
            >              
              {isSubmitting || loadingBackend ? 'Guardando...' : (isEditing ? 'Guardar Centro' : 'Crear Centro')}
            </button>
            {/* Si quieres un botón de cerrar en CentroForm, añádelo aquí con las mismas clases */}
            {onClose && (
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  <FontAwesomeIcon icon={faTimes} style={{ marginRight: '8px' }} />
                  Cerrar
                </button>
            )}
        </div>
      </form>
    </div>
  );
}

export default CentroForm;