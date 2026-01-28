import React from 'react';
import SearchBar from '../searchBar/SearchBar'; // Revisa esta ruta si SearchBar está en 'common'
import "../GlobalControls.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faFileExport, faPlus } from '@fortawesome/free-solid-svg-icons';

function CentrosHeaderControls({ onCreateNew, showForm, onSearch, onExport, onPrint }) {
    // Este componente ahora solo se muestra si el formulario NO está visible
    if (showForm) {
        return null; // No renderiza nada si el formulario está abierto
    }

    return (
        // Mantiene la clase 'controls-normal' para los estilos de flex
        <div className="controls-normal"> 
            <SearchBar onSearch={onSearch} />
            <button onClick={onCreateNew} className="btn-create btn-icon btn-add" title='Nuevo Centro'>
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

export default CentrosHeaderControls;