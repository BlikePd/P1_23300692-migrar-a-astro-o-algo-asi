import "dotenv/config"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

const consola = createInterface({
  input: stdin,
  output: stdout
})

try {
  const token = (
    await consola.question("Token de tarjeta a consultar: ")
  ).trim()

  const respuesta = await fetch(
    `https://api.mercadopago.com/v1/card_tokens/${encodeURIComponent(token)}`,
    {
      headers: {
        Authorization:
          `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()}`
      }
    }
  )

  const datos = await respuesta.json()

  console.log({
    http: respuesta.status,
    estadoToken: datos.status,
    liveMode: datos.live_mode,
    message: datos.message,
    error: datos.error
  })
} finally {
  consola.close()
}