
import { pool } from "../db/connection.js"
import { paypalRequest } from "../config/paypal.js"
import { getPedidoById } from "../resolvers/helpers.js"

// Convierte montos a centavos para compararlos.
function centavos(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error("El importe del pago no es válido")
  }

  return Math.round(numero * 100)
}

// Comprueba que la orden corresponde a nuestro pedido.
function verificarOrden(orden, pedido, pago) {
  if (
    orden.intent !== "CAPTURE" ||
    orden.purchase_units?.length !== 1
  ) {
    throw new Error("La orden PayPal no es válida")
  }

  const unidad = orden.purchase_units[0]

  if (
    String(unidad.custom_id) !== String(pedido.id) ||
    unidad.amount?.currency_code !== "MXN" ||
    centavos(unidad.amount?.value) !== centavos(pedido.total) ||
    centavos(unidad.amount?.value) !== centavos(pago.monto)
  ) {
    throw new Error(
      "La orden PayPal no coincide con el pedido"
    )
  }

  const vendedor = process.env.PAYPAL_MERCHANT_ID?.trim()

  if (vendedor && unidad.payee?.merchant_id !== vendedor) {
    throw new Error("El vendedor de PayPal no coincide")
  }

  return unidad
}

// 1. CREAR ORDEN
export async function crearOrdenPayPal({
  pedidoId,
  usuarioId
}) {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const resultado = await client.query(
      `SELECT * FROM pedido
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [pedidoId, usuarioId]
    )

    const pedido = resultado.rows[0]

    if (!pedido || pedido.status !== "PENDIENTE") {
      throw new Error("Pedido pendiente no encontrado")
    }

    const pagos = await client.query(
      `SELECT * FROM pago
       WHERE pedido_id = $1
       FOR UPDATE`,
      [pedido.id]
    )

    const pago = pagos.rows[0]

    if (pago?.proveedor !== "PAYPAL") {
      throw new Error("Este pedido no utiliza PayPal")
    }

    if (centavos(pedido.total) !== centavos(pago.monto)) {
      throw new Error("Los importes no coinciden")
    }

    if (pago.estado.startsWith("APROBADO")) {
      throw new Error("Este pago ya fue aprobado")
    }

    // Reutilizar una orden previamente creada.
    if (pago.referencia_externa) {
      const orden = await paypalRequest(
        `/v2/checkout/orders/${encodeURIComponent(pago.referencia_externa)}`
      )

      verificarOrden(orden, pedido, pago)

      if (
        ![
          "CREATED",
          "SAVED",
          "PAYER_ACTION_REQUIRED",
          "APPROVED"
        ].includes(orden.status)
      ) {
        throw new Error(
          "La orden requiere sincronización antes de pagar"
        )
      }

      await client.query("COMMIT")
      return { id: orden.id }
    }

    // Crear la orden directamente en PayPal.
    const orden = await paypalRequest(
      "/v2/checkout/orders",
      {
        method: "POST",
        requestId: `questmerchant-crear-${pedido.id}`,
        body: {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: `QM-${pedido.id}`,
              custom_id: String(pedido.id),
              description: `Quest Merchant - ${pedido.numero_pedido}`,
              amount: {
                currency_code: "MXN",
                value: (
                  centavos(pedido.total) / 100
                ).toFixed(2)
              }
            }
          ]
        }
      }
    )

    if (!orden.id) {
      throw new Error(
        "PayPal no devolvió un identificador"
      )
    }

    // Guardar el ID de la orden PayPal.
    await client.query(
      `UPDATE pago
       SET referencia_externa = $1,
           estado = 'PENDIENTE_PAYPAL'
       WHERE id = $2`,
      [orden.id, pago.id]
    )

    await client.query("COMMIT")

    return { id: orden.id }

  } catch (error) {
    await client.query("ROLLBACK")
    throw error

  } finally {
    client.release()
  }
}

// 2. CAPTURAR ORDEN
export async function capturarOrdenPayPal({
  pedidoId,
  paypalOrderId,
  usuarioId
}) {
  if (!usuarioId || !paypalOrderId) {
    throw new Error("Faltan datos del pago")
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const resultado = await client.query(
      `SELECT * FROM pedido
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [pedidoId, usuarioId]
    )

    const pedido = resultado.rows[0]

    if (!pedido) {
      throw new Error("Pedido no encontrado")
    }

    const pagos = await client.query(
      `SELECT * FROM pago
       WHERE pedido_id = $1
       FOR UPDATE`,
      [pedido.id]
    )

    const pago = pagos.rows[0]

    if (
      pago?.proveedor !== "PAYPAL" ||
      pago.referencia_externa !== paypalOrderId
    ) {
      throw new Error(
        "La orden PayPal no corresponde a este pedido"
      )
    }

    // Evitar procesar nuevamente pagos confirmados.
    if (
      pago.estado === "APROBADO_PAYPAL" &&
      [
        "PAGADO",
        "EN_PREPARACION",
        "ENVIADO",
        "ENTREGADO"
      ].includes(pedido.status)
    ) {
      await client.query("COMMIT")
      return getPedidoById(pedido.id)
    }

    if (pedido.status !== "PENDIENTE") {
      throw new Error(
        "El pedido no permite recibir este pago"
      )
    }

    const ruta = `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`

    let orden = await paypalRequest(ruta)
    let unidad = verificarOrden(orden, pedido, pago)

    // Solo capturar órdenes autorizadas por el comprador.
    if (orden.status === "APPROVED") {
      orden = await paypalRequest(
        `${ruta}/capture`,
        {
          method: "POST",
          requestId: `questmerchant-capturar-${pedido.id}`,
          body: {}
        }
      )

      unidad = verificarOrden(orden, pedido, pago)
    }

    const capturas = unidad.payments?.captures || []

    const captura =
      capturas.length === 1 ? capturas[0] : null

    const confirmado =
      orden.status === "COMPLETED" &&
      captura?.status === "COMPLETED" &&
      Boolean(captura.id) &&
      captura.amount?.currency_code === "MXN" &&
      centavos(captura.amount?.value) ===
        centavos(pedido.total) &&
      centavos(captura.amount?.value) ===
        centavos(pago.monto)

    if (confirmado) {
      await client.query(
        `UPDATE pago
         SET estado = 'APROBADO_PAYPAL'
         WHERE id = $1`,
        [pago.id]
      )

      await client.query(
        `UPDATE pedido
         SET status = 'PAGADO'
         WHERE id = $1`,
        [pedido.id]
      )

    } else {
      await client.query(
        `UPDATE pago
         SET estado = 'PENDIENTE_PAYPAL'
         WHERE id = $1`,
        [pago.id]
      )
    }

    await client.query("COMMIT")

    return getPedidoById(pedido.id)

  } catch (error) {
    await client.query("ROLLBACK")
    throw error

  } finally {
    client.release()
  }
}

