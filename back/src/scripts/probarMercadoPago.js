import { Preference } from "mercadopago"
import { mercadoPagoClient } from "../config/mercadopago.js"

const preferencias = new Preference(mercadoPagoClient)

try {
  const resultado = await preferencias.create({
    body: {
      items: [
        {
          id: "prueba-001",
          title: "Producto de prueba - Quest Merchant",
          quantity: 1,
          unit_price: 10,
          currency_id: "MXN"
        }
      ],
      external_reference: `prueba-${Date.now()}`
    }
  })

  console.log("Preferencia creada correctamente")
  console.log("ID:", resultado.id)
  console.log("Enlace de checkout:", resultado.init_point)
  console.log("Enlace sandbox:", resultado.sandbox_init_point)
} catch (error) {
  console.error("No se pudo crear la preferencia")
  console.error("Estado:", error.status ?? "No disponible")
  console.error("Mensaje:", error.message ?? "Sin mensaje")
  process.exitCode = 1
}