import React, { useState, useEffect, useCallback } from 'react';
import CentrosHeaderControls from './CentrosHeaderControls';
import CentroForm from './CentroForm';
import { API_BASE_URL } from '../../config'; // Ajusta los ../ según la carpeta
import CentrosTable from './CentrosTable';
import PaginationControls from "../paginationControls/PaginationControls";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Importa Font Awesome para la cruz
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import Modal from "../modal/Modal";
import axios from 'axios';
import * as XLSX from 'xlsx';

const BASE_URL = `${API_BASE_URL}/centros`;

function CentrosContainer() {
    const [centros, setCentros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [centroToEdit, setCentroToEdit] = useState(null);

    // Estados para la paginación y búsqueda, idénticos a PacientesContainer
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [finalSearchTerm, setFinalSearchTerm] = useState(''); // Usamos 'finalSearchTerm' para consistencia

    // Estados del modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('');
    const [modalAction, setModalAction] = useState(null);

    const openModal = (title, message, type, action = null) => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType(type);
        setModalAction(() => action);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleModalConfirm = async () => {
        if (modalAction) {
            closeModal();
            await modalAction();
        }
    };

    const fetchCentros = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL(BASE_URL);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', itemsPerPage);
            if (finalSearchTerm) { // Usa finalSearchTerm
                url.searchParams.append('search', finalSearchTerm);
            }

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Error HTTP! Estado: ${response.status} - ${response.statusText}`);
            }
            const responseData = await response.json(); // Espera la estructura { data, totalItems, totalPages, currentPage }

            setCentros(responseData.data);
            setTotalItems(responseData.totalItems);
            setTotalPages(responseData.totalPages);
            setCurrentPage(responseData.currentPage);
        } catch (err) {
            console.error("Error al cargar los centros:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, finalSearchTerm]); // Dependencias para useCallback

    useEffect(() => {
        fetchCentros();
    }, [fetchCentros]);

    // Manejadores para paginación y búsqueda, idénticos a PacientesContainer
    const handleSearchTermChange = useCallback((newSearchTerm) => { // Renombrado a handleSearchTermChange para consistencia
        setFinalSearchTerm(newSearchTerm);
        setCurrentPage(1); // Resetear a la primera página al cambiar el término de búsqueda
    }, []);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const goToPage = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Manejadores para formulario (Crear, Editar, Cancelar)
    const handleCreateNewClick = () => { // Renombrado para consistencia
        setCentroToEdit(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditClick = (centro) => {
        setCentroToEdit(centro);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCentroCreated = (newCentro) => {
        setShowForm(false);
        setCentroToEdit(null);
        setCurrentPage(1); // Reinicia a la primera página para ver el nuevo centro
        fetchCentros(); // Refresca la lista
        alert('Centro creado exitosamente!');
    };

    const handleCentroUpdated = (updatedCentro) => {
        setShowForm(false);
        setCentroToEdit(null);
        fetchCentros(); // Refresca la lista
        alert('Centro actualizado exitosamente!');
    };

    const handleCancelForm = () => { // Renombrado para consistencia
        setShowForm(false);
        setCentroToEdit(null);
    };

    // Reemplaza handleDeleteClick
    const handleDeleteClick = (id_centro) => {
        openModal(
            'Confirmar Eliminación',
            `¿Estás seguro de que quieres eliminar el centro con ID ${id_centro}?`,
            'confirm',
            async () => {
                try {
                    setLoading(true);
                    await axios.delete(`${BASE_URL}/${id_centro}`);
                    fetchCentros();
                    openModal('Eliminación Exitosa', 'Centro eliminado exitosamente.', 'alert');
                } catch (err) {
                    console.error("Error al eliminar el centro:", err);
                    openModal('Error al Eliminar', `Error al eliminar: ${err.response?.data?.message || err.message}`, 'alert');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleExportExcel = () => {
        // 1. Preparamos los datos: seleccionamos solo las columnas necesarias y renombramos
        const datosParaExportar = centros.map(centro => ({
            'Código': centro.codigo,
            'Nombre': centro.nombre,
            'Departamento': centro.nombre_departamento,
            'Estado': centro.estado ? 'Activo' : 'Inactivo'
        }));

        // 2. Creamos el libro y la hoja de trabajo
        const hoja = XLSX.utils.json_to_sheet(datosParaExportar);
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, 'Centros');

        // 3. Generamos el archivo y disparamos la descarga
        XLSX.writeFile(libro, 'Listado_Centros.xlsx');
    };

    // --- FUNCIONALIDAD DE IMPRESIÓN ---
    const handlePrint = async () => {
        try {
            setLoading(true);
            const response = await axios.get(BASE_URL, {
                params: { limit: 10000, search: finalSearchTerm }
            });
            const datos = response.data.data;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Reporte de Centros</title>
                        <style>
                            /* Configuración de página y saltos */
                            @page { 
                                size: auto;  
                                margin: 10mm; 
                            }
                            
                            body { 
                                font-family: 'Segoe UI', Arial, sans-serif; 
                                margin: 20px; 
                                color: #333; 
                            }

                            h2 { 
                                text-align: center; 
                                color: #2c3e50; 
                                border-bottom: 2px solid #3498db; 
                                padding-bottom: 10px; 
                            }

                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin-top: 20px;
                                page-break-inside: auto; /* Permite que la tabla se divida entre páginas */
                            }

                            tr { 
                                page-break-inside: avoid; /* Evita que una fila se parta a la mitad */
                                page-break-after: auto; 
                            }

                            th, td { 
                                border: 1px solid #ddd; 
                                padding: 10px; 
                                text-align: left; 
                                font-size: 12px; 
                            }

                            th { 
                                background-color: #f8f9fa !important; /* !important asegura que se vea en el print */
                                font-weight: bold; 
                                -webkit-print-color-adjust: exact; /* Fuerza color en navegadores Chrome/Safari */
                            }

                            tr:nth-child(even) { 
                                background-color: #f9f9f9 !important; 
                                -webkit-print-color-adjust: exact;
                            }

                            .activo { color: #28a745; font-weight: bold; }
                            .inactivo { color: #dc3545; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <h2>Listado de Centros de Salud</h2>
                        <p>Fecha: ${new Date().toLocaleDateString()}</p>
                        <table>
                            <thead>
                                <tr><th>ID</th><th>CODIGO</th><th>NOMBRE</th><th>ESTADO</th><th>DEPARTAMENTO</th></tr>
                            </thead>
                            <tbody>
                                ${datos.map(c => {
                                    // 1. Usamos nombre_departamento como en tu tabla
                                    const depto = c.nombre_departamento || '-';
                                    
                                    // 2. Lógica de estado idéntica a tu tabla
                                    const estadoTexto = c.estado ? 'Activo' : 'Inactivo';
                                    const estadoClase = c.estado ? 'activo' : 'inactivo';

                                    return `
                                        <tr>
                                            <td>${c.id_centro}</td>
                                            <td>${c.codigo || '-'}</td>
                                            <td>${c.nombre}</td>                                            
                                            <td class="${estadoClase}">${estadoTexto}</td>
                                            <td>${depto}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        } catch (err) {
            openModal("Error", "No se pudo generar la impresión.", "error");
        } finally { setLoading(false); }
    };

    // Mensajes de carga y error (se mantienen como están, o puedes usar clases CSS si prefieres)
    if (loading && !showForm && centros.length === 0 && finalSearchTerm === '') {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <p>Cargando centros desde el backend...</p>
            </div>
        );
    }

    if (error && !showForm) {
        return (
            <div className="error-container">
                <p>Error al cargar los centros: {error}</p>
                <p>Asegúrate de que el servidor de la API esté disponible y la configuración de red sea correcta.</p>
            </div>
        );
    }

    return (
        <div className="list-container">
            {/* Contenedor principal del título y el botón de la cruz */}
            <div className="main-section-header">
                {showForm ? (
                    <button
                        onClick={handleCancelForm}
                        className="btn-cancel-fixed-right"
                        title="Cerrar formulario"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                ) : (
                    <h2>Listado de Centros</h2>
                )}
            </div>

            <CentrosHeaderControls
                showForm={showForm}
                onCreateNew={handleCreateNewClick}
                onSearch={handleSearchTermChange}
                onExport={handleExportExcel}
                onPrint={handlePrint}
            />

            {showForm && (
                <CentroForm
                    onCentroCreated={handleCentroCreated}
                    onCentroUpdated={handleCentroUpdated}
                    centroToEdit={centroToEdit}
                />
            )}

            {!showForm && (
                <>
                    {/* Mensajes de "no hay centros" ajustados para búsqueda */}
                    {centros.length === 0 && finalSearchTerm === '' && (
                        <p>No hay centros registrados.</p>
                    )}
                    {centros.length === 0 && finalSearchTerm !== '' && (
                        <p>No se encontraron centros que coincidan con su búsqueda "{finalSearchTerm}".</p>
                    )}

                    {centros.length > 0 && (
                        <>
                            <CentrosTable
                                centros={centros}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick} // ya dispara el modal
                            />

                            {totalPages > 1 && (
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                    onGoToPrevPage={goToPrevPage}
                                    onGoToNextPage={goToNextPage}
                                    onGoToPage={goToPage}
                                    loading={loading}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            {/* Modal de confirmación o alerta */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={modalTitle}
                message={modalMessage}
                showConfirmButton={modalType === 'confirm'}
                onConfirm={handleModalConfirm}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );

}

export default CentrosContainer;