
import { Router, raw } from "express"
import {
  verificarWebhookPayPal
} from "../config/paypal.js"
import {
  procesarWebhookPayPal
} from "../services/paypalService.js"

export const paypalWebhookRouter = Router()

paypalWebhookRouter.post(
  "/paypal",
  raw({
    type: "application/json",
    limit: "64kb"
  }),
  async (req, res) => {

    if (!Buffer.isBuffer(req.body)) {
      return res.sendStatus(415)
    }

    let evento
    const cuerpoOriginal = req.body.toString("utf8")

    try {
      evento = JSON.parse(cuerpoOriginal)
    } catch {
      return res.sendStatus(400)
    }

    try {
      // 1. Verificar autenticidad del webhook
      const valido = await verificarWebhookPayPal(
        req.headers,
        cuerpoOriginal
      )

      if (!valido) {
        return res.sendStatus(401)
      }

      const tipo = evento?.event_type

      // 2. Seleccionar los eventos que procesamos
      if (![
        "CHECKOUT.ORDER.APPROVED",
        "PAYMENT.CAPTURE.COMPLETED"
      ].includes(tipo)) {

        if ([
          "PAYMENT.CAPTURE.DENIED",
          "PAYMENT.CAPTURE.REFUNDED",
          "CHECKOUT.PAYMENT-APPROVAL.REVERSED"
        ].includes(tipo)) {
          console.warn(
            `[PayPal] Evento para revisión: ${tipo}, ID ${evento.id}`
          )
        }

        return res.sendStatus(200)
      }

      // 3. Obtener el ID de la orden PayPal
      const paypalOrderId =
        tipo === "CHECKOUT.ORDER.APPROVED"
          ? evento.resource?.id
          : evento.resource?.supplementary_data
              ?.related_ids?.order_id

      if (
        !paypalOrderId ||
        !/^[A-Za-z0-9-]{8,40}$/.test(
          String(paypalOrderId)
        )
      ) {
        console.warn(
          `[PayPal] ${tipo} sin Order ID válido`
        )

        return res.sendStatus(200)
      }

      // 4. Confirmar contra PayPal y actualizar BD
      const resultado = await procesarWebhookPayPal({
        paypalOrderId
      })

      console.info(
        `[PayPal] ${tipo}: ${paypalOrderId}; ${resultado.estado}`
      )

      return res.sendStatus(200)

    } catch (error) {
      console.error(
        "[PayPal] Error al procesar webhook:",
        error.message
      )

      return res.sendStatus(500)
    }
  }
)


