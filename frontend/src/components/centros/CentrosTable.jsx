import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import "../Table.css";

function CentrosTable({ centros, onEdit, onDelete }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Departamento</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {centros.map(centro => (
          <tr key={centro.id_centro}>
            <td>{centro.id_centro}</td>
            <td>{centro.codigo}</td>
            <td>{centro.nombre}</td>
            <td>{centro.nombre_departamento}</td>
            <td>{centro.estado ? 'Activo' : 'Inactivo'}</td>
            <td className="table-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(centro);
                }}
                className="btn-edit"
                title="Editar Centro"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(centro.id_centro);
                }}
                className="btn-delete"
                title="Eliminar Centro"
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

export default CentrosTable;