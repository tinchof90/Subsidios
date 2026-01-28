import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import '../Table.css'; // Crearemos este archivo CSS en el siguiente paso

/**
 * Componente de tabla para mostrar las resoluciones de un expediente.
 * @param {object[]} resoluciones - Array de objetos de resolución.
 * @param {function(object): void} onEdit - Función para iniciar la edición de una resolución.
 * @param {function(number): void} onDelete - Función para iniciar la eliminación de una resolución.
 */
function ResolucionesTable({ resoluciones, onEdit, onDelete }) { 
    // Asegura que 'resoluciones' siempre sea un array
    const safeResoluciones = resoluciones ?? [];
    
    // Función para formatear el importe a moneda (UYU)
    const formatCurrency = (amount) => {
        // Usar toLocaleString para formato de moneda más robusto, incluyendo 'UYU'
        return parseFloat(amount || 0).toLocaleString('es-UY', { 
            style: 'currency', 
            currency: 'UYU',
            minimumFractionDigits: 2 
        });
    };

    // Función de utilidad para formatear la fecha a DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        // Verifica si la fecha es válida
        if (isNaN(date)) return dateString; 

        // Formato DD/MM/YYYY
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };    

    return (
        // Contenedor principal con estilo de tarjeta
        <div>
            
            <h3 className="form-subtitle">Resoluciones asociadas</h3>
            
            {safeResoluciones.length === 0 ? (
                // NOTA: El mensaje de "No hay resoluciones..." se maneja en el padre (ExpedienteForm)
                null
            ) : (
                <div className="table-responsive"> 
                    {/* Tabla con el estilo de encabezado sólido y filas limpias */}
                    <table className="table table-striped table-hover resoluciones-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Estado</th>                        
                                <th>Importe Total</th>
                                <th>Ítems</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>                        
                        <tbody>
                            {safeResoluciones.map(res => (
                                <tr key={res.id_resolucion}>
                                    {/* ID: centrado para mayor orden */}
                                    <td>{res.id_resolucion}</td>
                                    
                                    <td>{formatDate(res.fecha)}</td>
                                    
                                    <td>{res.descripcion}</td>

                                    <td>
                                        {/* Visualización del estado con color */}
                                        <span className={`badge ${ 
                                                res.estado_nombre === 'Finalizada' ? 'bg-success' : 
                                                res.estado_nombre === 'Activo' ? 'bg-primary' : 
                                                'bg-warning text-dark' // Default
                                            }`}>
                                            {res.estado_nombre || res.estado_id}
                                        </span>
                                    </td>

                                    {/* Importe Total: más destacado */}
                                    <td>{formatCurrency(res.importe_total)}</td>

                                    <td>
                                        {res.items_resolucion && res.items_resolucion.length > 0 ? (
                                            <ul className="list-unstyled text-sm">
                                                {res.items_resolucion.map((item, idx) => (
                                                    <li key={idx} className="truncate">
                                                        {item.tipo_item_nombre || item.tipo_item_id} : {formatCurrency(item.importe)}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted italic">Sin ítems</span>
                                        )}
                                    </td>
                                    
                                    {/* Celda de Acciones: CORREGIDO para usar la prop onAction y el ID correcto */}
                                    <td>
                                        <div className="table-actions">
                                            <button
                                                className="btn-edit"
                                                onClick={() => onEdit(res)}
                                                title="Editar Resolución (No implementado)"
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-delete"
                                                onClick={() => onDelete && onDelete(res.id_resolucion)}
                                                title="Eliminar Resolución"
                                            >
                                                <FontAwesomeIcon icon={faTrashCan} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ResolucionesTable;
