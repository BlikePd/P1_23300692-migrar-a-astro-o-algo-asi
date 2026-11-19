
import { useEffect, useRef } from "react"
import { subscribeGraphQL } from "./apollo"
import { S_BACKOFFICE } from "./queries"

export function useBackofficeEvents(onEvent) {
  const callback = useRef(onEvent)

  callback.current = onEvent

  useEffect(() => {
    const subscription = subscribeGraphQL(
      S_BACKOFFICE,
      {
        next: (data) => {
          const evento = data?.eventoBackoffice

          if (!evento) return

          console.info(
            "[Subscription BackOffice]",
            evento
          )

          callback.current?.(evento)
        },

        error: (err) => {
          console.error(
            "[Subscription BackOffice]",
            err
          )
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])
}
