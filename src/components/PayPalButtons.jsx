import {
  useEffect,
  useRef,
  useState
} from "react"
import {
  PayPalProvider,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFields,
  usePayPalCardFieldsOneTimePaymentSession,
  useEligibleMethods
} from "@paypal/react-paypal-js/sdk-v6"
import { mutateGraphQL } from "../lib/apollo"
import {
  M_CREAR_ORDEN_PAYPAL,
  M_CAPTURAR_ORDEN_PAYPAL,
  M_SINCRONIZAR_PAGO_PAYPAL
} from "../lib/queries"

const clientId =
  import.meta.env.PUBLIC_PAYPAL_CLIENT_ID?.trim()

const environment =
  import.meta.env.PUBLIC_PAYPAL_ENV === "production"
    ? "production"
    : "sandbox"

const estadosPagados = [
  "PAGADO",
  "EN_PREPARACION",
  "ENVIADO",
  "ENTREGADO"
]

const estiloCampo = {
  height: "52px",
  width: "100%",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  overflow: "hidden"
}

function FormularioTarjeta({ pedidoId, onSuccess }) {
  const [nombre, setNombre] = useState("")
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [requiereVerificacion, setRequiereVerificacion] =
    useState(false)
  const [pagado, setPagado] = useState(false)

  const ocupado = useRef(false)
  const respuestaProcesada = useRef(null)

  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const { error: fieldsError } =
    usePayPalCardFields()

  const {
    submit,
    submitResponse,
    error: submitError
  } = usePayPalCardFieldsOneTimePaymentSession()

  useEffect(() => {
    if (
      !submitResponse ||
      respuestaProcesada.current === submitResponse
    ) {
      return
    }

    respuestaProcesada.current = submitResponse

    if (submitResponse.state !== "succeeded") {
      ocupado.current = false
      setProcesando(false)
      setRequiereVerificacion(true)

      setError(
        submitResponse.state === "canceled"
          ? "Se canceló la autorización. Verifica el estado antes de continuar."
          : submitResponse.data?.message ||
            "PayPal no completó la autorización. Verifica el estado del pedido."
      )

      return
    }

    const orderId = submitResponse.data?.orderId

    if (!orderId) {
      ocupado.current = false
      setProcesando(false)
      setRequiereVerificacion(true)
      setError(
        "No se recibió el identificador de la orden. Verifica el pago."
      )
      return
    }

    async function capturarPago() {
      ocupado.current = true
      setProcesando(true)
      setError("")
      setMensaje("Confirmando el cobro con PayPal...")

      try {
        const resultado = await mutateGraphQL(
          M_CAPTURAR_ORDEN_PAYPAL,
          {
            pedidoId,
            paypalOrderId: orderId
          }
        )

        const pedido =
          resultado?.capturarOrdenPayPal

        if (!pedido) {
          throw new Error(
            "No se recibió la información del pedido"
          )
        }

        if (estadosPagados.includes(pedido.status)) {
          setPagado(true)
          setRequiereVerificacion(false)
          setMensaje("Pago confirmado correctamente.")
          onSuccessRef.current?.(pedido)
        } else {
          setRequiereVerificacion(true)
          setMensaje(
            "PayPal todavía no confirma el cobro. Consulta el estado antes de volver a pagar."
          )
        }
      } catch (err) {
        setMensaje("")
        setRequiereVerificacion(true)
        setError(
          err.message ||
          "No se pudo confirmar el cobro. Verifica su estado."
        )
      } finally {
        ocupado.current = false
        setProcesando(false)
      }
    }

    capturarPago()
  }, [submitResponse, pedidoId])

  useEffect(() => {
    if (!submitError) return

    ocupado.current = false
    setProcesando(false)
    setRequiereVerificacion(true)
    setError(
      submitError.message ||
      "No se pudo completar la autorización."
    )
  }, [submitError])

  async function pagar(event) {
    event.preventDefault()

    if (
      ocupado.current ||
      requiereVerificacion ||
      pagado
    ) {
      return
    }

    if (nombre.trim().length < 3) {
      setError("Ingresa el nombre del titular")
      return
    }

    ocupado.current = true
    setProcesando(true)
    setError("")
    setMensaje("Preparando el pago...")

    let ordenCreada = false

    try {
      const resultado = await mutateGraphQL(
        M_CREAR_ORDEN_PAYPAL,
        { pedidoId }
      )

      const orderId =
        resultado?.crearOrdenPayPal?.id

      if (!orderId) {
        throw new Error(
          "PayPal no devolvió una orden válida"
        )
      }

      ordenCreada = true
      setMensaje("Autorizando la tarjeta...")

      await submit(orderId, {
        name: nombre.trim()
      })

    } catch (err) {
      ocupado.current = false
      setProcesando(false)
      setMensaje("")
      setRequiereVerificacion(ordenCreada)
      setError(
        err.message ||
        "No se pudo iniciar el pago con tarjeta."
      )
    }
  }

  async function verificarPago() {
    if (ocupado.current) return

    ocupado.current = true
    setProcesando(true)
    setError("")
    setMensaje("Consultando el estado...")

    try {
      const resultado = await mutateGraphQL(
        M_SINCRONIZAR_PAGO_PAYPAL,
        { pedidoId }
      )

      const pedido =
        resultado?.sincronizarPagoPayPal

      if (!pedido) {
        throw new Error(
          "No se recibió la información del pedido"
        )
      }

      if (estadosPagados.includes(pedido.status)) {
        setPagado(true)
        setRequiereVerificacion(false)
        setMensaje("Pago confirmado correctamente.")
        onSuccessRef.current?.(pedido)
      } else {
        setRequiereVerificacion(true)
        setMensaje(
          "El pedido sigue pendiente. Consulta Mis pedidos antes de intentar otro cobro."
        )
      }
    } catch (err) {
      setMensaje("")
      setRequiereVerificacion(true)
      setError(
        err.message ||
        "No se pudo consultar el pago."
      )
    } finally {
      ocupado.current = false
      setProcesando(false)
    }
  }

  if (pagado) {
    return (
      <div className="notice-card" role="status">
        Pago confirmado correctamente.
        ¡Gracias por tu compra!
      </div>
    )
  }

  return (
    <form
      className="compact-form"
      onSubmit={pagar}
      aria-busy={procesando}
    >
      <h3>Pagar con tarjeta mediante PayPal</h3>

      <p>
        Ingresa los datos aquí para completar tu compra.
      </p>

      <label>
        Nombre del titular
        <input
          required
          autoComplete="cc-name"
          value={nombre}
          onChange={(event) =>
            setNombre(event.target.value)
          }
          disabled={procesando || requiereVerificacion}
          placeholder="Como aparece en la tarjeta"
        />
      </label>

      <div>
        <p>Número de tarjeta</p>
        <PayPalCardNumberField
          placeholder="Número de tarjeta"
          containerStyles={estiloCampo}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }}
      >
        <div>
          <p>Vencimiento</p>
          <PayPalCardExpiryField
            placeholder="MM/AA"
            containerStyles={estiloCampo}
          />
        </div>

        <div>
          <p>Código de seguridad</p>
          <PayPalCardCvvField
            placeholder="CVV"
            containerStyles={estiloCampo}
          />
        </div>
      </div>

      {fieldsError && (
        <div className="inline-error" role="alert">
          No se pudieron cargar los campos:
          {" "}
          {fieldsError.message}
        </div>
      )}

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="notice-card" role="status">
          {mensaje}
        </div>
      )}

      <button
        type="submit"
        disabled={
          procesando ||
          requiereVerificacion ||
          Boolean(fieldsError)
        }
      >
        {procesando
          ? "Procesando..."
          : "Pagar con tarjeta"}
      </button>

      {requiereVerificacion && (
        <button
          type="button"
          className="ghost"
          onClick={verificarPago}
          disabled={procesando}
        >
          Verificar estado del pago
        </button>
      )}

      <small>
        Los campos de tarjeta son proporcionados
        por PayPal.
      </small>
    </form>
  )
}

