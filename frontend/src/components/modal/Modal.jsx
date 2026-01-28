import React from 'react';
import './Modal.css';

function Modal({ isOpen, onClose, title, message, onConfirm, showConfirmButton, confirmText = "Confirmar", cancelText = "Cancelar" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          {showConfirmButton && (
            <>
              <button className="btn btn-cancel" onClick={onClose}>
                {cancelText}
              </button>
              <button className="btn btn-primary" onClick={onConfirm}>
                {confirmText}
              </button>
            </>
          )}
          {!showConfirmButton && (
            <button className="btn btn-primary" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;