
import "dotenv/config"
import { createHash } from "node:crypto"
import { Payment } from "mercadopago"
import { mercadoPagoClient } from "../config/mercadopago.js"

const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()

if (!token) {
  throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN")
}

const huellaToken = createHash("sha256")
  .update(token)
  .digest("hex")
  .slice(0, 12)

console.log("=== CONFIGURACIÓN MERCADO PAGO ===")
console.log(
  "Vendedor configurado:",
  process.env.MERCADOPAGO_SELLER_ID
)
console.log("Huella del token:", huellaToken)

try {
  const respuesta = await fetch(
    "https://api.mercadolibre.com/users/me",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )

  const cuenta = await respuesta.json()

  console.log("HTTP identidad:", respuesta.status)
  console.log("Usuario del token:", cuenta.id ?? "No disponible")
} catch (error) {
  console.log("Error consultando identidad:", error.message)
}

const pagos = new Payment(mercadoPagoClient)

for (const id of process.argv.slice(2)) {
  try {
    const pago = await pagos.get({ id })

    console.log(`\n=== PAGO ${id} ===`)
    console.log("Vendedor real:", pago.collector_id)
    console.log("Pedido:", pago.external_reference)
    console.log("Estado:", pago.status)
    console.log("Detalle:", pago.status_detail)
    console.log("Importe:", pago.transaction_amount)
    console.log("Modo real:", pago.live_mode)
  } catch (error) {
    console.log(`\nPago ${id}: no se pudo consultar`)
    console.log("HTTP:", error.status ?? "Desconocido")
    console.log("Error:", error.message)
  }
}
