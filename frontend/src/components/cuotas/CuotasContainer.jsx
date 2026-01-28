import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { API_BASE_URL } from '../../config'; // Ajusta los ../ según la carpeta

// Componentes que necesitas crear/asegurar que existen
import CuotaForm from './CuotaForm';         // Formulario para Crear/Editar
import CuotasTable from './CuotasTable';     // La tabla que muestra la lista
import Modal from "../modal/Modal";         // Componente de Modal (como el que usas en pacientes)
import CuotasHeaderControls from './CuotasHeaderControls';

const BASE_URL = `${API_BASE_URL}/valorCuotas`;

function CuotasContainer() {
    // 1. Estados Principales
    const [cuotas, setCuotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [cuotaToEdit, setCuotaToEdit] = useState(null); // Para editar

    // 2. Estados del Modal (Tomado directamente de PacientesContainer)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState('');
    const [modalAction, setModalAction] = useState(null);

    // Funciones del Modal
    const openModal = (title, message, type, action = null) => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType(type);
        setModalAction(() => action);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Limpiar el resto de estados del modal es opcional, pero buena práctica.
        // setModalTitle(''); setModalMessage(''); setModalType(''); setModalAction(null); 
    };

    const handleModalConfirm = async () => {
        if (modalAction) {
            closeModal();
            await modalAction();
        }
    };

    // 3. Función de Obtención de Datos (fetchCuotas)
    const fetchCuotas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Aquí no hay paginación/filtros complejos, solo GET
            const response = await axios.get(BASE_URL);
            
            // La respuesta de tu backend es directamente el array de cuotas
            setCuotas(response.data); 
        } catch (err) {
            console.error("Error al cargar las cuotas:", err.response?.data || err);
            setError(err.response?.data?.message || err.message);
            openModal('Error', `Error al cargar cuotas: ${err.response?.data?.message || err.message}`, 'alert');
        } finally {
            setLoading(false);
        }
    }, []); // Dependencias vacías: se ejecuta solo una vez al montar

    useEffect(() => {
        fetchCuotas();
    }, [fetchCuotas]); // Se ejecuta al montar y cuando fetchCuotas cambie (que no debería, por useCallback)

    // 4. Manejadores de Formulario (Crear/Editar)
    const handleCreateNewClick = () => {
        setCuotaToEdit(null); // Modo crear
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditClick = (cuota) => {
        setCuotaToEdit(cuota); // Pasa la cuota a editar
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCuotaSaved = () => {
        // Esta función se llama después de crear O actualizar.
        // Forzamos la recarga de la lista y cerramos el formulario.
        setShowForm(false);
        setCuotaToEdit(null);
        fetchCuotas(); 
        openModal('Éxito', 'Cuota guardada exitosamente.', 'alert');
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setCuotaToEdit(null);
        // Opcional: fetchCuotas(); si quieres asegurar que la lista esté fresca al cerrar el form
    };

    // --- FUNCIONALIDAD DE EXPORTACIÓN A EXCEL ---
    const handleExportExcel = async () => {
        try {
            setLoading(true);
            const response = await axios.get(BASE_URL);
            const datos = response.data;

            if (!datos || datos.length === 0) {
                openModal("Exportar", "No hay datos para exportar.", "info");
                return;
            }

            let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Cuotas"><Table>`;

            const headers = ["ID", "AÑO", "IMPORTE", "FECHA CREACIÓN"];
            xml += '\n<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';

            datos.forEach(c => {
                xml += `\n<Row>
                    <Cell><Data ss:Type="String">${c.id}</Data></Cell>
                    <Cell><Data ss:Type="String">${c.anio || ''}</Data></Cell>
                    <Cell><Data ss:Type="String">${c.importe || '0'}</Data></Cell>
                    <Cell><Data ss:Type="String">${c.fecha_creacion}</Data></Cell>
                </Row>`;
            });

            xml += '\n</Table></Worksheet></Workbook>';

            const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte_cuotas_${new Date().getFullYear()}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            openModal("Exportación", "Excel generado con éxito.", "success");
        } catch (err) {
            openModal("Error", "No se pudo exportar el archivo.", "error");
        } finally { setLoading(false); }
    };

    // --- FUNCIONALIDAD DE IMPRESIÓN ---
    const handlePrint = async () => {
        try {
            setLoading(true);
            const response = await axios.get(BASE_URL);
            const datos = response.data;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Reporte de Valores de Cuotas</title>
                        <style>
                            /* Configuración de página idéntica */
                            @page { 
                                size: auto;  
                                margin: 15mm; 
                            }
                            
                            body { 
                                font-family: 'Segoe UI', Arial, sans-serif; 
                                margin: 20px; 
                                color: #333; 
                            }

                            /* El título con la misma línea azul profesional */
                            h2 { 
                                text-align: center; 
                                color: #2c3e50; 
                                text-transform: uppercase;
                                border-bottom: 2px solid #3498db; 
                                padding-bottom: 10px; 
                            }

                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin-top: 20px;
                                page-break-inside: auto; 
                            }

                            tr { 
                                page-break-inside: avoid; 
                                page-break-after: auto; 
                            }

                            th, td { 
                                border: 1px solid #dee2e6; 
                                padding: 12px 10px; 
                                text-align: left; 
                                font-size: 13px; 
                            }

                            /* Encabezados grises con soporte para impresión de color */
                            th { 
                                background-color: #f8f9fa !important; 
                                color: #495057;
                                font-weight: bold; 
                                text-transform: uppercase;
                                -webkit-print-color-adjust: exact;
                            }

                            /* Filas cebra */
                            tr:nth-child(even) { 
                                background-color: #f2f2f2 !important; 
                                -webkit-print-color-adjust: exact;
                            }

                            /* Clase para valores numéricos */
                            .text-right { text-align: right; font-family: 'Courier New', monospace; }
                        </style>
                    </head>
                    <body>
                        <h2>Historial de Valores de Cuotas Anuales</h2>
                        <p><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>AÑO</th>
                                    <th>IMPORTE CUOTA ($)</th>
                                    <th>FECHA DE CREACIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datos.map(c => `
                                    <tr>
                                        <td>${c.id}</td>
                                        <td>${c.anio}</td>
                                        <td>$ ${Number(c.importe).toLocaleString()}</td>
                                        <td>${c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleDateString() : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);
            printWindow.document.close();

            // Esperar a que los estilos se apliquen
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (err) {
            openModal("Error", "No se pudo generar la impresión.", "error");
        } finally { setLoading(false); }
    };

    // 5. Manejador de Borrado (DELETE)
    const handleDeleteClick = (id) => {
        openModal(
            'Confirmar eliminación', '¿Seguro que querés eliminar esta cuota?', 'confirm',
            async () => {
                setLoading(true);
                try {
                    // LLAMADA A TU API DELETE
                    await axios.delete(`${BASE_URL}/${id}`); // Axios lanza error en 4xx/5xx

                    fetchCuotas(); // Recarga los datos
                    openModal('Eliminación Exitosa', 'Cuota eliminada exitosamente.', 'alert');
                } catch (err) {
                    // Aquí se captura cualquier error de red O cualquier error 4xx/5xx de tu backend
                    console.error("Error al eliminar la cuota:", err);
                    openModal('Error al Eliminar', `Error al eliminar cuota: ${err.response?.data?.message || err.message}`, 'alert');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    // 6. Renderizado Condicional (similares a PacientesContainer)
    if (loading && cuotas.length === 0) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}><p>Cargando valores de cuotas...</p></div>;
    }

    if (error && !showForm) {
        return <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}><p>Error al cargar las cuotas: {error}</p></div>;
    }

    return (
        <div className="list-container">
            {/* Header y Botón de Cerrar Formulario */}
            <div className="main-section-header">
                {showForm ? (
                    <h2 className="form-title">
                        {cuotaToEdit ? `Editar Cuota: ID ${cuotaToEdit.id}` : 'Crear Nuevo Valor de Cuota'}
                    </h2>
                ) : (
                    <h2>Listado de cuotas anuales</h2>
                )}
                {showForm && (
                    <button
                        onClick={handleCloseForm}
                        className="btn-cancel-fixed-right"
                        title="Cerrar formulario"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                )}
            </div>

            {/* Formulario (Muestra u Oculta) */}
            {showForm && (
                <CuotaForm
                    onCuotaSaved={handleCuotaSaved}
                    cuotaToEdit={cuotaToEdit}
                    onClose={handleCloseForm}
                />
            )}

            {/* Controles y Tabla (Solo si no está mostrando el formulario) */}
            {!showForm && (
                <>
                    <CuotasHeaderControls 
                        onCreateNew={handleCreateNewClick} 
                        showForm={showForm}
                        onPrint={handlePrint}
                        onExport={handleExportExcel}
                    />

                    {cuotas.length === 0 && !loading ? (
                        <p>No hay valores de cuotas registrados.</p>
                    ) : (
                        <CuotasTable
                            cuotas={cuotas}
                            loading={loading} // Pasamos loading para que la tabla pueda mostrar un spinner si carga en segundo plano
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                        />
                    )}
                </>
            )}

            {/* Modal de Confirmación */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={modalTitle}
                message={modalMessage}
                showConfirmButton={modalType === 'confirm'}
                onConfirm={handleModalConfirm}
                confirmText="Confirmar" // Usé "Confirmar" en lugar de "Eliminar" para ser más genérico
                cancelText="Cancelar"
            />
        </div>
    );
}

export default CuotasContainer;
