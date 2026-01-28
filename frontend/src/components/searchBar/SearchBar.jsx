import React, { useState } from 'react';
// Si estás importando App.css en tu archivo principal (ej. main.jsx),
// no necesitas importar CSS aquí.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchClick = () => {
    console.log("🔍 Botón Buscar clickeado con término:", searchTerm);
    onSearch(searchTerm); // Pasa el término actual al componente padre
  };

  const handleKeyDown = (e) => {
    // Permite buscar también al presionar Enter
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        id="search-documento"
        placeholder=""
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSearchClick} className="btn-create btn-icon btn-search" title="Buscar">
        <FontAwesomeIcon icon={faSearch} />
      </button>
    </div>
  );
}

export default SearchBar;