function ContenidoPayPal({ pedidoId, onSuccess }) {
  const {
    eligiblePaymentMethods,
    isLoading,
    error
  } = useEligibleMethods({
    payload: {
      currencyCode: "MXN",
      paymentFlow: "ONE_TIME_PAYMENT"
    }
  })

  if (isLoading || (!eligiblePaymentMethods && !error)) {
    return <p>Cargando formulario de PayPal...</p>
  }

  if (error) {
    return (
      <div className="inline-error" role="alert">
        {error.message}
      </div>
    )
  }

  if (
    !eligiblePaymentMethods.isEligible("advanced_cards")
  ) {
    return (
      <div className="notice-card" role="status">
        El formulario de tarjeta no está disponible
        para esta operación.
      </div>
    )
  }

  return (
    <PayPalCardFieldsProvider
      amount={{ currencyCode: "MXN" }}
    >
      <FormularioTarjeta
        pedidoId={pedidoId}
        onSuccess={onSuccess}
      />
    </PayPalCardFieldsProvider>
  )
}

export default function PayPalButtons({
  pedidoId,
  onSuccess
}) {
  if (!clientId) {
    return (
      <div className="inline-error" role="alert">
        Falta configurar PUBLIC_PAYPAL_CLIENT_ID.
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 480,
        width: "100%",
        textAlign: "left"
      }}
    >
      <PayPalProvider
        clientId={clientId}
        environment={environment}
        components={["card-fields"]}
        pageType="checkout"
      >
        <ContenidoPayPal
          pedidoId={pedidoId}
          onSuccess={onSuccess}
        />
      </PayPalProvider>
    </div>
  )
}