// 3. SINCRONIZAR PAGOS
export async function sincronizarPagoPayPal({
  pedidoId,
  usuarioId
}) {
  const resultado = await pool.query(
    `SELECT p.referencia_externa
     FROM pago p
     JOIN pedido o ON o.id = p.pedido_id
     WHERE o.id = $1
       AND o.usuario_id = $2
       AND p.proveedor = 'PAYPAL'`,
    [pedidoId, usuarioId]
  )

  const pago = resultado.rows[0]

  if (!pago?.referencia_externa) {
    throw new Error(
      "Este pedido todavía no tiene una orden PayPal"
    )
  }

  return capturarOrdenPayPal({
    pedidoId,
    paypalOrderId: pago.referencia_externa,
    usuarioId
  })
}


export async function procesarWebhookPayPal({
  paypalOrderId
}) {
  const resultado = await pool.query(
    `SELECT o.id, o.usuario_id, o.status
     FROM pago p
     JOIN pedido o ON o.id = p.pedido_id
     WHERE p.proveedor = 'PAYPAL'
       AND p.referencia_externa = $1`,
    [paypalOrderId]
  )

  const pedido = resultado.rows[0]

  if (!pedido) {
    return { estado: "ORDEN_NO_ENCONTRADA" }
  }

  if (pedido.status === "CANCELADO") {
    console.error(
      `[PayPal] Pago del pedido cancelado ${pedido.id}: revisión manual necesaria`
    )

    return { estado: "REQUIERE_REVISION" }
  }

  const actualizado = await capturarOrdenPayPal({
    pedidoId: pedido.id,
    paypalOrderId,
    usuarioId: pedido.usuario_id
  })

  return { estado: actualizado.status }
}


