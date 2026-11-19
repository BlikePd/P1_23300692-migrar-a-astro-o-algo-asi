import { pool } from "../db/connection.js"
import { requireAdmin, money } from "./helpers.js"

export const dashboardQueries = {
    dashboard: async (_, __, context) => {
            requireAdmin(context)

            const result = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM producto WHERE activo = TRUE)::int AS productos,
          (SELECT COUNT(*) FROM categoria WHERE activo = TRUE)::int AS categorias,
          (SELECT COUNT(*) FROM usuario WHERE activo = TRUE)::int AS usuarios,
          (SELECT COUNT(*) FROM pedido)::int AS pedidos,
          (SELECT COUNT(*) FROM pedido WHERE status = 'PENDIENTE')::int AS pedidos_pendientes,
          (SELECT COUNT(*) FROM pedido WHERE status = 'PAGADO')::int AS pedidos_pagados,
          (SELECT COUNT(*) FROM producto WHERE activo = TRUE AND stock <= 5)::int AS stock_bajo,
          COALESCE((SELECT SUM(total) FROM pedido WHERE status NOT IN ('CANCELADO', 'PENDIENTE')), 0) AS ventas
      `)

            const row = result.rows[0]
            return {
                productos: row.productos,
                categorias: row.categorias,
                usuarios: row.usuarios,
                pedidos: row.pedidos,
                pedidosPendientes: row.pedidos_pendientes,
                pedidosPagados: row.pedidos_pagados,
                stockBajo: row.stock_bajo,
                ventas: money(row.ventas)
            }
        }
}