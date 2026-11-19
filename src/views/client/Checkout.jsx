import { useState } from "react"
import ClientShell from "../../components/ClientShell"
import PayPalButtons from "../../components/PayPalButtons"
import MercadoPagoCard from "../../components/MercadoPagoCard"
import MercadoPagoLink from "../../components/MercadoPagoLink"
import { useCartStore, selectItems } from "../../store/cartStore"
import { useAuthStore } from "../../store/authStore"
import { mutateGraphQL } from "../../lib/apollo"
import { useApi } from "../../lib/useApi"
import { navigate } from "../../lib/navigate"
import { M_REGISTRAR_PEDIDO, Q_CATEGORIAS } from "../../lib/queries"

const initial = {
  nombreReceptor: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  colonia: "",
  ciudad: "",
  estado: "",
  codigoPostal: "",
  referencias: "",
  notas: ""
}

export default function Checkout() {
  const usuario = useAuthStore((state) => state.usuario)

  const items = useCartStore(selectItems(usuario?.id))
  const clearSelected = useCartStore((state) => state.clearSelected)
  const selectedItems = items.filter(
    (item) => item.seleccionado !== false
  )
  const total = selectedItems.reduce(
    (sum, item) => sum + Number(item.producto.precio) * item.cantidad,
    0
  )

  const categories = useApi(Q_CATEGORIAS, {}, [])

  const [form, setForm] = useState(initial)
  const [provider, setProvider] = useState("MERCADO_PAGO")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [order, setOrder] = useState(null)
  const [modoMercadoPago, setModoMercadoPago] =useState("tarjeta")
  
  const change = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }))
  }

  const actualizarPedido = (pedidoActualizado) => {
    setOrder((actual) => ({
      ...actual,
      ...pedidoActualizado
    }))
  }

  const submit = async (event) => {
    event.preventDefault()

    if (loading) return

    setError("")

    if (!usuario?.id) {
      setError("Debes iniciar sesión para crear un pedido")
      return
    }

    if (!selectedItems.length) {
      setError("Selecciona al menos un producto en tu carrito")
      return
    }

    const nombre = form.nombreReceptor.trim()
    const calle = form.calle.trim()
    const numeroExterior = form.numeroExterior.trim()
    const colonia = form.colonia.trim()
    const ciudad = form.ciudad.trim()
    const estado = form.estado.trim()
    const cp = form.codigoPostal.trim()

    if (nombre.length < 3) {
      setError("Ingresa un nombre válido")
      return
    }

    if (calle.length < 3) {
      setError("Ingresa una calle válida")
      return
    }

    if (!numeroExterior) {
      setError("Ingresa un número exterior")
      return
    }

    if (colonia.length < 3) {
      setError("Ingresa una colonia válida")
      return
    }

    if (ciudad.length < 2) {
      setError("Ingresa una ciudad válida")
      return
    }

    if (estado.length < 2) {
      setError("Ingresa un estado válido")
      return
    }

    if (!/^\d{5}$/.test(cp)) {
      setError(
        "El código postal debe contener exactamente 5 números"
      )
      return
    }

    setLoading(true)

    try {
      const result = await mutateGraphQL(
        M_REGISTRAR_PEDIDO,
        {
          datos: {
            proveedorPago: provider,

            direccion: {
              ...form,
              nombreReceptor: nombre,
              calle,
              numeroExterior,
              numeroInterior: form.numeroInterior.trim(),
              colonia,
              ciudad,
              estado,
              codigoPostal: cp,
              referencias: form.referencias.trim(),
              notas: form.notas.trim()
            },

            detalles: selectedItems.map((item) => ({
              productoId: item.producto.id,
              cantidad: item.cantidad
            }))
          }
        }
      )

      const pedidoCreado = result.registrarPedido

      if (!pedidoCreado?.id) {
        throw new Error(
          "No se recibió la información del pedido"
        )
      }

      setOrder(pedidoCreado)
      clearSelected(usuario.id)
    } catch (err) {
      setError(
        err.message || "No se pudo registrar el pedido"
      )
    } finally {
      setLoading(false)
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
          <span className="eyebrow">FINALIZAR</span>
          <h1>Checkout</h1>
        </div>
      </div>

      {order ? (
        <div className="success-card">
          <span className="eyebrow">
            {order.status === "PAGADO"
              ? "PAGO CONFIRMADO"
              : "PEDIDO CREADO"}
          </span>

          <h2>{order.numeroPedido}</h2>

          <p>
            Total:{" "}
            <strong>
              {Number(order.total).toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN"
              })}
            </strong>
          </p>

          {order.pago?.proveedor === "MERCADO_PAGO" ? (
            order.status === "PAGADO" ? (
              <div className="notice-card" role="status">
                Tu pago con Mercado Pago fue confirmado
                correctamente. ¡Gracias por tu compra!
              </div>
            ) : (
              <div className="form-card">
                <h3>¿Cómo deseas pagar?</h3>

                <div className="payment-options">
                  <label
                    className={
                      modoMercadoPago === "tarjeta"
                        ? "payment active"
                        : "payment"
                    }
                  >
                    <input
                      type="radio"
                      name="modoMercadoPago"
                      checked={modoMercadoPago === "tarjeta"}
                      onChange={() => setModoMercadoPago("tarjeta")}
                    />

                    Tarjeta de crédito o débito
                    <span>Pago dentro de Quest Merchant</span>
                  </label>

                  <label
                    className={
                      modoMercadoPago === "link"
                        ? "payment active"
                        : "payment"
                    }
                  >
                    <input
                      type="radio"
                      name="modoMercadoPago"
                      checked={modoMercadoPago === "link"}
                      onChange={() => setModoMercadoPago("link")}
                    />

                    Link de Mercado Pago
                    <span>Más opciones de pago disponibles</span>
                  </label>
                </div>

                {modoMercadoPago === "tarjeta" ? (
                  <MercadoPagoCard
                    pedidoId={order.id}
                    amount={order.total}
                    email={usuario?.email}
                    onSuccess={actualizarPedido}
                  />
                ) : (
                  <MercadoPagoLink pedidoId={order.id} />
                )}
              </div>
            )
          ) : order.pago?.proveedor === "PAYPAL" ? (
            order.status === "PAGADO" ? (
              <div className="notice-card" role="status">
                Tu pago con PayPal fue confirmado
                correctamente. ¡Gracias por tu compra!
              </div>
            ) : (
              <>
                <p>
                  Tu pedido está registrado y pendiente de
                  pago. Continúa con PayPal para completar
                  la compra.
                </p>

                <PayPalButtons
                  pedidoId={order.id}
                  onSuccess={actualizarPedido}
                />
              </>
            )
          ) : (
            <p>Método de pago no disponible.</p>
          )}

          <p>
            Puedes consultar el estado de tu compra
            en Mis pedidos.
          </p>

          <button
            type="button"
            onClick={() => navigate("/pedidos")}
          >
            Ver mis pedidos
          </button>
        </div>
      ) : !selectedItems.length ? (
        <div className="state-card">
          No hay productos seleccionados para comprar.

          <button
            type="button"
            onClick={() => navigate("/carrito")}
          >
            Volver al carrito
          </button>
        </div>
      ) : (
        <div className="checkout-layout">
          <form
            className="form-card"
            onSubmit={submit}
          >
            <h2>Datos de entrega</h2>

            <div className="form-grid">
              <label className="full">
                Nombre del receptor
                <input
                  required
                  name="nombreReceptor"
                  value={form.nombreReceptor}
                  onChange={change}
                />
              </label>

              <label>
                Calle
                <input
                  required
                  name="calle"
                  value={form.calle}
                  onChange={change}
                />
              </label>

              <label>
                Número exterior
                <input
                  required
                  name="numeroExterior"
                  value={form.numeroExterior}
                  onChange={change}
                />
              </label>

              <label>
                Número interior
                <input
                  name="numeroInterior"
                  value={form.numeroInterior}
                  onChange={change}
                />
              </label>

              <label>
                Colonia
                <input
                  required
                  name="colonia"
                  value={form.colonia}
                  onChange={change}
                />
              </label>

              <label>
                Ciudad
                <input
                  required
                  name="ciudad"
                  value={form.ciudad}
                  onChange={change}
                />
              </label>

              <label>
                Estado
                <input
                  required
                  name="estado"
                  value={form.estado}
                  onChange={change}
                />
              </label>

              <label>
                Código postal
                <input
                  required
                  name="codigoPostal"
                  value={form.codigoPostal}
                  onChange={change}
                  inputMode="numeric"
                  maxLength={5}
                />
              </label>

              <label className="full">
                Referencias
                <textarea
                  name="referencias"
                  value={form.referencias}
                  onChange={change}
                />
              </label>

              <label className="full">
                Notas
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={change}
                />
              </label>
            </div>

            <h2>Método de pago</h2>

            <div className="payment-options">
              <label
                className={
                  provider === "MERCADO_PAGO"
                    ? "payment active"
                    : "payment"
                }
              >
                <input
                  type="radio"
                  name="proveedorPago"
                  value="MERCADO_PAGO"
                  checked={provider === "MERCADO_PAGO"}
                  onChange={(event) =>
                    setProvider(event.target.value)
                  }
                  disabled={loading}
                />

                Mercado Pago
                <span>Tarjeta de crédito o débito</span>
              </label>

              <label
                className={
                  provider === "PAYPAL"
                    ? "payment active"
                    : "payment"
                }
              >
                <input
                  type="radio"
                  name="proveedorPago"
                  value="PAYPAL"
                  checked={provider === "PAYPAL"}
                  onChange={(event) =>
                    setProvider(event.target.value)
                  }
                  disabled={loading}
                />

                PayPal
                <span>Pago seguro con PayPal</span>
              </label>
            </div>

            {error && (
              <div
                className="inline-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Registrando..."
                : "Crear pedido"}
            </button>
          </form>

          <aside className="summary-card">
            <span className="eyebrow">TOTAL</span>

            {selectedItems.map((item) => (
              <div
                className="summary-line"
                key={item.producto.id}
              >
                <span>
                  {item.cantidad} × {item.producto.nombre}
                </span>

                <strong>
                  {Number(
                    item.producto.precio * item.cantidad
                  ).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN"
                  })}
                </strong>
              </div>
            ))}

            <div className="summary-line total">
              <span>Total</span>

              <strong>
                {Number(total).toLocaleString("es-MX", {
                  style: "currency",
                  currency: "MXN"
                })}
              </strong>
            </div>
          </aside>
        </div>
      )}
    </ClientShell>
  )
}