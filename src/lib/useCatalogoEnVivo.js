
import { useEffect, useRef } from "react"

import { subscribeGraphQL } from "./apollo"
import { S_CATALOGO } from "./queries"

export function useCatalogoEnVivo(onActualizar) {
  const callbackRef = useRef(onActualizar)

  callbackRef.current = onActualizar

  useEffect(() => {
    let temporizador = null

    const actualizar = () => {
      clearTimeout(temporizador)

      temporizador = setTimeout(() => {
        callbackRef.current?.()
      }, 200)
    }

    const subscription = subscribeGraphQL(
      S_CATALOGO,
      {
        next: (data) => {
          if (data?.catalogoActualizado) {
            console.info(
              "[Catálogo] Cambio recibido"
            )

            actualizar()
          }
        },

        error: (error) => {
          console.error(
            "[Catálogo] Error de suscripción:",
            error
          )
        }
      }
    )

    // Recuperar cambios perdidos al regresar
    // a una pestaña que estuvo inactiva.

    const recuperar = () => {
      if (!document.hidden) {
        actualizar()
      }
    }

    window.addEventListener("focus", recuperar)

    document.addEventListener(
      "visibilitychange",
      recuperar
    )

    return () => {
      clearTimeout(temporizador)

      subscription.unsubscribe()

      window.removeEventListener(
        "focus",
        recuperar
      )

      document.removeEventListener(
        "visibilitychange",
        recuperar
      )
    }
  }, [])
}

