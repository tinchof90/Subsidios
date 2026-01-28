import React from 'react';
import SearchBar from '../searchBar/SearchBar'; 
import "../GlobalControls.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExport, faPlus } from '@fortawesome/free-solid-svg-icons';

function ExpedientesHeaderControls({ onCreateNew, onSearch, searchTerm, onPrint, onExport }) {
    // La lógica de si se debe mostrar este componente o el formulario está en el padre (ExpedientesContainer).

    return (
        <div className="controls-normal">             
            <SearchBar onSearch={onSearch} searchTerm={searchTerm} />
            <button onClick={onCreateNew} className="btn-create btn-icon btn-add" title="Nuevo expediente">
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

export default ExpedientesHeaderControls;