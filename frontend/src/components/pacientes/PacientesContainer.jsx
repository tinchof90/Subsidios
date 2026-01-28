import React, { useState, useEffect, useCallback } from 'react';
import PacienteForm from './PacienteForm';
import PacientesTable from './PacientesTable';
import PaginationControls from "../paginationControls/PaginationControls";
import PacientesHeaderControls from './PacientesHeaderControls';
import Modal from "../modal/Modal";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const PACIENTES_ENDPOINT = `${API_BASE_URL}/pacientes`;

function PacientesContainer() {
    const [pacientes, setPacientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [pacienteToEdit, setPacienteToEdit] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [finalSearchTerm, setFinalSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('');
    const [modalAction, setModalAction] = useState(null);
    const [selectedCentro, setSelectedCentro] = useState('');

    const openModal = (title, message, type, action = null) => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType(type);
        setModalAction(() => action);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalTitle('');
        setModalMessage('');
        setModalType('');
        setModalAction(null);
    };

    const handleModalConfirm = async () => {
        if (modalAction) {
            closeModal();
            await modalAction();
        }
    };

    // Función fetchPacientes: Se mantiene igual, ya que los estados de fecha están aquí
    const fetchPacientes = useCallback(async () => {
        setLoading(true); // Es buena práctica activar el loading al empezar
        try {
            let url = `${PACIENTES_ENDPOINT}?page=${currentPage}&limit=${itemsPerPage}&finalSearchTerm=${finalSearchTerm}`;

            if (selectedCentro) {
                url += `&centroId=${selectedCentro}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            // --- LAS TRES LÍNEAS CLAVE ---
            setPacientes(data.pacientes || []);
            setTotalPages(data.totalPages || 0);
            setTotalItems(data.total || 0); // ⬅️ AGREGA ESTA LÍNEA
            
        } catch (error) {
            console.error("Error al buscar pacientes:", error);
            setError("No se pudieron cargar los pacientes");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, finalSearchTerm, selectedCentro]);

    useEffect(() => {
        fetchPacientes();
    }, [fetchPacientes]);

    // Manejadores para paginación y búsqueda
    const handleSearchTermChange = useCallback((newSearchTerm) => {
        console.log("🧠 PacientesContainer recibió término:", newSearchTerm);
        setFinalSearchTerm(newSearchTerm);
        setCurrentPage(1);
    }, []);

    // Resto de tus manejadores de paginación (goToNextPage, goToPrevPage, goToPage)
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
    const handleCreateNewClick = () => {
        setPacienteToEdit(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditClick = (paciente) => {
        setPacienteToEdit(paciente);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePacienteCreated = (newPaciente) => {
        // 1. Establece el paciente recién creado como el paciente a editar.
        // Esto asegura que el PacienteForm tenga el ID para la subida de archivos.
        setPacienteToEdit(newPaciente); 
        
        // 2. Muestra el mensaje de éxito.
        openModal('Éxito', 'Paciente creado exitosamente. Ahora puedes añadir archivos si lo deseas, o cierra el formulario.', 'alert');
        
        // 3. Opcional: Recargar la lista principal después de la creación
        // Esto es útil si quieres que el paciente recién creado aparezca inmediatamente en la lista.
        fetchPacientes(); 
    };

    const handlePacienteUpdated = (updatedPaciente) => {
        // Ya no se muestra un mensaje ni se intenta cerrar aquí.
        // Solo actualizamos la fila en la lista.
        setPacientes(prevPacientes =>
            prevPacientes.map(p =>
                p.id_paciente === updatedPaciente.id_paciente ? updatedPaciente : p
            )
        );
    };

    const handleCloseForm = (showSuccessAlert = false) => {
        // 1. Cerrar formulario y limpiar estado de edición
        setShowForm(false);
        setPacienteToEdit(null);
        
        // 2. Refrescar la lista de pacientes (asíncrono)
        fetchPacientes(); 
        
        // 3. Cerrar el modal por si estaba abierto
        closeModal(); 

        // 4. Mostrar el mensaje de éxito (SOLO si se indica)
        if (showSuccessAlert) {
            // Usamos openModal para mostrar la notificación de éxito
            openModal('Éxito', 'Paciente actualizado exitosamente', 'alert');
        }
    };

    const handleDeleteClick = (id_paciente) => {
        openModal(
            'Confirmar Eliminación',
            `¿Estás seguro de que deseas eliminar al paciente con ID ${id_paciente}? Esta acción no se puede deshacer.`,
            'confirm',
            async () => {
                setLoading(true);
                try {
                    const response = await axios.delete(`${PACIENTES_ENDPOINT}/${id_paciente}`);

                    if (response.status !== 200 && response.status !== 204) {
                        throw new Error(response.data.message || `Error HTTP! Estado: ${response.status}`);
                    }

                    fetchPacientes(); 
                    openModal('Eliminación Exitosa', 'Paciente eliminado exitosamente.', 'alert');
                } catch (err) {
                    console.error("Error al eliminar el paciente:", err);
                    openModal('Error al Eliminar', `Error al eliminar paciente: ${err.response?.data?.message || err.message}`, 'alert');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handlePrint = async () => {
        try {
            setLoading(true);

            // 1. Obtenemos los datos actuales (usando el mismo filtro que la tabla)
            const response = await axios.get(PACIENTES_ENDPOINT, {
                params: { limit: 10000, searchTerm: finalSearchTerm }
            });

            const datos = response.data.data;

            if (!datos || datos.length === 0) {
                openModal("Imprimir", "No hay datos para imprimir.", "info");
                return;
            }

            // 2. Creamos una ventana nueva para la impresión
            const printWindow = window.open('', '_blank');
            
            // 3. Generamos el contenido HTML y los estilos para la hoja
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Reporte de Pacientes</title>
                        <style>
                            /* Configuración de página y saltos */
                            @page { 
                                size: A4 landscape; 
                                margin: 10mm; 
                            }
                            
                            body { 
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                                margin: 20px; 
                                color: #333; 
                            }

                            h2 { 
                                text-align: center; 
                                color: #2c3e50; 
                                text-transform: uppercase;
                                border-bottom: 2px solid #3498db; 
                                padding-bottom: 10px; 
                            }

                            .info-header { 
                                margin-bottom: 20px; 
                                font-size: 13px; 
                                color: #666;
                                line-height: 1.6;
                            }

                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin-top: 10px;
                                page-break-inside: auto; 
                            }

                            tr { 
                                page-break-inside: avoid; 
                                page-break-after: auto; 
                            }

                            th, td { 
                                border: 1px solid #dee2e6; 
                                padding: 10px 8px; 
                                text-align: left; 
                                font-size: 11px; 
                            }

                            th { 
                                background-color: #f8f9fa !important; 
                                color: #495057;
                                font-weight: bold; 
                                text-transform: uppercase;
                                -webkit-print-color-adjust: exact;
                            }

                            tr:nth-child(even) { 
                                background-color: #f2f2f2 !important; 
                                -webkit-print-color-adjust: exact;
                            }

                            .text-bold { font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <h2>Reporte de Pacientes</h2>
                        <div class="info-header">
                            <strong>Fecha de generación:</strong> ${new Date().toLocaleString()}<br>
                            <strong>Filtro aplicado:</strong> ${finalSearchTerm || 'Ninguno'}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>DOCUMENTO</th>
                                    <th>NOMBRE COMPLETO</th>
                                    <th>FECHA NACIMIENTO</th>
                                    <th>CENTRO</th>
                                    <th>TELÉFONO</th>
                                    <th>FECHA COMIENZO</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datos.map(p => `
                                    <tr>
                                        <td>${p.documento || '-'}</td>
                                        <td>${`${p.nombre1} ${p.nombre2 || ''} ${p.apellido1} ${p.apellido2 || ''}`.trim()}</td>
                                        <td>${p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString() : '-'}</td>
                                        <td>${p.centro_nombre || '-'}</td>
                                        <td>${p.telefono || '-'}</td>
                                        <td>${p.fecha_comienzo ? new Date(p.fecha_comienzo).toLocaleDateString() : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);

            // 4. Ejecutamos la impresión
            printWindow.document.close();
            printWindow.focus();
            
            // Esperamos un momento a que carguen los estilos antes de imprimir
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);

        } catch (err) {
            console.error("Error al imprimir:", err);
            openModal("Error", "No se pudo generar la vista de impresión.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleExportFiltrado = async () => {
        try {
            setLoading(true);

            const response = await axios.get(PACIENTES_ENDPOINT, {
                params: { limit: 10000, searchTerm: finalSearchTerm }
            });

            const datosFiltrados = response.data.data;

            if (!datosFiltrados || datosFiltrados.length === 0) {
                openModal("Exportar", "No hay resultados.", "info");
                return;
            }

            // 1. Cabezal del archivo XML para Excel
            let xml = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <Worksheet ss:Name="Pacientes">
    <Table>`;

            // 2. Definir los Encabezados
            const headers = ["DOCUMENTO", "NOMBRE COMPLETO", "FECHA NACIMIENTO", "CENTRO", "TELEFONO", "FECHA COMIENZO"];
            xml += '\n   <Row>';
            headers.forEach(h => {
                xml += `\n    <Cell><Data ss:Type="String">${h}</Data></Cell>`;
            });
            xml += '\n   </Row>';

            // 3. Generar las Filas con los datos
            datosFiltrados.forEach(p => {
                const nombre = `${p.nombre1} ${p.nombre2 || ''} ${p.apellido1} ${p.apellido2 || ''}`.replace(/\s+/g, ' ').trim();
                const fechaNac = p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString() : 'N/A';
                const fechaCom = p.fecha_comienzo ? new Date(p.fecha_comienzo).toLocaleDateString() : 'N/A';
                const centro = p.centro_nombre ? p.centro_nombre.trim() : 'N/A';

                xml += `\n   <Row>`;
                xml += `\n    <Cell><Data ss:Type="String">${p.documento || ''}</Data></Cell>`;
                xml += `\n    <Cell><Data ss:Type="String">${nombre}</Data></Cell>`;
                xml += `\n    <Cell><Data ss:Type="String">${fechaNac}</Data></Cell>`;
                xml += `\n    <Cell><Data ss:Type="String">${centro}</Data></Cell>`;
                xml += `\n    <Cell><Data ss:Type="String">${p.telefono || 'N/A'}</Data></Cell>`;
                xml += `\n    <Cell><Data ss:Type="String">${fechaCom}</Data></Cell>`;
                xml += `\n   </Row>`;
            });

            // 4. Cierre del XML
            xml += `\n  </Table>
    </Worksheet>
    </Workbook>`;

            // 5. Crear el Blob y descargar
            const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pacientes_${new Date().getTime()}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            openModal("Exportación", "Archivo Excel generado correctamente.", "success");

        } catch (err) {
            console.error(err);
            openModal("Error", "No se pudo generar el Excel.", "error");
        } finally {
            setLoading(false);
        }
    };

    // Mensajes de carga y error inicial
    if (loading && !showForm && pacientes.length === 0 && finalSearchTerm === '') {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <p>Cargando pacientes desde el backend...</p>
            </div>
        );
    }

    if (error && !showForm) {
        return (
            <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>
                <p>Error al cargar los pacientes: {error}</p>
                <p>Asegúrate de que tu backend Express esté funcionando en el puerto 3000 y que la ruta `/api/pacientes` sea correcta.</p>
            </div>
        );
    }

    // [NUEVA VARIABLE]: Define la condición de búsqueda para simplificar el JSX
    const isSearched = finalSearchTerm !== '';

    return (
        <div className="list-container">
            <div className="main-section-header">
                {showForm ? (
                    <h2 className="form-title">
                        {pacienteToEdit ? `Editar Paciente: ${pacienteToEdit.nombre1} ${pacienteToEdit.apellido1}` : 'Crear Nuevo Paciente'}
                    </h2>
                ) : (
                    <h2>Listado de Pacientes</h2>
                )}
                {showForm && (
                    <button
                        onClick={() => handleCloseForm(false)}
                        className="btn-cancel-fixed-right"
                        title="Cerrar formulario"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                )}
            </div>

            {/* PacientesHeaderControls y el NUEVO componente de filtros de fecha */}
            {!showForm && (
                <>
                    <PacientesHeaderControls
                        showForm={showForm} // Asegúrate de que esta prop se pase si el componente la usa internamente
                        onCreateNew={handleCreateNewClick}
                        onSearch={handleSearchTermChange} 
                        onExport={handleExportFiltrado}  
                        onPrint={handlePrint}
                        // NUEVAS PROPS:
                        selectedCentro={selectedCentro}
                        onCentroChange={(e) => {
                            setSelectedCentro(e.target.value);
                            setCurrentPage(1); // Importante: volver a la página 1 al filtrar
                        }}
                    />                   
                </>
            )}

            {showForm && (
                <PacienteForm
                    onPacienteCreated={handlePacienteCreated}
                    onPacienteUpdated={handlePacienteUpdated}
                    pacienteToEdit={pacienteToEdit}
                    onSuccessClose={() => handleCloseForm(true)}
                />
            )}

            {!showForm && (
                <>
                    {pacientes.length === 0 && !loading && (
                        <p style={{ textAlign: 'center', marginTop: '20px' }}>
                            {isSearched 
                                ? `No se encontraron resultados para "${finalSearchTerm}"` 
                                : "No hay pacientes registrados en el sistema."}
                        </p>
                    )}

                    {pacientes.length > 0 && (
                        <>
                            <PacientesTable
                                pacientes={pacientes}
                                onEdit={handleEditClick}
                                onDelete={handleDeleteClick}
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

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={modalTitle}
                message={modalMessage}
                showConfirmButton={modalType === 'confirm'}
                onConfirm={handleModalConfirm}
                confirmText="Eliminar"
                cancelText="Cancelar"
            />
        </div>
    );
}

export default PacientesContainer;