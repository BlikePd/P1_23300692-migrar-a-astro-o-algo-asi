import { create } from "zustand"

let seed = 0
const timers = new Map()

export const useToastStore = create((set, get) => ({
  toasts: [],

  show: (input) => {
    const id = input.id ?? `toast-${Date.now()}-${seed++}`
    const duration = input.duration ?? 4200
    const item = { dismissible: true, ...input, id, duration, createdAt: Date.now() }

    set((state) => ({ toasts: [...state.toasts, item].slice(-5) }))
    schedule(id, duration)
    return id
  },

  update: (id, patch) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...patch, id } : t))
    }))
    if (patch.duration !== undefined) schedule(id, patch.duration)
  },

  dismiss: (id) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  clear: () => {
    timers.forEach((timer) => clearTimeout(timer))
    timers.clear()
    set({ toasts: [] })
  }
}))

function schedule(id, duration) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  if (duration > 0) {
    timers.set(id, setTimeout(() => useToastStore.getState().dismiss(id), duration))
  }
}

/*
  Uso desde cualquier archivo (no hace falta hook):
    import { toast } from "../store/toastStore"
    toast.success("Guardado", "Descripción opcional")
*/
const make = (status) => (title, description, extra = {}) =>
  useToastStore.getState().show({ status, title, description, ...extra })

export const toast = {
  success: make("success"),
  error: make("error"),
  info: make("info"),
  loading: (title, description) =>
    useToastStore.getState().show({ status: "loading", title, description, duration: 0 }),
  update: (id, patch) => useToastStore.getState().update(id, patch),
  dismiss: (id) => useToastStore.getState().dismiss(id)
}
