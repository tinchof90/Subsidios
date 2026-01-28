import React, { useState, useEffect } from 'react';
import SearchBar from '../searchBar/SearchBar';
import "../GlobalControls.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExport, faPlus } from '@fortawesome/free-solid-svg-icons';
import { API_BASE_URL } from '../../config';

function PacientesHeaderControls({ showForm, onCreateNew, onSearch, onExport, onPrint, selectedCentro, onCentroChange }) {
    const [centros, setCentros] = useState([]);

    useEffect(() => {
        const cargarCentros = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/centros`);
                const response = await res.json();
                
                // 🔍 AQUÍ ESTÁ LA CORRECCIÓN:
                // Tu backend envía { data: [...] }, así que accedemos a .data
                const listaCentros = response.data || []; 
                setCentros(listaCentros);
            } catch (err) {
                console.error("Error cargando centros:", err);
                setCentros([]);
            }
        };
        if (!showForm) cargarCentros();
    }, [showForm]);

    return (
        <div className="controls-normal">
            <SearchBar onSearch={onSearch} />
            
            <select 
                value={selectedCentro || ""} 
                onChange={onCentroChange}
                className="filter-select"
                style={{ marginLeft: '10px', height: '38px', borderRadius: '4px' }} // Estilo rápido para probar
            >
                <option value="">Todos los Centros</option>
                {centros.length > 0 ? (
                    centros.map((centro) => (
                        <option key={centro.id_centro} value={centro.id_centro}>
                            {centro.nombre}
                        </option>
                    ))
                ) : (
                    <option disabled>Cargando centros...</option>
                )}
            </select>

            <button onClick={onCreateNew} className="btn-create btn-icon btn-add" title='Nuevo Paciente'>
                <FontAwesomeIcon icon={faPlus} />
            </button>
            <button onClick={onPrint} className="btn-create btn-icon btn-print" title="Imprimir">
                <FontAwesomeIcon icon={faPrint} />
            </button>
            <button onClick={onExport} className="btn-create btn-icon btn-export" title="Exportar">
                <FontAwesomeIcon icon={faFileExport} />
            </button>
        </div>
    );
}

export default PacientesHeaderControls;