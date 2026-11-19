import { Router, json } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"
import { confirmarPagoMercadoPago } from "../services/mercadopagoService.js"

export const mercadoPagoWebhookRouter = Router()

function validarFirma({ firma, requestId, pagoId, secret }) {
  if (!firma || !requestId) {
    return false
  }

  const partes = firma.split(",").map((parte) => parte.trim())
  const timestamps = partes.filter((parte) => parte.startsWith("ts="))
  const firmas = partes.filter((parte) => parte.startsWith("v1="))

  if (timestamps.length !== 1 || firmas.length !== 1) {
    return false
  }

  const ts = timestamps[0].slice(3)
  const v1 = firmas[0].slice(3)

  if (!/^\d+$/.test(ts) || !/^[a-fA-F0-9]{64}$/.test(v1)) {
    return false
  }

  const mensaje =
    `id:${pagoId.toLowerCase()};request-id:${requestId};ts:${ts};`

  const esperada = createHmac("sha256", secret)
    .update(mensaje)
    .digest()

  const recibida = Buffer.from(v1, "hex")

  return (
    esperada.length === recibida.length &&
    timingSafeEqual(esperada, recibida)
  )
}

mercadoPagoWebhookRouter.post(
  "/mercadopago",
  json({ limit: "32kb" }),
  async (req, res) => {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()

    if (!secret) {
      console.error("Falta configurar MERCADOPAGO_WEBHOOK_SECRET")
      return res.sendStatus(503)
    }

    // La firma utiliza data.id de la URL.
    const url = new URL(req.originalUrl, "http://localhost")
    const ids = url.searchParams.getAll("data.id")

    if (ids.length !== 1 || !/^[1-9]\d*$/.test(ids[0])) {
      return res.sendStatus(400)
    }

    const pagoId = ids[0]

    const firmaValida = validarFirma({
      firma: req.get("x-signature"),
      requestId: req.get("x-request-id"),
      pagoId,
      secret
    })

    if (!firmaValida) {
      return res.sendStatus(401)
    }

    if (
      req.body?.data?.id != null &&
      String(req.body.data.id) !== pagoId
    ) {
      return res.sendStatus(400)
    }

    const tipo = url.searchParams.get("type") ?? req.body?.type

    if (tipo !== "payment") {
      return res.sendStatus(200)
    }

    try {
      const pedido = await confirmarPagoMercadoPago({
        pagoId,
        omitirNoAcreditados: true
      })

      if (pedido) {
        console.log(
          `[Mercado Pago] Pago ${pagoId} confirmado para pedido ${pedido.id}`
        )
      } else {
        console.log(
          `[Mercado Pago] Pago ${pagoId} recibido sin acreditación`
        )
      }

      return res.sendStatus(200)
    } catch (error) {
      console.error(
        `[Mercado Pago] No se pudo procesar el pago ${pagoId}:`,
        error.message
      )

      return res.sendStatus(500)
    }
  }
)