import { pool } from "../db/connection.js"
import { mapFactura, getPedidoById, requireAdmin } from "./helpers.js"

export const invoiceQueries = {
    facturas: async (_, __, context) => {
            requireAdmin(context)

            const result = await pool.query("SELECT * FROM factura ORDER BY fecha DESC")
            return result.rows.map(mapFactura)
        },
}

export const invoiceMutations = {
    prepararFactura: async (_, { pedidoId }, context) => {
            requireAdmin(context)

            const pedidoResult = await pool.query(
                "SELECT * FROM pedido WHERE id = $1",
                [pedidoId]
            )

            const pedido = pedidoResult.rows[0]

            if (!pedido) {
                throw new Error("Pedido no encontrado")
            }

            if (pedido.status !== "PAGADO") {
                throw new Error("El pedido debe estar pagado antes de preparar la factura")
            }

            const result = await pool.query(
                `INSERT INTO factura (pedido_id, estado)
                VALUES ($1, 'PENDIENTE_SOAP')
                ON CONFLICT (pedido_id) DO UPDATE
                SET pedido_id = EXCLUDED.pedido_id
                RETURNING *`,
                [pedidoId]
            )

            return mapFactura(result.rows[0])
        },
}

export const invoiceTypes = {
    Factura: {
        pedido: async (factura) => getPedidoById(factura.pedido_id)
    }
}