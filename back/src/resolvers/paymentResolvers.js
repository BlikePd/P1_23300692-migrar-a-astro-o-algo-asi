import { Preference } from "mercadopago"
import { pool } from "../db/connection.js"
import { mercadoPagoClient } from "../config/mercadopago.js"
import { confirmarPagoMercadoPago as confirmarPagoVerificado } from "../services/mercadopagoService.js"
import { cobrarTarjetaIntegrada, consultarPagoIntegrado } from "../services/mercadopagoEmbeddedService.js"
import { crearOrdenPayPal, capturarOrdenPayPal, sincronizarPagoPayPal } from "../services/paypalService.js"
import { mapPago, requireAdmin, requireAuth, getPedidoById } from "./helpers.js"

const preferencias = new Preference(mercadoPagoClient)

const backendUrl = (
  process.env.PUBLIC_BACKEND_URL ||
  "https://quest-merchant-back-seth.onrender.com"
)
  .trim()
  .replace(/\/+$/, "")

if (!backendUrl.startsWith("https://")) {
  throw new Error(
    "PUBLIC_BACKEND_URL debe utilizar HTTPS"
  )
}


export const paymentQueries = {
  pagos: async (_, __, context) => {
    requireAdmin(context)

    const result = await pool.query(
      "SELECT * FROM pago ORDER BY fecha DESC"
    )

    return result.rows.map(mapPago)
  },

  pagosRecientes: async (_, __, context) => {
    requireAdmin(context)

    const result = await pool.query(`
      SELECT *
      FROM pago
      ORDER BY fecha DESC, id DESC
      LIMIT 6
    `)

    return result.rows.map(mapPago)
  }
}


