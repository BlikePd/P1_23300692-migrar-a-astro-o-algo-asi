import "dotenv/config"
import { MercadoPagoConfig } from "mercadopago"

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()

if (!accessToken) {
  throw new Error(
    "Falta MERCADOPAGO_ACCESS_TOKEN en el archivo back/.env"
  )
}

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 10000
  }
})