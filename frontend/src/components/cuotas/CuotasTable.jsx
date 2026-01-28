// src/components/Cuotas/CuotasTable.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Importamos los mismos iconos que usas para consistencia
import { faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
// Asumo que tu archivo de estilos para la tabla es el mismo
import "../Table.css"; 

/**
 * Componente que muestra la lista de valores de cuotas en una tabla.
 * Recibe las cuotas, y las funciones para editar y borrar desde el contenedor.
 * @param {Array} cuotas - Lista de objetos de cuota ({ id, anio, importe, fecha_creacion }).
 * @param {function} onEdit - Función para manejar la acción de edición.
 * @param {function} onDelete - Función para manejar la acción de borrado.
 */
function CuotasTable({ cuotas, onEdit, onDelete }) {
  
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Año</th>
          <th>Importe</th>
          <th>Fecha Creación</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {cuotas.map(cuota => (
          // Usamos 'id' como clave (key), tal como se definió en la BD
          <tr key={cuota.id}>
            {/* Mapeo de columnas de PostgreSQL */}
            <td>{cuota.id}</td>
            <td>{cuota.anio}</td>
            {/* Formateo del importe a 2 decimales y símbolo de moneda */}
            <td>${parseFloat(cuota.importe).toFixed(2)}</td>
            {/* Formateo de la fecha de creación */}
            <td>{new Date(cuota.fecha_creacion).toLocaleDateString()}</td>
            
            <td className="table-actions">
              {/* Botón de Editar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Pasamos el objeto de cuota completo para pre-llenar el formulario de edición
                  onEdit(cuota); 
                }}
                className="btn-edit"
                title="Editar Cuota"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>

              {/* Botón de Borrar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Pasamos solo el ID para confirmar y ejecutar el borrado
                  onDelete(cuota.id); 
                }}
                className="btn-delete"
                title="Eliminar Cuota"
              >
                <FontAwesomeIcon icon={faTrashCan} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CuotasTable;