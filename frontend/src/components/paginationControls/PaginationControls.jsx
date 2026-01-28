import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import './PaginationControls.css';

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onGoToPrevPage,
  onGoToNextPage,
  onGoToPage,
  loading,
  itemsPerPage = 5
}) {
  
  // 🚀 DEFENSA CLAVE CONTRA NaN: Aseguramos que todas las props numéricas sean números (o un valor por defecto)
  const safeCurrentPage = Number(currentPage) || 1;
  const safeTotalPages = Number(totalPages) || 1;
  const safeTotalItems = Number(totalItems) || 0;
  
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;
    
    // Usamos los valores 'safe' en toda la lógica
    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(safeTotalPages, safeCurrentPage + Math.floor(maxPageButtons / 2));

    if (endPage - startPage + 1 < maxPageButtons) {
      if (startPage === 1) {
        endPage = Math.min(safeTotalPages, startPage + maxPageButtons - 1);
      } else if (endPage === safeTotalPages) {
        startPage = Math.max(1, safeTotalPages - maxPageButtons + 1);
      }
    }

    if (startPage > 1) {
      pageNumbers.push(1);
      if (startPage > 2) pageNumbers.push('...');
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    if (endPage < safeTotalPages) {
      if (endPage < safeTotalPages - 1) pageNumbers.push('...');
      pageNumbers.push(safeTotalPages);
    }

    return (
      <div className="pagination-numbers">
        {pageNumbers.map((num, index) => (
          <button
            key={index}
            onClick={() => num !== '...' && onGoToPage(num)}
            // Comparamos contra safeCurrentPage
            className={`page-number ${num === safeCurrentPage ? 'active' : ''} ${num === '...' ? 'disabled' : ''}`}
            disabled={num === '...'}
          >
            {num}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="pagination-controls">
        <button
          onClick={onGoToPrevPage}
          // Usamos safeCurrentPage y safeTotalPages para disabled
          disabled={safeCurrentPage === 1 || loading}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Anterior
        </button>

        {renderPageNumbers()}

        <button
          onClick={onGoToNextPage}
          // Usamos safeCurrentPage y safeTotalPages para disabled
          disabled={safeCurrentPage === safeTotalPages || loading}
        >
          Siguiente <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      <div className="pagination-info">
        <p>
          Mostrando {safeTotalItems > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0} al {Math.min(safeCurrentPage * itemsPerPage, safeTotalItems)} de {safeTotalItems} - Página {safeCurrentPage} de {safeTotalPages}
        </p>
      </div>
    </>
  );
}

export default PaginationControls;