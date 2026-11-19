import { Payment } from "mercadopago"
import { pool } from "../db/connection.js"
import { mercadoPagoClient } from "../config/mercadopago.js"
import { getPedidoById } from "../resolvers/helpers.js"

const pagosMercadoPago = new Payment(mercadoPagoClient)

const centavos = (valor) => Math.round(Number(valor) * 100)

export async function confirmarPagoMercadoPago({
  pagoId,
  pedidoId,
  usuarioId,
  omitirNoAcreditados = false
}) {
  if (!/^[1-9]\d*$/.test(String(pagoId))) {
    throw new Error("El número de operación no es válido")
  }

  const vendedorId = process.env.MERCADOPAGO_SELLER_ID?.trim()

  if (!vendedorId) {
    throw new Error("Falta configurar MERCADOPAGO_SELLER_ID")
  }

  // En la confirmación manual, comprobar primero el propietario.
  if (usuarioId != null) {
    const acceso = await pool.query(
      `SELECT id
       FROM pedido
       WHERE id = $1 AND usuario_id = $2`,
      [pedidoId, usuarioId]
    )

    if (!acceso.rows.length) {
      throw new Error("Pedido no encontrado")
    }

    pedidoId = acceso.rows[0].id
  }

  const pagoMP = await pagosMercadoPago.get({
    id: String(pagoId)
  })

  if (String(pagoMP.id) !== String(pagoId)) {
    throw new Error("La operación recibida no coincide")
  }

  const referencia = String(pagoMP.external_reference ?? "")

  if (!/^[1-9]\d*$/.test(referencia)) {
    throw new Error("La operación no tiene una referencia de pedido válida")
  }

  if (pedidoId != null && referencia !== String(pedidoId)) {
    throw new Error("La operación no corresponde a este pedido")
  }

  if (String(pagoMP.collector_id) !== vendedorId) {
    throw new Error("El pago no corresponde al vendedor configurado")
  }

  if (pagoMP.currency_id !== "MXN") {
    throw new Error("La moneda del pago no es MXN")
  }

  if (
  pagoMP.status !== "approved" ||
  pagoMP.status_detail !== "accredited"
  ) {
    if (omitirNoAcreditados) {
      return null
    }
    throw new Error(
      `El pago todavía no está acreditado. Estado: ${pagoMP.status}`
    )
}

  if (Number(pagoMP.transaction_amount_refunded ?? 0) !== 0) {
    throw new Error("La operación tiene un reembolso")
  }

  const montoMP = Number(pagoMP.transaction_amount)

  if (!Number.isFinite(montoMP) || montoMP <= 0) {
    throw new Error("El importe de la operación no es válido")
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const pedidoResult = await client.query(
      `SELECT *
       FROM pedido
       WHERE id = $1
       FOR UPDATE`,
      [referencia]
    )

    const pedido = pedidoResult.rows[0]

    if (
      !pedido ||
      (
        usuarioId != null &&
        String(pedido.usuario_id) !== String(usuarioId)
      )
    ) {
      throw new Error("Pedido no encontrado")
    }

    if (pedido.status === "CANCELADO") {
      throw new Error(
        "El pedido está cancelado. El pago requiere revisión"
      )
    }

    const pagoResult = await client.query(
      `SELECT *
       FROM pago
       WHERE pedido_id = $1
       FOR UPDATE`,
      [pedido.id]
    )

    const pagoLocal = pagoResult.rows[0]

    if (!pagoLocal || pagoLocal.proveedor !== "MERCADO_PAGO") {
      throw new Error("El pedido no tiene un pago de Mercado Pago")
    }

    if (
      centavos(montoMP) !== centavos(pedido.total) ||
      centavos(montoMP) !== centavos(pagoLocal.monto)
    ) {
      throw new Error("El importe pagado no coincide con el pedido")
    }

    if (
      pagoLocal.referencia_externa &&
      String(pagoLocal.referencia_externa) !== String(pagoMP.id)
    ) {
      throw new Error("Este pedido ya tiene otra operación asociada")
    }

    const yaConfirmado =
      pagoLocal.estado === "APROBADO_MERCADO_PAGO" &&
      String(pagoLocal.referencia_externa) === String(pagoMP.id)

    if (!yaConfirmado) {
      if (pedido.status !== "PENDIENTE") {
        throw new Error(
          "El estado actual del pedido requiere revisión"
        )
      }

      await client.query(
        `UPDATE pago
         SET estado = 'APROBADO_MERCADO_PAGO',
             referencia_externa = $1
         WHERE id = $2`,
        [String(pagoMP.id), pagoLocal.id]
      )

      await client.query(
        `UPDATE pedido
         SET status = 'PAGADO'
         WHERE id = $1`,
        [pedido.id]
      )
    }

    const resultado = await getPedidoById(pedido.id, client)

    await client.query("COMMIT")
    return resultado
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}