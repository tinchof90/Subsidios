// src/components/fechaFilter/FechaFilter.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEraser } from '@fortawesome/free-solid-svg-icons'; 

function FechaFilter({
    fechaDesde,
    fechaHasta,
    onFechaDesdeChange,
    onFechaHastaChange,
    onApplyFilter,
    onClearFilters
}) {
    return (
        // Quitamos mb-4 si el margen inferior de la tarjeta ya no es necesario
        // Añadimos 'fecha-filter-centered-card' para el centrado
        <div className="card p-3 shadow-sm fecha-filter-centered-card"> 
            <div className="filter-controls-inline"> 
                {/* Etiqueta e Input "Desde" */}
                <label htmlFor="filterFechaDesde" className="form-label compact-label">Desde: </label>
                <input
                    type="date"
                    className="form-control date-input-filter"
                    id="filterFechaDesde"
                    value={fechaDesde}
                    onChange={onFechaDesdeChange}
                />
                
                {/* Etiqueta e Input "Hasta" (incluye el guion) */}
                <label htmlFor="filterFechaHasta" className="form-label compact-label-hasta"> -  Hasta: </label> 
                <input
                    type="date"
                    className="form-control date-input-filter"
                    id="filterFechaHasta"
                    value={fechaHasta}
                    onChange={onFechaHastaChange}
                />
                
                {/* Botón */}
                <button
                    className="btn btn-secondary btn-filter-sm" 
                    onClick={onClearFilters}
                    title="Limpiar Filtros"
                >
                    <FontAwesomeIcon icon={faEraser} /> 
                </button>
            </div>
        </div>
    );
}

export default FechaFilter;