
import ClientShell from "../../components/ClientShell"
import { Empty } from "../../components/Ui"
import { Q_CATEGORIAS } from "../../lib/queries"
import { useApi } from "../../lib/useApi"
import { useCartStore, selectItems } from "../../store/cartStore"
import { useAuthStore } from "../../store/authStore"
import { navigate } from "../../lib/navigate"

export default function Cart() {
  const usuario = useAuthStore((state) => state.usuario)
  const items = useCartStore(selectItems(usuario?.id))
  const update = useCartStore((state) => state.update)
  const remove = useCartStore((state) => state.remove)
  const setSelected = useCartStore((state) => state.setSelected)
  const setAllSelected = useCartStore((state) => state.setAllSelected)
  const categories = useApi(Q_CATEGORIAS, {}, [])

  const seleccionados = items.filter((item) => item.seleccionado !== false)
  const todosSeleccionados = seleccionados.length === items.length
  const cantidadSeleccionada = seleccionados.reduce(
    (total, item) => total + item.cantidad,
    0
  )
  const totalSeleccionado = seleccionados.reduce(
    (total, item) => total + Number(item.producto.precio) * item.cantidad,
    0
  )

  return (
    <ClientShell
      navigate={navigate}
      categories={categories.data?.categorias || []}
      onCategory={() => navigate("/")}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">TU COMPRA</span>
          <h1>Carrito</h1>
        </div>
      </div>

      {!usuario ? (
        <Empty>Inicia sesión para consultar tu carrito.</Empty>
      ) : !items.length ? (
        <Empty>Tu carrito está vacío. El dragón no se va a derrotar solo :p</Empty>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            <div className="cart-selection-header">
              <label className="checkbox cart-selection-all">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  onChange={(event) =>
                    setAllSelected(usuario.id, event.target.checked)
                  }
                />
                Seleccionar todos
              </label>
              <span>
                {seleccionados.length} de {items.length} productos seleccionados
              </span>
            </div>

            {items.map((item) => (
              <div
                className={`cart-item ${item.seleccionado === false ? "cart-item-unselected" : ""}`}
                key={item.producto.id}
              >
                <label className="checkbox cart-select">
                  <input
                    type="checkbox"
                    checked={item.seleccionado !== false}
                    onChange={(event) =>
                      setSelected(usuario.id, item.producto.id, event.target.checked)
                    }
                    aria-label={`Incluir ${item.producto.nombre} en la compra`}
                  />
                </label>

                <img
                  src={item.producto.imagen || "/images/dados-arcanos.jpg"}
                  alt={item.producto.nombre}
                />

                <div className="cart-item-info">
                  <h3>{item.producto.nombre}</h3>
                  <span>
                    ${Number(item.producto.precio).toLocaleString("es-MX")}
                  </span>
                  {item.seleccionado === false && (
                    <small className="cart-reserved">Guardado para después</small>
                  )}
                </div>

                <div className="quantity-row compact">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      update(usuario.id, item.producto.id, item.cantidad - 1)
                    }
                  >
                    −
                  </button>
                  <strong>{item.cantidad}</strong>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      update(usuario.id, item.producto.id, item.cantidad + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <strong>
                  ${Number(item.producto.precio * item.cantidad).toLocaleString("es-MX")}
                </strong>

                <button
                  type="button"
                  className="danger"
                  onClick={() => remove(usuario.id, item.producto.id)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <aside className="summary-card">
            <span className="eyebrow">RESUMEN DE COMPRA</span>

            <div className="summary-line">
              <span>Productos seleccionados</span>
              <strong>{cantidadSeleccionada}</strong>
            </div>

            <div className="summary-line total">
              <span>Total a pagar</span>
              <strong>
                ${Number(totalSeleccionado).toLocaleString("es-MX")}
              </strong>
            </div>

            <button
              type="button"
              disabled={!seleccionados.length}
              onClick={() => navigate("/checkout")}
            >
              Comprar seleccionados
            </button>

            <p className="cart-selection-help">
              Los productos sin marcar permanecerán guardados en tu carrito.
            </p>
          </aside>
        </div>
      )}
    </ClientShell>
  )
}
