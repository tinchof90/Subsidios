// src/components/PacientesTable.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import "../Table.css";

function PacientesTable({ pacientes, onEdit, onDelete }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Documento</th>
          <th>Nombre Completo</th>
          <th>Fecha Nacimiento</th>
          <th>Centro</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {pacientes.map(paciente => (
          <tr key={paciente.id_paciente}>
            <td>{paciente.id_paciente}</td>
            <td>{paciente.documento}</td>
            <td>{`${paciente.nombre1} ${paciente.nombre2 || ''} ${paciente.apellido1} ${paciente.apellido2 || ''}`}</td>
            <td>{new Date(paciente.fecha_nacimiento).toLocaleDateString()}</td>
            <td>{paciente.nombre_centro || 'Sin Centro'}</td>
            <td className="table-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(paciente);
                }}
                className="btn-edit"
                title="Editar Paciente"
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(paciente.id_paciente);
                }}
                className="btn-delete"
                title="Eliminar Paciente"
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

export default PacientesTable;