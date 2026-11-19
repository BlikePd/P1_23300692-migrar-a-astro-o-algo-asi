import { useEffect, useId, useRef, useState } from "react"
import { mutateGraphQL } from "../lib/apollo"
import { M_COBRAR_TARJETA_MP, M_CONSULTAR_PAGO_MP } from "../lib/queries"

let sdkPromise

function cargarSDK() {
  if (window.MercadoPago) {
    return Promise.resolve()
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")

      script.src = "https://sdk.mercadopago.com/js/v2"
      script.async = true

      script.onload = () => {
        if (window.MercadoPago) {
          resolve()
        } else {
          script.remove()
          reject(
            new Error("No se pudo inicializar Mercado Pago")
          )
        }
      }

      script.onerror = () => {
        script.remove()
        reject(
          new Error("No se pudo cargar Mercado Pago")
        )
      }

      document.head.appendChild(script)
    }).catch((error) => {
      sdkPromise = undefined
      throw error
    })
  }

  return sdkPromise
}

export default function MercadoPagoCard({
  pedidoId,
  amount,
  email,
  onSuccess
}) {
  const reactId = useId()

  const containerId =
    `mp-card-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`

  const publicKey =
    import.meta.env.PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim()

  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const ocupado = useRef(false)

  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState("")
  const [consultando, setConsultando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [listo, setListo] = useState(false)
  const [version, setVersion] = useState(0)

  const mostrarFormulario = [
    "ready",
    "rejected",
    "cancelled"
  ].includes(resultado?.estado)
  useEffect(() => {
    if (!publicKey) return

    let cancelado = false

    async function consultarInicial() {
      setConsultando(true)
      setError("")
      setResultado(null)

      try {
        const respuesta = await mutateGraphQL(
          M_CONSULTAR_PAGO_MP,
          { pedidoId }
        )

        if (cancelado) return

        const pago =
          respuesta.consultarPagoMercadoPago

        setResultado(pago)

        if (pago.estado === "approved") {
          onSuccessRef.current?.(pago.pedido)
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err.message ||
            "No se pudo consultar el pedido"
          )
        }
      } finally {
        if (!cancelado) {
          setConsultando(false)
        }
      }
    }

    consultarInicial()

    return () => {
      cancelado = true
    }
  }, [pedidoId, publicKey])

  useEffect(() => {
    if (!publicKey || !mostrarFormulario) return

    let cancelado = false
    let controller

    setListo(false)

    async function montarFormulario() {
      try {
        await cargarSDK()

        if (cancelado) return

        const mp = new window.MercadoPago(
          publicKey,
          { locale: "es-MX" }
        )

        controller = await mp.bricks().create(
          "cardPayment",
          containerId,
          {
            initialization: {
              amount: Number(amount),
              payer: {
                email: email || ""
              }
            },

            callbacks: {
              onReady: () => {
                if (!cancelado) {
                  setListo(true)
                }
              },

              onError: () => {
                if (!cancelado) {
                  setError(
                    "Revisa los datos de la tarjeta. " +
                    "Si el formulario no carga, comprueba " +
                    "tu conexión y la Public Key."
                  )
                }
              },

              onSubmit: async (formData) => {
                if (ocupado.current || cancelado) return

                ocupado.current = true
                setProcesando(true)
                setError("")

                try {
                  const respuesta = await mutateGraphQL(
                    M_COBRAR_TARJETA_MP,
                    {
                      pedidoId,
                      datos: {
                        token: formData.token,

                        paymentMethodId:
                          formData.payment_method_id,

                        issuerId:
                          formData.issuer_id == null
                            ? null
                            : String(formData.issuer_id),

                        installments:
                          Number(formData.installments),

                        email: formData.payer.email,

                        identificationType:
                          formData.payer.identification
                            ?.type || null,

                        identificationNumber:
                          formData.payer.identification
                            ?.number || null
                      }
                    }
                  )

                  if (cancelado) return

                  const pago =
                    respuesta.cobrarTarjetaMercadoPago

                  setResultado(pago)

                  if (pago.estado === "approved") {
                    onSuccessRef.current?.(pago.pedido)
                  } else if (
                    ["rejected", "cancelled"].includes(
                      pago.estado
                    )
                  ) {
                    setVersion((actual) => actual + 1)
                  }
                } catch (err) {
                   if (cancelado) return
                    setError(
                      err.message || "No se pudo confirmar el pago"
                    )

                    try {
                      const consulta = await mutateGraphQL(
                        M_CONSULTAR_PAGO_MP,
                        { pedidoId }
                      )

                      if (cancelado) return

                      const verificado =
                        consulta.consultarPagoMercadoPago

                      setResultado(verificado)

                      if (verificado.estado === "approved") {
                        onSuccessRef.current?.(verificado.pedido)
                      }
                    } catch {
                      if (!cancelado) {
                        setResultado({
                          estado: "pending",
                          mensaje:
                            "No pudimos confirmar el resultado del cobro. " +
                            "No realices otro pago hasta revisar " +
                            "esta operación."
                        })
                      }
                    }
                } finally {
                  ocupado.current = false
                  if (!cancelado) {
                    setProcesando(false)
                  }
                }
              }
            }
          }
        )

        if (cancelado) {
          await controller.unmount()
        }
      } catch {
        if (!cancelado) {
          setError(
            "No se pudo iniciar el formulario. " +
            "Comprueba tu conexión y la Public Key."
          )
        }
      }
    }

    montarFormulario()

    return () => {
      cancelado = true
      controller?.unmount()
    }
  }, [
    publicKey,
    mostrarFormulario,
    containerId,
    pedidoId,
    amount,
    email,
    version
  ])

  async function verificarEstado() {
    if (ocupado.current) return

    ocupado.current = true
    setConsultando(true)
    setError("")

    try {
      const respuesta = await mutateGraphQL(
        M_CONSULTAR_PAGO_MP,
        { pedidoId }
      )

      const pago =
        respuesta.consultarPagoMercadoPago

      setResultado(pago)

      if (pago.estado === "approved") {
        onSuccessRef.current?.(pago.pedido)
      }
    } catch (err) {
      setError(
        err.message ||
        "No se pudo consultar el estado del pago"
      )
    } finally {
      ocupado.current = false
      setConsultando(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="inline-error" role="alert">
        Falta configurar
        {" "}
        PUBLIC_MERCADOPAGO_PUBLIC_KEY
        {" "}
        en el frontend.
      </div>
    )
  }

  return (
    <section
      className="embedded-payment"
      aria-label="Pago con tarjeta"
    >
      <h3>Tarjeta de crédito o débito</h3>

      <p>
        Completa el pago aquí. Mercado Pago protege
        los datos de tu tarjeta.
      </p>

      {resultado?.mensaje && (
        <div className="notice-card" role="status">
          {resultado.mensaje}
        </div>
      )}

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}

      {consultando && (
        <p role="status">
          Consultando el estado del pago...
        </p>
      )}

      {mostrarFormulario && (
        <div
          style={{ position: "relative" }}
          aria-busy={procesando}
        >
          {!listo && (
            <p>Cargando formulario seguro...</p>
          )}

          <div id={containerId} />

          {procesando && (
            <div
              role="status"
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.85)",
                display: "grid",
                placeItems: "center",
                zIndex: 5
              }}
            >
              <strong>Verificando el pago...</strong>
            </div>
          )}
        </div>
      )}

      {resultado?.estado !== "approved" && (
        <button
          type="button"
          className="ghost"
          onClick={verificarEstado}
          disabled={consultando || procesando}
        >
          Verificar estado del pago
        </button>
      )}
    </section>
  )
}