
import { pool } from "../db/connection.js"
import { mapDetalle, mapUsuario, mapPago, mapFactura, mapPedido, requireAuth, requireAdmin, money } from "./helpers.js"

export const orderQueries = {
    pedidos: async (_, __, context) => {
        requireAdmin(context)

        const result = await pool.query(
            "SELECT * FROM pedido ORDER BY fecha DESC"
        )

        return result.rows.map(mapPedido)
    },

    misPedidos: async (_, __, context) => {
        const usuario = requireAuth(context)

        const result = await pool.query(
            "SELECT * FROM pedido WHERE usuario_id = $1 ORDER BY fecha DESC",
            [usuario.id]
        )

        return result.rows.map(mapPedido)
    },
}

export const orderMutations = {
    registrarPedido: async (_, { datos }, context) => {
        const usuario = requireAuth(context)
        const client = await pool.connect()

        try {
            await client.query("BEGIN")

            if (!datos.detalles.length) {
                throw new Error("El carrito está vacío")
            }

            let total = 0
            const productos = []

            for (const detalle of datos.detalles) {
                const result = await client.query(
                    "SELECT * FROM producto WHERE id = $1 AND activo = TRUE FOR UPDATE",
                    [detalle.productoId]
                )

                const producto = result.rows[0]

                if (!producto) {
                    throw new Error(
                        `El producto ${detalle.productoId} no existe`
                    )
                }

                if (detalle.cantidad < 1) {
                    throw new Error(
                        "La cantidad debe ser mayor a cero"
                    )
                }

                if (producto.stock < detalle.cantidad) {
                    throw new Error(
                        `Stock insuficiente para ${producto.nombre}`
                    )
                }

                const subtotal =
                    money(producto.precio) * detalle.cantidad

                total += subtotal

                productos.push({
                    producto,
                    cantidad: detalle.cantidad,
                    subtotal
                })
            }

            const numeroPedido =
                `QM-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`

            const d = datos.direccion

            const pedidoResult = await client.query(
                `INSERT INTO pedido (
                    numero_pedido,
                    total,
                    status,
                    usuario_id,
                    nombre_receptor,
                    calle,
                    numero_exterior,
                    numero_interior,
                    colonia,
                    ciudad,
                    estado,
                    codigo_postal,
                    referencias,
                    notas
                )
                VALUES (
                    $1, $2, 'PENDIENTE', $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12, $13
                )
                RETURNING *`,
                [
                    numeroPedido,
                    total,
                    usuario.id,
                    d.nombreReceptor,
                    d.calle,
                    d.numeroExterior,
                    d.numeroInterior || null,
                    d.colonia,
                    d.ciudad,
                    d.estado,
                    d.codigoPostal,
                    d.referencias || null,
                    d.notas || null
                ]
            )

            const pedido = pedidoResult.rows[0]

            for (const item of productos) {
                await client.query(
                    `INSERT INTO detalle_pedido (
                        pedido_id,
                        producto_id,
                        cantidad,
                        precio,
                        subtotal
                    )
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        pedido.id,
                        item.producto.id,
                        item.cantidad,
                        item.producto.precio,
                        item.subtotal
                    ]
                )

                await client.query(
                    `UPDATE producto
                     SET stock = stock - $1
                     WHERE id = $2`,
                    [
                        item.cantidad,
                        item.producto.id
                    ]
                )
            }

            await client.query(
                `INSERT INTO pago (
                    pedido_id,
                    proveedor,
                    monto,
                    estado
                )
                VALUES (
                    $1, $2, $3, 'PENDIENTE_INTEGRACION'
                )`,
                [
                    pedido.id,
                    datos.proveedorPago,
                    total
                ]
            )

            await client.query("COMMIT")

            return mapPedido(pedido)

        } catch (error) {
            await client.query("ROLLBACK")
            throw error

        } finally {
            client.release()
        }
    },

    actualizarEstadoPedido: async (
        _,
        { id: pedidoId, status },
        context
    ) => {
        requireAdmin(context)

        const client = await pool.connect()

        try {
            await client.query("BEGIN")

            const actualResult = await client.query(
                `SELECT *
                 FROM pedido
                 WHERE id = $1
                 FOR UPDATE`,
                [pedidoId]
            )

            const actual = actualResult.rows[0]

            if (!actual) {
                throw new Error("Pedido no encontrado")
            }

            const estadosQueRequierenPago = [
                "PAGADO",
                "EN_PREPARACION",
                "ENVIADO",
                "ENTREGADO"
            ]

            if (
                actual.status === "PENDIENTE" &&
                estadosQueRequierenPago.includes(status)
            ) {
                throw new Error(
                    "No puedes avanzar un pedido pendiente sin confirmar su pago mediante el proveedor"
                )
            }

            if (
                actual.status === "CANCELADO" &&
                status !== "CANCELADO"
            ) {
                throw new Error(
                    "Un pedido cancelado no puede reactivarse"
                )
            }

            if (
                actual.status !== "CANCELADO" &&
                status === "CANCELADO"
            ) {
                const detalles = await client.query(
                    `SELECT producto_id, cantidad
                     FROM detalle_pedido
                     WHERE pedido_id = $1`,
                    [pedidoId]
                )

                for (const detalle of detalles.rows) {
                    await client.query(
                        `UPDATE producto
                         SET stock = stock + $1
                         WHERE id = $2`,
                        [
                            detalle.cantidad,
                            detalle.producto_id
                        ]
                    )
                }
            }

            const result = await client.query(
                `UPDATE pedido
                 SET status = $1
                 WHERE id = $2
                 RETURNING *`,
                [status, pedidoId]
            )

            if (status === "PAGADO") {
                await client.query(
                    `UPDATE pago
                     SET estado = 'APROBADO_LOCAL'
                     WHERE pedido_id = $1
                       AND estado = 'PENDIENTE_INTEGRACION'
                       AND proveedor NOT IN (
                           'MERCADO_PAGO',
                           'PAYPAL'
                       )`,
                    [pedidoId]
                )
            }

            await client.query("COMMIT")

            return mapPedido(result.rows[0])

        } catch (error) {
            await client.query("ROLLBACK")
            throw error

        } finally {
            client.release()
        }
    },
}

export const orderTypes = {
    Pedido: {
        usuario: async (pedido) => {
            if (!pedido.usuario_id) return null

            const result = await pool.query(
                `SELECT id, nombre, email, rol, activo
                 FROM usuario
                 WHERE id = $1`,
                [pedido.usuario_id]
            )

            return mapUsuario(result.rows[0])
        },

        detalles: async (pedido) => {
            const result = await pool.query(
                `SELECT *
                 FROM detalle_pedido
                 WHERE pedido_id = $1
                 ORDER BY id`,
                [pedido.id]
            )

            return result.rows.map(mapDetalle)
        },

        pago: async (pedido) => {
            const result = await pool.query(
                `SELECT *
                 FROM pago
                 WHERE pedido_id = $1`,
                [pedido.id]
            )

            return mapPago(result.rows[0])
        },

        factura: async (pedido) => {
            const result = await pool.query(
                `SELECT *
                 FROM factura
                 WHERE pedido_id = $1`,
                [pedido.id]
            )

            return mapFactura(result.rows[0])
        }
    },
}