export const paymentMutations = {
  cobrarTarjetaMercadoPago: async (
    _,
    { pedidoId, datos },
    context
  ) => {
    const usuario = requireAuth(context)

    return cobrarTarjetaIntegrada({
      pedidoId,
      usuarioId: usuario.id,
      datos
    })
  },

  consultarPagoMercadoPago: async (
    _,
    { pedidoId },
    context
  ) => {
    const usuario = requireAuth(context)

    return consultarPagoIntegrado({
      pedidoId,
      usuarioId: usuario.id
    })
  },

  crearOrdenPayPal: async (
    _,
    { pedidoId },
    context
  ) => {
    const usuario = requireAuth(context)

    return crearOrdenPayPal({
      pedidoId,
      usuarioId: usuario.id
    })
  },

  capturarOrdenPayPal: async (
    _,
    { pedidoId, paypalOrderId },
    context
  ) => {
    const usuario = requireAuth(context)

    return capturarOrdenPayPal({
      pedidoId,
      paypalOrderId,
      usuarioId: usuario.id
    })
  },

  sincronizarPagoPayPal: async (
    _,
    { pedidoId },
    context
  ) => {
    const usuario = requireAuth(context)

    return sincronizarPagoPayPal({
      pedidoId,
      usuarioId: usuario.id
    })
  },

  crearPreferenciaMercadoPago: async (
    _,
    { pedidoId },
    context
  ) => {
    const usuario = requireAuth(context)

    const pedidoResult = await pool.query(
      `SELECT *
       FROM pedido
       WHERE id = $1
         AND usuario_id = $2`,
      [pedidoId, usuario.id]
    )

    const pedido = pedidoResult.rows[0]

    if (!pedido) {
      throw new Error("Pedido no encontrado")
    }

    if (pedido.status !== "PENDIENTE") {
      throw new Error(
        "Solo puedes pagar pedidos pendientes"
      )
    }

    const pagoResult = await pool.query(
      "SELECT * FROM pago WHERE pedido_id = $1",
      [pedido.id]
    )

    const pago = pagoResult.rows[0]

    if (
      !pago ||
      pago.proveedor !== "MERCADO_PAGO"
    ) {
      throw new Error(
        "Este pedido no tiene Mercado Pago como proveedor"
      )
    }

    if (
      String(pago.estado)
        .toUpperCase()
        .startsWith("APROBADO")
    ) {
      throw new Error(
        "Este pedido ya tiene un pago aprobado"
      )
    }

    const detallesResult = await pool.query(
      `SELECT
         d.producto_id,
         d.cantidad,
         d.precio,
         p.nombre
       FROM detalle_pedido d
       JOIN producto p ON p.id = d.producto_id
       WHERE d.pedido_id = $1
       ORDER BY d.id`,
      [pedido.id]
    )

    if (!detallesResult.rows.length) {
      throw new Error(
        "El pedido no tiene productos"
      )
    }

    const items = detallesResult.rows.map(
      (detalle) => {
        const precio = Number(detalle.precio)
        const cantidad = Number(detalle.cantidad)

        if (
          !Number.isFinite(precio) ||
          precio <= 0 ||
          !Number.isInteger(cantidad) ||
          cantidad <= 0
        ) {
          throw new Error(
            "El pedido contiene un precio o cantidad inválidos"
          )
        }

        return {
          id: String(detalle.producto_id),
          title: detalle.nombre,
          quantity: cantidad,
          unit_price: precio,
          currency_id: "MXN"
        }
      }
    )

    const totalCentavos = items.reduce(
      (total, item) =>
        total +
        Math.round(item.unit_price * 100) *
          item.quantity,
      0
    )

    if (
      totalCentavos !==
        Math.round(Number(pedido.total) * 100) ||
      totalCentavos !==
        Math.round(Number(pago.monto) * 100)
    ) {
      throw new Error(
        "El importe del pago no coincide con el pedido"
      )
    }

    const frontendUrl = process.env.FRONTEND_URL
      ?.trim()
      .replace(/\/+$/, "")

    if (!frontendUrl?.startsWith("https://")) {
      throw new Error(
        "Falta configurar FRONTEND_URL con la URL HTTPS de Netlify"
      )
    }

    const retorno = `${frontendUrl}/pedidos`

    const preferencia = await preferencias.create({
      body: {
        items,

        external_reference: String(pedido.id),

        back_urls: {
          success:
            `${retorno}?mpPedido=${pedido.id}&mpResultado=success`,

          pending:
            `${retorno}?mpPedido=${pedido.id}&mpResultado=pending`,

          failure:
            `${retorno}?mpPedido=${pedido.id}&mpResultado=failure`
        },

        auto_return: "approved",

        notification_url:
          `${backendUrl}/webhooks/mercadopago`
      }
    })

    if (
      !preferencia.id ||
      !preferencia.init_point
    ) {
      throw new Error(
        "Mercado Pago no devolvió el enlace de pago"
      )
    }

    console.log(
      `[Mercado Pago] Preferencia ${preferencia.id} creada para pedido ${pedido.id}`
    )

    return {
      id: preferencia.id,
      url: preferencia.init_point,
      sandboxUrl:
        preferencia.sandbox_init_point ||
        preferencia.init_point
    }
  },

  confirmarPagoMercadoPago: async (
    _,
    { pedidoId, pagoId },
    context
  ) => {
    const usuario = requireAuth(context)

    return confirmarPagoVerificado({
      pagoId,
      pedidoId,
      usuarioId: usuario.id
    })
  },

  actualizarEstadoPago: async (
    _,
    { id: pagoId, estado },
    context
  ) => {
    requireAdmin(context)

    const nuevoEstado = estado.trim()

    if (!nuevoEstado) {
      throw new Error(
        "Debes proporcionar un estado de pago"
      )
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      const actual = await client.query(
        `SELECT *
         FROM pago
         WHERE id = $1
         FOR UPDATE`,
        [pagoId]
      )

      const pagoActual = actual.rows[0]

      if (!pagoActual) {
        throw new Error("Pago no encontrado")
      }

      if (
        ["MERCADO_PAGO", "PAYPAL"].includes(
          pagoActual.proveedor
        ) &&
        nuevoEstado
          .toUpperCase()
          .startsWith("APROBADO")
      ) {
        throw new Error(
          "Los pagos electrónicos deben confirmarse mediante la API de su proveedor"
        )
      }

      const result = await client.query(
        `UPDATE pago
         SET estado = $1
         WHERE id = $2
         RETURNING *`,
        [nuevoEstado, pagoId]
      )

      const pago = result.rows[0]

      if (
        nuevoEstado
          .toUpperCase()
          .startsWith("APROBADO")
      ) {
        await client.query(
          `UPDATE pedido
           SET status = 'PAGADO'
           WHERE id = $1
             AND status = 'PENDIENTE'`,
          [pago.pedido_id]
        )
      }

      await client.query("COMMIT")

      return mapPago(pago)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }
}

export const paymentTypes = {
  Pago: {
    pedido: async (pago) =>
      getPedidoById(pago.pedido_id)
  }
}