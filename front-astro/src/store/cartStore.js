
import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useCartStore = create(
  persist(
    (set) => ({
      carts: {},

      add: (usuarioId, producto, cantidad = 1) => set((state) => {
        const items = state.carts[usuarioId] || []
        const existe = items.find((item) => item.producto.id === producto.id)

        const nuevosItems = existe
          ? items.map((item) =>
              item.producto.id === producto.id
                ? {
                    ...item,
                    cantidad: Math.min(item.cantidad + cantidad, producto.stock)
                  }
                : item
            )
          : [
              ...items,
              {
                producto,
                cantidad: Math.min(cantidad, producto.stock),
                seleccionado: true
              }
            ]

        return {
          carts: {
            ...state.carts,
            [usuarioId]: nuevosItems
          }
        }
      }),

      remove: (usuarioId, id) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || []).filter(
            (item) => item.producto.id !== id
          )
        }
      })),

      decrease: (usuarioId, id) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || [])
            .map((item) =>
              item.producto.id === id
                ? { ...item, cantidad: item.cantidad - 1 }
                : item
            )
            .filter((item) => item.cantidad > 0)
        }
      })),

      update: (usuarioId, id, cantidad) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || []).map((item) =>
            item.producto.id === id
              ? {
                  ...item,
                  cantidad: Math.max(1, Math.min(cantidad, item.producto.stock))
                }
              : item
          )
        }
      })),

      setSelected: (usuarioId, id, seleccionado) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || []).map((item) =>
            String(item.producto.id) === String(id)
              ? { ...item, seleccionado }
              : item
          )
        }
      })),

      setAllSelected: (usuarioId, seleccionado) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || []).map((item) => ({
            ...item,
            seleccionado
          }))
        }
      })),

      clearSelected: (usuarioId) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: (state.carts[usuarioId] || []).filter(
            (item) => item.seleccionado === false
          )
        }
      })),

      clear: (usuarioId) => set((state) => ({
        carts: {
          ...state.carts,
          [usuarioId]: []
        }
      }))
    }),
    {
      name: "quest-carts"
    }
  )
)

const EMPTY_CART = []

export const selectItems = (usuarioId) => (state) =>
  state.carts[usuarioId] ?? EMPTY_CART

export const selectCount = (usuarioId) => (state) =>
  (state.carts[usuarioId] || []).reduce(
    (acum, item) => acum + item.cantidad,
    0
  )

export const selectTotal = (usuarioId) => (state) =>
  (state.carts[usuarioId] || []).reduce(
    (acum, item) => acum + item.producto.precio * item.cantidad,
    0
  )
