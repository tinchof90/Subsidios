const pool = require('../config/database');
const AppError = require('../utils/appError'); // Si lo usas para errores internos del job

const TIPO_ITEM_CONSECUTIVO_ID = 2; // Asume este ID
const ESTADO_SUSPENDIDO_ID = 2;
const ESTADO_FINALIZADO_ID = 3;

async function updateMonthlyResolutionStatus() {
    console.log(`[Job Cron] Ejecutando actualización mensual de cuotas de resoluciones... (${new Date().toLocaleString()})`);
    const client = await pool.connect(); // Usar transacción para el job
    try {
        await client.query('BEGIN');

        // 1. Obtener ítems consecutivo que necesitan ser actualizados
        const itemsToUpdateResult = await client.query(
            `SELECT
                ir.id_item_resolucion,
                ir.resolucion_id,
                ir.importe,
                ir.cantidad_cuotas,
                ir.cuota_actual_item
            FROM
                items_resolucion ir
            JOIN
                resoluciones r ON ir.resolucion_id = r.id_resolucion
            WHERE
                ir.tipo_item_id = $1
                AND ir.cuota_actual_item < ir.cantidad_cuotas
                AND r.estado_id != $2`,
            [TIPO_ITEM_CONSECUTIVO_ID, ESTADO_SUSPENDIDO_ID]
        );

        if (itemsToUpdateResult.rows.length === 0) {
            console.log('[Job Cron] No hay ítems consecutivos para actualizar este mes.');
            await client.query('COMMIT'); // No hay nada que hacer, pero la transacción debe finalizar
            return;
        }

        let updatedItemsCount = 0;
        const resolutionsToPotentiallyFinalize = new Set(); // Para llevar un seguimiento de resoluciones a revisar

        for (const item of itemsToUpdateResult.rows) {
            const nextCuotaItem = item.cuota_actual_item + 1;

            // Actualizar el item_resolucion
            await client.query(
                `UPDATE items_resolucion SET cuota_actual_item = $1 WHERE id_item_resolucion = $2`,
                [nextCuotaItem, item.id_item_resolucion]
            );
            updatedItemsCount++;

            // Si el item alcanza su cantidad máxima de cuotas, su resolución asociada podría finalizar
            if (nextCuotaItem === item.cantidad_cuotas) {
                resolutionsToPotentiallyFinalize.add(item.resolucion_id);
            }
        }

        let finalizedResolutionsCount = 0;
        // 2. Revisar resoluciones para ver si todas sus cuotas consecutivas están finalizadas
        for (const resolucionId of resolutionsToPotentiallyFinalize) {
            const pendingItemsResult = await client.query(
                `SELECT COUNT(*) FROM items_resolucion
                 WHERE resolucion_id = $1
                 AND tipo_item_id = $2 -- Solo consecutivo
                 AND cuota_actual_item < cantidad_cuotas`,
                [resolucionId, TIPO_ITEM_CONSECUTIVO_ID]
            );

            const pendingConsecutiveItems = parseInt(pendingItemsResult.rows[0].count, 10);

            // CORRECCIÓN/SUGERENCIA: Antes de finalizar la resolución, asegúrate de que *todos* los ítems (retroactivos y consecutivos)
            // hayan alcanzado su `cantidad_cuotas`. Un ítem retroactivo (cantidad_cuotas=1) debe haber pasado ya su única cuota (`cuota_actual_item`=1).
            // La lógica actual solo comprueba ítems CONSECUTIVOS.

            // Considera este escenario: Una resolución tiene un ítem retroactivo (ya "finalizado" en su primera cuota)
            // y un ítem consecutivo que acaba de finalizar.
            // Para que la resolución se marque como finalizada, *todos* sus ítems deben haber completado sus cuotas.

            // NUEVA LÓGICA SUGERIDA:
            const allItemsPendingResult = await client.query(
                `SELECT COUNT(*) FROM items_resolucion
                 WHERE resolucion_id = $1
                 AND cuota_actual_item < cantidad_cuotas`, // Sin filtrar por tipo_item_id
                [resolucionId]
            );
            const totalPendingItems = parseInt(allItemsPendingResult.rows[0].count, 10);


            // if (pendingConsecutiveItems === 0) { // Lógica anterior, solo considera consecutivos
            if (totalPendingItems === 0) { // NUEVA LÓGICA: Considera *todos* los ítems de la resolución
                // Si no hay más ítems pendientes (sean consecutivos o retroactivos), la resolución puede finalizarse
                await client.query(
                    `UPDATE resoluciones SET estado_id = $1 WHERE id_resolucion = $2 AND estado_id != $1`, // Usando $1 para ESTADO_FINALIZADO_ID
                    [ESTADO_FINALIZADO_ID, resolucionId] // Pasa la constante como primer parámetro
                );
                if (client.query.rowCount > 0) { // Si realmente se actualizó una fila
                    finalizedResolutionsCount++;
                }
            }
        }

        await client.query('COMMIT'); // Confirmar la transacción

        console.log(`[Job Cron] Job completado. ${updatedItemsCount} ítems actualizados, ${finalizedResolutionsCount} resoluciones finalizadas.`);

    } catch (error) {
        await client.query('ROLLBACK'); // Revertir la transacción
        console.error('[Job Cron] ERROR en la actualización mensual de resoluciones:', error);
        // next(new AppError('Error al actualizar resolución.', 500)); // Los jobs no usan next
    } finally {
        client.release();
    }
}

module.exports = { updateMonthlyResolutionStatus };