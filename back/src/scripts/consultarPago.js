import { Payment } from "mercadopago"
import { mercadoPagoClient } from "../config/mercadopago.js"

const pagos = new Payment(mercadoPagoClient)

try {
  const pago = await pagos.get({
    id: "183378798718"
  })

  console.log("Operación:", pago.id)
  console.log("Estado:", pago.status)
  console.log("Detalle:", pago.status_detail)
  console.log("Monto:", pago.transaction_amount)
  console.log("Moneda:", pago.currency_id)
  console.log("Referencia:", pago.external_reference)
  console.log("Modo real:", pago.live_mode)
  console.log("ID comprador:", pago.payer?.id)
  console.log("ID vendedor:", pago.collector_id)
} catch (error) {
  console.error("No se pudo consultar el pago")
  console.error("Estado:", error.status ?? "No disponible")
  console.error("Mensaje:", error.message ?? "Sin mensaje")
  process.exitCode = 1
}