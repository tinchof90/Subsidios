import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faPrint, faChartBar } from '@fortawesome/free-solid-svg-icons';

const API_URL = 'http://localhost:3000/api';

function ReportesContainer() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [reportType, setReportType] = useState(''); // Estado del selector
    const [activeReportType, setActiveReportType] = useState(''); // Estado del reporte cargado
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Limpia la vista previa si el usuario cambia el tipo en el selector para evitar confusión
    useEffect(() => {
        setReportData(null);
        setActiveReportType('');
    }, [reportType]);

    // --- FUNCIÓN PARA OBTENER DATOS DEL BACKEND ---
    const generateReport = useCallback(async () => {
        if (!reportType) {
            Swal.fire("Atención", "Por favor seleccione un tipo de reporte.", "warning");
            return;
        }

        setLoading(true);
        setError(null);
        setReportData(null);

        try {
            const response = await axios.get(`${API_URL}/${reportType}`, {
                params: { 
                    fecha_desde: startDate, 
                    fecha_hasta: endDate 
                }
            });

            const data = response.data.data || response.data;

            if (!data || data.length === 0) {
                Swal.fire("Sin datos", "No se encontraron registros para los filtros seleccionados.", "info");
            } else {
                setReportData(data);
                setActiveReportType(reportType); // Solo aquí confirmamos el tipo de tabla a mostrar
            }
        } catch (err) {
            console.error("Error al generar el reporte:", err);
            setError("No se pudo conectar con el servidor.");
            Swal.fire("Error", "Ocurrió un problema al obtener los datos.", "error");
        } finally {
            setLoading(false);
        }
    }, [reportType, startDate, endDate]);

    // --- EXPORTACIÓN A EXCEL ---
    const handleExportExcel = () => {
        if (!reportData) return;

        let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Reporte"><Table>`;

        if (activeReportType === 'resoluciones') {
            const headers = ["ID", "FECHA", "DESCRIPCIÓN", "ESTADO", "IMPORTE TOTAL", "ITEMS", "EXPEDIENTE"];
            xml += '\n<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';

            reportData.forEach(r => {
                const importeFormateado = `$ ${Number(r.importe_total || 0).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;
                const itemsTexto = r.items_resolucion?.length > 0 
                    ? r.items_resolucion.map(i => `${i.tipo_item_nombre} ($ ${Number(i.importe).toLocaleString()})`).join(' | ')
                    : 'Sin ítems';

                xml += `\n<Row>
                    <Cell><Data ss:Type="String">${r.id_resolucion}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.fecha ? new Date(r.fecha).toLocaleDateString() : '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.descripcion || '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.estado_nombre || 'ACTIVA'}</Data></Cell>
                    <Cell><Data ss:Type="String">${importeFormateado}</Data></Cell>
                    <Cell><Data ss:Type="String">${itemsTexto}</Data></Cell>
                    <Cell><Data ss:Type="String">${r.expediente_id || '-'}</Data></Cell>
                </Row>`;
            });
        } else {
            const headers = ["DOCUMENTO", "NOMBRE COMPLETO", "FECHA NACIMIENTO", "CENTRO", "TELÉFONO", "FECHA COMIENZO", "APODERADO"];
            xml += '\n<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';

            reportData.forEach(p => {
                const nombreCompleto = `${p.nombre1} ${p.nombre2 || ''} ${p.apellido1} ${p.apellido2 || ''}`.replace(/\s+/g, ' ').trim();
                let apoderadoTexto = '-';
                                    if (p.apoderado) {
                                        apoderadoTexto = typeof p.apoderado === 'object' 
                                            ? (p.apoderado.nombre + ' (' + p.apoderado.documento + ')') 
                                            : p.apoderado;
                                    }
                xml += `\n<Row>
                    <Cell><Data ss:Type="String">${p.documento}</Data></Cell>
                    <Cell><Data ss:Type="String">${nombreCompleto}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString() : '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.centro_nombre || '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.telefono || '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${p.fecha_comienzo ? new Date(p.fecha_comienzo).toLocaleDateString() : '-'}</Data></Cell>
                    <Cell><Data ss:Type="String">${apoderadoTexto || '-'}</Data></Cell>
                </Row>`;
            });
        }

        xml += '\n</Table></Worksheet></Workbook>';
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${activeReportType}_${new Date().getTime()}.xls`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // --- IMPRESIÓN ---
    const handlePrint = () => {
        if (!reportData) return;

        const printWindow = window.open('', '_blank');
        const isRes = activeReportType === 'resoluciones';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte - ${activeReportType.toUpperCase()}</title>
                    <style>
                        @page { size: A4 landscape; margin: 10mm; }
                        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333; }
                        h2 { text-align: center; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #dee2e6; padding: 10px; text-align: left; font-size: 11px; }
                        th { background-color: #f8f9fa !important; font-weight: bold; }
                        .text-right { text-align: right; }
                    </style>
                </head>
                <body>
                    <h2>Reporte de ${activeReportType === 'resoluciones' ? 'Resoluciones' : 'Pacientes'}</h2>
                    <table>
                        <thead>
                            <tr>
                                ${isRes 
                                    ? '<th>ID</th><th>FECHA</th><th>DESCRIPCIÓN</th><th>ESTADO</th><th>IMPORTE TOTAL</th><th>ITEMS</th><th>EXPEDIENTE</th>' 
                                    : '<th>DOCUMENTO</th><th>NOMBRE COMPLETO</th><th>FECHA NACIMIENTO</th><th>CENTRO</th><th>TELÉFONO</th><th>FECHA COMIENZO</th><th>APODERADO</th>'
                                }
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.map(r => {
                                if (isRes) {
                                    return `
                                        <tr>
                                            <td>${r.id_resolucion}</td>
                                            <td class="no-wrap">${r.fecha ? new Date(r.fecha).toLocaleDateString() : '-'}</td>
                                            <td>${r.descripcion || '-'}</td>
                                            <td>${r.estado_nombre || 'ACTIVA'}</td>
                                            <td class="text-right">$ ${Number(r.importe_total || 0).toLocaleString()}</td>
                                            <td>
                                                ${r.items_resolucion?.length > 0 
                                                    ? r.items_resolucion.map(i => `${i.tipo_item_nombre} ($${Number(i.importe).toLocaleString()})`).join(', ')
                                                    : 'Sin ítems'}
                                            </td>
                                            <td>${r.expediente_id || '-'}</td>
                                        </tr>`;
                                } else {
                                    // Lógica para el Nombre Completo
                                    const nombreCompleto = `${r.nombre1} ${r.nombre2 || ''} ${r.apellido1} ${r.apellido2 || ''}`.replace(/\s+/g, ' ').trim();
                                    
                                    // Lógica para evitar el [object Object] en Apoderado
                                    // Si es un objeto, intentamos mostrar r.apoderado.nombre o similar. 
                                    // Si no tiene nada, ponemos '-'
                                    let apoderadoTexto = '-';
                                    if (r.apoderado) {
                                        apoderadoTexto = typeof r.apoderado === 'object' 
                                            ? (r.apoderado.nombre + ' (' + r.apoderado.documento + ')') 
                                            : r.apoderado;
                                    }

                                    return `
                                        <tr>
                                            <td>${r.documento}</td>
                                            <td>${nombreCompleto}</td>
                                            <td>${r.fecha_nacimiento ? new Date(r.fecha_nacimiento).toLocaleDateString() : '-'}</td>
                                            <td>${r.centro_nombre || '-'}</td>
                                            <td>${r.telefono || '-'}</td>
                                            <td>${r.fecha_comienzo && r.fecha_comienzo !== '-' ? new Date(r.fecha_comienzo).toLocaleDateString() : '-'}</td>
                                            <td>${apoderadoTexto}</td>
                                        </tr>`;
                                }
                            }).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    return (
        <div className="list-container">
            <div className="main-section-header">
                <h2>Generador de Reportes</h2>
            </div>

            {/* FILTROS Y CONTROLES */}
            <div className="controls-normal" style={{ gap: '15px', flexWrap: 'wrap', display: 'flex', alignItems: 'flex-end' }}>
                <div className="filter-group">
                    <label className="compact-label">Reporte</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="filter-select">
                        <option value="">Seleccione tipo…</option>
                        <option value="resoluciones">Listado de Resoluciones</option>
                        <option value="pacientes">Listado de Pacientes</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="compact-label">Desde:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input-filter" />
                </div>

                <div className="filter-group">
                    <label className="compact-label-hasta">Hasta:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input-filter" />
                </div>
                
                <button onClick={generateReport} className="btn-create" disabled={loading} style={{ minWidth: '150px' }}>
                    <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '8px' }} />
                    {loading ? 'Procesando...' : 'Generar Reporte'}
                </button>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

            {/* VISTA PREVIA */}
            {reportData && activeReportType ? (
                <div className="report-results-area">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#2c3e50', margin: 0 }}>Cantidad de registros: {reportData.length}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handlePrint} className="btn-create btn-icon btn-print"><FontAwesomeIcon icon={faPrint} /></button>
                            <button onClick={handleExportExcel} className="btn-create btn-icon btn-export"><FontAwesomeIcon icon={faFileExcel} /></button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <table className="table">
                            <thead>
                                {activeReportType === 'resoluciones' ? (
                                    <tr>
                                        <th>ID</th><th>Fecha</th><th>Descripción</th><th>Estado</th><th style={{ textAlign: 'right' }}>Importe Total</th><th>Items</th><th>Expediente</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>DOCUMENTO</th><th>NOMBRE COMPLETO</th><th>FECHA NACIMIENTO</th><th>CENTRO</th><th>TELÉFONO</th><th>FECHA COMIENZO</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {reportData.slice(0, 10).map((r) => (
                                    activeReportType === 'resoluciones' ? (
                                        <tr key={r.id_resolucion}>
                                            <td>{r.id_resolucion}</td>
                                            <td>{r.fecha ? new Date(r.fecha).toLocaleDateString() : '-'}</td>
                                            <td>{r.descripcion}</td>
                                            <td><span className="badge bg-primary">{r.estado_nombre || 'ACTIVA'}</span></td>
                                            <td style={{ textAlign: 'right' }}>$ {Number(r.importe_total).toLocaleString('es-UY')}</td>
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {/* RESTAURADO: Detalle de ítems con sus importes */}
                                                {r.items_resolucion?.length > 0 
                                                    ? r.items_resolucion.map(i => `${i.tipo_item_nombre} ($${Number(i.importe).toLocaleString()})`).join(', ')
                                                    : 'Sin ítems'}
                                            </td>
                                            <td>{r.expediente_id}</td>
                                        </tr>
                                    ) : (
                                        <tr key={r.id_paciente}>
                                            <td>{r.documento}</td>
                                            <td>{`${r.nombre1} ${r.nombre2 || ''} ${r.apellido1} ${r.apellido2 || ''}`.trim()}</td>
                                            <td>{r.fecha_nacimiento ? new Date(r.fecha_nacimiento).toLocaleDateString() : '-'}</td>
                                            <td>{r.centro_nombre || '-'}</td>
                                            <td>{r.telefono || '-'}</td>
                                            <td>{r.fecha_comienzo ? new Date(r.fecha_comienzo).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                        <FontAwesomeIcon icon={faChartBar} size="3x" style={{ marginBottom: '15px', opacity: 0.3 }} />
                        <p>Seleccione los filtros y presione "Generar Reporte" para visualizar los resultados.</p>
                    </div>
                )
            )}
        </div>
    );
}

export default ReportesContainer;