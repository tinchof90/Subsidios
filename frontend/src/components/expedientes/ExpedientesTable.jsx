import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import '../Table.css'; // Crearemos este archivo CSS en el siguiente paso

const formatUTCDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Convertimos la cadena ISO del backend a un objeto Date
    const date = new Date(dateString);

    // Extraemos los componentes de la fecha usando los métodos UTC
    const day = date.getUTCDate().toString().padStart(2, '0');
    // getUTCMonth() es 0-indexado (Enero=0), por eso sumamos 1
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}/${month}/${year}`;
};

function ExpedientesTable({ expedientes, onEdit, onDelete }) {
    return (
        <div className="table-responsive">
            <table className="table table-striped table-hover expediente-table">
                <thead>
                    <tr>
                        <th>Fecha Inicio</th>
                        <th>Paciente</th>
                        <th>RNT</th>
                        <th>Caso Nuevo</th>                        
                        <th>Especificación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {expedientes.map((expediente) => (
                        <tr key={expediente.id_expediente}>
                            <td>{formatUTCDate(expediente.fecha_inicio)}</td>           
                            <td>
                                {expediente.paciente_documento} - {expediente.paciente_apellido1}, {expediente.paciente_nombre1}
                            </td>
                            <td>{expediente.rnt}</td>
                            <td>{expediente.caso_nuevo ? 'Sí' : 'No'}</td>
                            <td>{expediente.especificacion_nombre || 'N/A'}</td>
                            <td className="table-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => onEdit(expediente)}
                                    title="Editar Expediente"
                                >
                                    <FontAwesomeIcon icon={faPenToSquare} />
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => onDelete(expediente.id_expediente)}
                                    title="Eliminar Expediente"
                                >
                                    <FontAwesomeIcon icon={faTrashCan} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ExpedientesTable;