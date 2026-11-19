
import { useState } from "react"
import { mutateGraphQL } from "../lib/apollo"
import {
  M_CREAR_PREFERENCIA_MERCADO_PAGO
} from "../lib/queries"

export default function MercadoPagoLink({ pedidoId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const generarLink = async () => {
    if (loading) return

    setLoading(true)
    setError("")

    try {
      const respuesta = await mutateGraphQL(
        M_CREAR_PREFERENCIA_MERCADO_PAGO,
        { pedidoId }
      )

      const preferencia =
        respuesta.crearPreferenciaMercadoPago

      const url = preferencia?.url

      if (!url || !url.startsWith("https://")) {
        throw new Error(
          "Mercado Pago no devolvió un enlace válido"
        )
      }

      // Redirigir al checkout oficial
      window.location.assign(url)
    } catch (err) {
      setError(
        err.message ||
        "No fue posible generar el link de pago"
      )
      setLoading(false)
    }
  }

  return (
    <section className="form-card">
      <h3>Pago mediante enlace</h3>

      <p>
        Paga de forma segura en Mercado Pago.
        Podrás elegir entre los medios de pago
        disponibles para tu compra.
      </p>

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={generarLink}
        disabled={loading}
      >
        {loading
          ? "Generando enlace..."
          : "Ir a pagar con Mercado Pago"}
      </button>
    </section>
  )
}
