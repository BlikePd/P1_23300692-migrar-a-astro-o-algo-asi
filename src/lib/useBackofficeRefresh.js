import { useEffect, useRef } from "react"
import { useBackofficeEvents } from "./useBackofficeEvents"

export function useBackofficeRefresh(
  refresh,
  tipos = []
) {
  const refreshRef = useRef(refresh)
  const tiposRef = useRef(tipos)
  const timerRef = useRef(null)

  refreshRef.current = refresh
  tiposRef.current = tipos

  useBackofficeEvents((evento) => {
    if (
      tiposRef.current.length > 0 &&
      !tiposRef.current.includes(evento.tipo)
    ) {
      return
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      refreshRef.current?.()
    }, 250)
  })

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])
}
