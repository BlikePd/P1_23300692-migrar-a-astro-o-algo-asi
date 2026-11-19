import { pool } from "../db/connection.js"
import { GraphQLError } from "graphql"

export function requireAuth(context) {
    if (!context.usuario) {
        throw new GraphQLError("Debes iniciar sesión", {
            extensions: {
                code: "UNAUTHENTICATED"
            }
        })
    }

    return context.usuario
}

export function requireAdmin(context) {
    const usuario = requireAuth(context)

    if (usuario.rol !== "ADMIN") {
        throw new GraphQLError("No tienes permisos para realizar esta acción", {
            extensions: {
                code: "FORBIDDEN"
            }
        })
    }

    return usuario
}

export function id(value) {
    return value === null || value === undefined ? null : String(value)
}

export function money(value) {
    return Number(value || 0)
}

export function iso(value) {
    return value ? new Date(value).toISOString() : null
}

export function mapCategoria(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id)
    }
}

export function mapProducto(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id),
        precio: money(row.precio)
    }
}

export function mapUsuario(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id)
    }
}

export function mapPedido(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id),
        numeroPedido: row.numero_pedido,
        total: money(row.total),
        fecha: iso(row.fecha),
        nombreReceptor: row.nombre_receptor,
        numeroExterior: row.numero_exterior,
        numeroInterior: row.numero_interior,
        codigoPostal: row.codigo_postal
    }
}

export function mapDetalle(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id),
        precio: money(row.precio),
        subtotal: money(row.subtotal)
    }
}

export function mapPago(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id),
        referenciaExterna: row.referencia_externa,
        monto: money(row.monto),
        fecha: iso(row.fecha)
    }
}

export function mapFactura(row) {
    if (!row) return null
    return {
        ...row,
        id: id(row.id),
        fecha: iso(row.fecha)
    }
}

export async function getPedidoById(pedidoId, executor = pool) {
    const result = await executor.query("SELECT * FROM pedido WHERE id = $1", [pedidoId])
    return mapPedido(result.rows[0])
}