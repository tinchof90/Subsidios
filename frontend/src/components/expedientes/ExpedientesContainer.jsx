import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import ExpedientesTable from './ExpedientesTable';
import ExpedienteForm from './ExpedienteForm';
import ResolucionForm from '../resoluciones/ResolucionForm';
import PaginationControls from '../paginationControls/PaginationControls';
import ExpedientesHeaderControls from './ExpedientesHeaderControls';

function ExpedientesContainer() {

    const API_BASE_URL = 'http://localhost:3000/api';
    const navigate = useNavigate();

    const [expedientes, setExpedientes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ESTADOS DE PAGINACIÓN Y BÚSQUEDA
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    // ESTADOS PARA FORMULARIO DE EXPEDIENTE
    const [showExpedienteForm, setShowExpedienteForm] = useState(false);
    const [expedienteToEdit, setExpedienteToEdit] = useState(null);
    const [formAction, setFormAction] = useState('add');    
    
    // ESTADOS PARA LA RESOLUCIÓN
    const [showResolucionForm, setShowResolucionForm] = useState(false);
    const [expedienteIdForResolution, setExpedienteIdForResolution] = useState(null);
    const [resolucionToEdit, setResolucionToEdit] = useState(null);   

    // --- Fetch principal de expedientes ---
    const fetchExpedientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Ejemplo de endpoint con parámetros de paginación/búsqueda (ajustar según tu backend)
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm
            };

            const response = await axios.get(`${API_BASE_URL}/expedientes`, { params });  
            
            // **************** INICIO DE LA CORRECCIÓN ****************
            const { data, totalItems, totalPages } = response.data;
            
            setExpedientes(data || []);
            
            // Actualizar el estado con los valores de paginación del backend
            setTotalItems(totalItems || 0);
            setTotalPages(totalPages || 1);
            // **************** FIN DE LA CORRECCIÓN ****************

        } catch (err) {
            console.error("Error fetching expedientes:", err);
            setError('No se pudo cargar la lista de expedientes.');
            Swal.fire('Error', 'No se pudo cargar la lista de expedientes.', 'error');
            setExpedientes([]);
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, currentPage, searchTerm]);

    useEffect(() => { fetchExpedientes(); }, [fetchExpedientes]);

    // --- Handlers de Paginación/Búsqueda ---
    const goToPage = (newPage) => {
        setCurrentPage(newPage);
    };

    const goToPrevPage = () => {
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    const handleSearchChange = (newSearchTerm) => {
        setSearchTerm(newSearchTerm);
        setCurrentPage(1); 
    };

    // --- Handlers de Expediente ---
    const handleAddExpedienteClick = () => {
        setExpedienteToEdit(null);
        setFormAction('add');
        setShowExpedienteForm(true);
    };

    const handleCancelExpedienteForm = () => {
        setShowExpedienteForm(false);
        setExpedienteToEdit(null);
    };

    const handleExpedienteCreated = (newExpediente) => {
        setShowExpedienteForm(false);
        fetchExpedientes();
    };

    const handleExpedienteUpdated = (updatedExpediente) => {
        setShowExpedienteForm(false);
        fetchExpedientes();
    };

    // Mapeo: handleEditExpediente <-> onEdit={handleEditClick}
    const handleEditExpediente = (expediente) => {
        setExpedienteToEdit(expediente);
        setFormAction('edit');
        setShowExpedienteForm(true);
    };
    
    // Mapeo: handleDeleteExpediente <-> onDelete={handleDeleteClick} (Debes implementar esta lógica)
    const handleDeleteExpediente = (id_expediente) => {
        Swal.fire({
            title: 'Confirmar Eliminación',
            text: "¿Estás seguro de que deseas eliminar este expediente?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.delete(`${API_BASE_URL}/expedientes/${id_expediente}`);
                    Swal.fire('Eliminado!', 'El expediente ha sido eliminado con éxito.', 'success');
                    fetchExpedientes(); // Refrescar la lista
                } catch (error) {
                    console.error('Error al eliminar expediente:', error);
                    Swal.fire('Error', 'No se pudo eliminar el expediente.', 'error');
                }
            }
        });
    };

    // --- Handlers para ResolucionForm (Delegación de apertura) ---
    const handleAddNewResolution = (expedienteId) => {
        setExpedienteIdForResolution(expedienteId);
        setResolucionToEdit(null); 
        setShowResolucionForm(true);
    };

    const handleEditResolution = (resolucion) => {
        setExpedienteIdForResolution(resolucion.expediente_id);
        setResolucionToEdit(resolucion); 
        setShowResolucionForm(true);
    };
    
    // Al añadir/actualizar una resolución, recargamos la lista principal de expedientes 
    // y cerramos el formulario de resolución. (ExpedienteForm recargará sus propias resoluciones).
    const handleResolutionAddedOrUpdated = (resolution) => {
        handleCloseResolucionForm();
        fetchExpedientes(); 
    };

    const handleCloseResolucionForm = () => {
        setShowResolucionForm(false);
        setExpedienteIdForResolution(null);
        setResolucionToEdit(null);
    };

    // --- FUNCIONALIDAD DE EXPORTACIÓN A EXCEL ---
    const handleExportExcel = async () => {
        try {
            setLoading(true);
            // Pedimos todos los datos filtrados (sin el límite de la paginación de la tabla)
            const response = await axios.get('http://localhost:3000/api/expedientes', { 
                params: { limit: 10000, search: searchTerm } 
            });
            const datos = response.data.data;

            if (!datos || datos.length === 0) {
                Swal.fire("Exportar", "No hay datos para exportar.", "info");
                return;
            }

            let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Expedientes"><Table>`;

            const headers = ["ID", "FECHA INICIO", "PACIENTE", "RNT", "CASO NUEVO", "ESPECIFICACIÓN"];
            xml += '\n<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';

            datos.forEach(e => {
                const nombrePaciente = `${e.paciente_nombre1 || ''} ${e.paciente_nombre2 || ''} ${e.paciente_apellido1 || ''} ${e.paciente_apellido2 || ''}`.trim() || 'Sin asignar';
                const esCasoNuevo = e.caso_nuevo ? 'Sí' : 'No';
                xml += `\n<Row>
                    <Cell><Data ss:Type="String">${e.id_expediente || '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString() : '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${nombrePaciente}</Data></Cell>
                    <Cell><Data ss:Type="String">${e.rnt}</Data></Cell>
                    <Cell><Data ss:Type="String">${esCasoNuevo || '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${e.especificacion_nombre || 'Pendiente'}</Data></Cell>
                </Row>`;
            });

            xml += '\n</Table></Worksheet></Workbook>';

            const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `reporte_expedientes_${new Date().getTime()}.xls`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Swal.fire("Éxito", "Excel generado correctamente.", "success");
        } catch (err) {
            Swal.fire("Error", "No se pudo exportar el archivo.", "error");
        } finally { setLoading(false); }
    };

    // --- FUNCIONALIDAD DE IMPRESIÓN ---
    const handlePrint = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/expedientes`, { 
                params: { limit: 10000, search: searchTerm } 
            });
            const datos = response.data.data;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <meta charset="utf-8">
                        <title>Reporte de Expedientes</title>
                        <style>
                            @page { size: A4 landscape; margin: 10mm; }
                            body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 20px; color: #333; }
                            h2 { text-align: center; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                            .info-header { margin-bottom: 20px; font-size: 12px; color: #666; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                            th, td { border: 1px solid #dee2e6; padding: 10px 8px; text-align: left; font-size: 11px; }
                            th { background-color: #f8f9fa !important; font-weight: bold; text-transform: uppercase; -webkit-print-color-adjust: exact; }
                            tr:nth-child(even) { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
                            .text-bold { font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <h2>Reporte de Expedientes</h2>
                        <div class="info-header">
                            <strong>Fecha de generación:</strong> ${new Date().toLocaleString()}<br>
                            <strong>Filtro aplicado:</strong> ${searchTerm || 'Todos los registros'}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>FECHA INICIO</th>
                                    <th>PACIENTE</th>
                                    <th>RNT</th>
                                    <th>CASO NUEVO</th>
                                    <th>ESPECIFICACIÓN</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${datos.map(e => {
                                    // 1. Lógica para el booleano
                                    const esCasoNuevo = e.caso_nuevo ? 'SÍ' : 'NO';
                                    
                                    // 2. Construcción del nombre completo (usando tus campos reales)
                                    const nombreCompleto = `${e.paciente_nombre1 || ''} ${e.paciente_nombre2 || ''} ${e.paciente_apellido1 || ''} ${e.paciente_apellido2 || ''}`.trim() || 'SIN ASIGNAR';

                                    return `
                                        <tr>
                                            <td class="text-bold">${e.id_expediente || '-'}</td>
                                            <td>${e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString() : '-'}</td>
                                            <td>${nombreCompleto}</td>
                                            <td>${e.rnt || '-'}</td>
                                            <td>${esCasoNuevo}</td>
                                            <td>${e.especificacion_nombre || 'PENDIENTE'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (err) {
            Swal.fire("Error", "No se pudo generar la impresión.", "error");
        } finally { setLoading(false); }
    };

    // --- Renderizado principal (MODIFICADO para chequear loadingDropdowns) ---
    if (showResolucionForm) {
        return (
            <ResolucionForm
                expedienteId={expedienteIdForResolution}
                resolucionToEdit={resolucionToEdit}
                onResolutionAdded={handleResolutionAddedOrUpdated} 
                onResolutionUpdated={handleResolutionAddedOrUpdated}
                onCancel={handleCloseResolucionForm}                 
            />
        );
    }

    if (showExpedienteForm) {
        return (
            <ExpedienteForm
                expedienteToEdit={expedienteToEdit}
                onExpedienteCreated={handleExpedienteCreated}
                onExpedienteUpdated={handleExpedienteUpdated}
                onClose={handleCancelExpedienteForm}
                onAddNewResolution={handleAddNewResolution}
                onEditResolution={handleEditResolution}
            />
        );
    }

    // EL CÓDIGO FINAL DEBE USAR ESTOS NOMBRES:
    return (
        <div className="list-container">
            {loading ? <div>Cargando...</div> : (
                <>
                    <div className="main-section-header">
                        <h2>Listado de Expedientes</h2>
                    </div>

                    <ExpedientesHeaderControls
                        onCreateNew={handleAddExpedienteClick} 
                        onSearch={handleSearchChange} 
                        searchTerm={searchTerm}
                        onPrint={handlePrint} 
                        onExport={handleExportExcel}
                    />

                    <ExpedientesTable
                        expedientes={expedientes}
                        // CORRECCIÓN: handleEditClick -> handleEditExpediente
                        onEdit={handleEditExpediente} 
                        // CORRECCIÓN: handleDeleteClick -> handleDeleteExpediente
                        onDelete={handleDeleteExpediente}
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
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default ExpedientesContainer;