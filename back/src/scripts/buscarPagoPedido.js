import "dotenv/config"
import { Payment } from "mercadopago"
import { mercadoPagoClient } from "../config/mercadopago.js"

const pagos = new Payment(mercadoPagoClient)

const pedidoId = "15"

const intentoId =
  "567089f6-063e-49d6-9e4a-16c3747e3996"

try {
  const respuesta = await pagos.search({
    options: {
      external_reference: pedidoId,
      sort: "date_created",
      criteria: "desc",
      limit: 100
    }
  })

  const operaciones = respuesta.results || []

  console.log(
    "Operaciones encontradas:",
    operaciones.length
  )

  console.log(
    "Total informado por Mercado Pago:",
    respuesta.paging?.total ?? "No disponible"
  )

  console.table(
    operaciones.map((pago) => ({
      pagoId: String(pago.id),
      estado: pago.status,
      detalle: pago.status_detail,
      monto: pago.transaction_amount,
      moneda: pago.currency_id,
      pedido: pago.external_reference,
      mismoIntento:
        String(pago.metadata?.intento_id) === intentoId
    }))
  )
}   catch (error) {
    const http =
      error.status ?? error.statusCode ?? "sin respuesta"

    const causas = Array.isArray(error.cause)
      ? error.cause.map((causa) => ({
          code: causa.code,
          description: causa.description
        }))
      : []

    console.error("[Mercado Pago] Falló la creación:", {
      pedidoId: pedido.id,
      intentoId: intento.id,
      http,
      message: error.message,
      causas
    })

    await pool.query(
      `UPDATE intento_pago_mp
       SET estado = 'REVISION'
       WHERE id = $1`,
      [intento.id]
    )

    const codigos = causas
      .map((causa) => causa.code)
      .filter((codigo) => codigo != null)
      .join(", ")

    throw new Error(
      `Mercado Pago no confirmó la solicitud. HTTP: ${http}.` +
      (codigos ? ` Código: ${codigos}.` : "") +
      " El intento quedó en revisión."
    )
  }