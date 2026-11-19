
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import ClientShell from "../../components/ClientShell"
import { ErrorBox, Status } from "../../components/Ui"
import {
  Q_CATEGORIAS,
  Q_MIS_PEDIDOS,
  M_CONFIRMAR_PAGO_MERCADO_PAGO,
  M_SINCRONIZAR_PAGO_PAYPAL
} from "../../lib/queries"
import { mutateGraphQL } from "../../lib/apollo"
import { useApi } from "../../lib/useApi"
import { useAuthStore } from "../../store/authStore"
import { navigate } from "../../lib/navigate"
import { OrderListSkeleton } from "../../components/skeletons"

const PayPalButtons = lazy(
  () => import("../../components/PayPalButtons")
)

export default function Orders() {
  const usuario = useAuthStore((state) => state.usuario)

  const categories = useApi(Q_CATEGORIAS, {}, [])
  const orders = useApi(Q_MIS_PEDIDOS, {}, [usuario?.id])

  const [operaciones, setOperaciones] = useState({})
  const [verificando, setVerificando] = useState(null)
  const [mensajes, setMensajes] = useState({})
  const [paypalAbierto, setPaypalAbierto] = useState(null)

  const retornoProcesado = useRef(false)

  useEffect(() => {
    if (!usuario?.id || retornoProcesado.current) return

    const parametros = new URLSearchParams(
      window.location.search
    )

    const pedidoId = parametros.get("mpPedido")
    const resultadoMP = parametros.get("mpResultado")

    if (
      !/^[1-9]\d*$/.test(pedidoId || "") ||
      !["success", "pending", "failure"].includes(resultadoMP)
    ) {
      return
    }

    retornoProcesado.current = true

    const pagoId =
      parametros.get("payment_id") ||
      parametros.get("collection_id")

    async function verificarRetorno() {
      setVerificando(pedidoId)

      try {
        if (
          resultadoMP === "success" &&
          /^[1-9]\d*$/.test(pagoId || "")
        ) {
          await mutateGraphQL(
            M_CONFIRMAR_PAGO_MERCADO_PAGO,
            { pedidoId, pagoId }
          )

          setMensajes((actual) => ({
            ...actual,
            [pedidoId]: {
              error: false,
              texto: "Pago confirmado correctamente."
            }
          }))
        } else {
          setMensajes((actual) => ({
            ...actual,
            [pedidoId]: {
              error: false,
              texto:
                "Regresaste de Mercado Pago. " +
                "El pedido seguirá pendiente hasta " +
                "que se confirme la acreditación."
            }
          }))
        }
      } catch (error) {
        setMensajes((actual) => ({
          ...actual,
          [pedidoId]: {
            error: true,
            texto:
              error.message ||
              "El pago aún no pudo confirmarse."
          }
        }))
      } finally {
        try {
          await orders.reload()
        } catch (error) {
          console.error("Error al actualizar pedidos:", error)
        }

        setVerificando(null)

        window.history.replaceState(
          {},
          "",
          window.location.pathname
        )
      }
    }

    verificarRetorno()
  }, [usuario?.id, orders.reload])

  const cambiarOperacion = (pedidoId, valor) => {
    setOperaciones((actual) => ({
      ...actual,
      [pedidoId]: valor
    }))

    setMensajes((actual) => ({
      ...actual,
      [pedidoId]: null
    }))
  }

  const verificarPago = async (event, pedidoId) => {
    event.preventDefault()

    if (verificando !== null) return

    const pagoId = (operaciones[pedidoId] || "").trim()

    if (!/^[1-9]\d*$/.test(pagoId)) {
      setMensajes((actual) => ({
        ...actual,
        [pedidoId]: {
          error: true,
          texto: "Escribe un número de operación válido."
        }
      }))
      return
    }

    setVerificando(pedidoId)

    setMensajes((actual) => ({
      ...actual,
      [pedidoId]: null
    }))

    try {
      const result = await mutateGraphQL(
        M_CONFIRMAR_PAGO_MERCADO_PAGO,
        { pedidoId, pagoId }
      )

      const pedido = result.confirmarPagoMercadoPago

      setMensajes((actual) => ({
        ...actual,
        [pedidoId]: {
          error: false,
          texto: `Pago verificado. Estado del pedido: ${pedido.status}.`
        }
      }))

      await orders.reload()
    } catch (error) {
      setMensajes((actual) => ({
        ...actual,
        [pedidoId]: {
          error: true,
          texto: error.message || "No se pudo verificar el pago."
        }
      }))
    } finally {
      setVerificando(null)
    }
  }

  const verificarPayPal = async (pedidoId) => {
    if (verificando !== null) return

    setVerificando(pedidoId)
    setPaypalAbierto(null)

    setMensajes((actual) => ({
      ...actual,
      [pedidoId]: null
    }))

    try {
      const resultado = await mutateGraphQL(
        M_SINCRONIZAR_PAGO_PAYPAL,
        { pedidoId }
      )

      const pedido = resultado?.sincronizarPagoPayPal

      if (!pedido) {
        throw new Error("No se recibió la información del pedido")
      }

      const confirmado = [
        "PAGADO",
        "EN_PREPARACION",
        "ENVIADO",
        "ENTREGADO"
      ].includes(pedido.status)

      setMensajes((actual) => ({
        ...actual,
        [pedidoId]: {
          error: false,
          texto: confirmado
            ? "El pago con PayPal fue confirmado correctamente."
            : "PayPal todavía no confirma el cobro. El pedido sigue pendiente."
        }
      }))

      await orders.reload()
    } catch (error) {
      setMensajes((actual) => ({
        ...actual,
        [pedidoId]: {
          error: true,
          texto:
            error.message ||
            "No se pudo consultar el pago con PayPal."
        }
      }))
    } finally {
      setVerificando(null)
    }
  }

  return (
    <ClientShell
      navigate={navigate}
      categories={categories.data?.categorias || []}
      onCategory={() => navigate("/")}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {usuario?.nombre}
          </span>
          <h1>Mis pedidos</h1>
        </div>
      </div>

      {orders.loading && (
        <OrderListSkeleton count={4} />
      )}

      {orders.error && (
        <ErrorBox
          message={orders.error}
          retry={orders.reload}
        />
      )}

      {!orders.loading &&
        !orders.error &&
        !orders.data?.misPedidos?.length && (
          <div className="state-card">
            Todavía no tienes pedidos.
          </div>
        )}

      <div className="order-list">
        {(orders.data?.misPedidos || []).map((order) => {
          const mensaje = mensajes[order.id]

          const puedeVerificar =
            order.status === "PENDIENTE" &&
            order.pago?.proveedor === "MERCADO_PAGO"

          const puedeGestionarPayPal =
            order.status === "PENDIENTE" &&
            order.pago?.proveedor === "PAYPAL"

          const puedeSincronizarPayPal =
            puedeGestionarPayPal &&
            order.pago?.estado !== "PENDIENTE_INTEGRACION"

          const pagoAprobado =
            String(order.pago?.estado || "").startsWith("APROBADO")

          return (
            <article className="order-card" key={order.id}>
              <div className="order-head">
                <div>
                  <span className="eyebrow">
                    {order.numeroPedido}
                  </span>

                  <h3>
                    {new Date(order.fecha).toLocaleString("es-MX")}
                  </h3>
                </div>

                <Status value={order.status} />
              </div>

              {order.detalles.map((detail) => (
                <div className="order-line" key={detail.id}>
                  <span>
                    {detail.cantidad} × {detail.producto.nombre}
                  </span>

                  <strong>
                    {Number(detail.subtotal).toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN"
                    })}
                  </strong>
                </div>
              ))}

              <div className="order-foot">
                <span>
                  {order.pago?.proveedor?.replaceAll("_", " ")}
                  {" · "}
                  {order.pago?.estado?.replaceAll("_", " ")}
                </span>

                <strong>
                  {Number(order.total).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN"
                  })}
                </strong>
              </div>

              {puedeVerificar && (
                <form
                  className="form-card"
                  onSubmit={(event) => verificarPago(event, order.id)}
                >
                  <h3>¿Ya realizaste el pago?</h3>

                  <p>
                    Ingresa el número de operación que aparece
                    en tu comprobante de Mercado Pago.
                  </p>

                  <label htmlFor={`operacion-${order.id}`}>
                    Número de operación
                  </label>

                  <input
                    id={`operacion-${order.id}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[1-9][0-9]*"
                    placeholder="Número del comprobante"
                    value={operaciones[order.id] || ""}
                    onChange={(event) =>
                      cambiarOperacion(order.id, event.target.value)
                    }
                    disabled={verificando !== null}
                    required
                  />

                  <button
                    type="submit"
                    disabled={verificando !== null}
                  >
                    {verificando === order.id
                      ? "Verificando..."
                      : "Verificar pago"}
                  </button>
                </form>
              )}

              {puedeGestionarPayPal && (
                <div className="form-card">
                  <h3>Pago con PayPal</h3>

                  <p>
                    Este pedido todavía está pendiente.
                    Si ya autorizaste el pago, verifica su
                    estado antes de intentar pagar nuevamente.
                  </p>

                  {puedeSincronizarPayPal && (
                    <button
                      type="button"
                      onClick={() => verificarPayPal(order.id)}
                      disabled={verificando !== null}
                    >
                      {verificando === order.id
                        ? "Verificando con PayPal..."
                        : "Verificar pago con PayPal"}
                    </button>
                  )}

                  {!pagoAprobado && (
                    <button
                      type="button"
                      onClick={() =>
                        setPaypalAbierto((actual) =>
                          actual === order.id ? null : order.id
                        )
                      }
                      disabled={verificando !== null}
                    >
                      {paypalAbierto === order.id
                        ? "Ocultar PayPal"
                        : "Continuar con PayPal"}
                    </button>
                  )}

                  {paypalAbierto === order.id && !pagoAprobado && (
                    <Suspense fallback={<p>Cargando PayPal...</p>}>
                      <PayPalButtons
                        pedidoId={order.id}
                        onSuccess={async () => {
                          setPaypalAbierto(null)

                          setMensajes((actual) => ({
                            ...actual,
                            [order.id]: {
                              error: false,
                              texto: "Pago confirmado correctamente."
                            }
                          }))

                          await orders.reload()
                        }}
                      />
                    </Suspense>
                  )}
                </div>
              )}

              {mensaje && (
                <div
                  className={
                    mensaje.error
                      ? "inline-error"
                      : "notice-card"
                  }
                  role={mensaje.error ? "alert" : "status"}
                >
                  {mensaje.texto}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </ClientShell>
  )
}
