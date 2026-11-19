import {
  useCallback,
  useEffect,
  useState
} from "react"

import { queryGraphQL } from "./apollo"

export function useApi(
  source,
  variables = {},
  deps = []
) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(
    async (silencioso = false) => {
      if (!silencioso) {
        setLoading(true)
      }

      setError("")

      try {
        const result = await queryGraphQL(
          source,
          variables
        )

        setData(result)
        return result

      } catch (err) {
        console.error(
          "[useApi] Error al consultar:",
          err
        )

        setError(
          err.message ||
          "Error al obtener los datos"
        )

        return null

      } finally {
        if (!silencioso) {
          setLoading(false)
        }
      }
    },
    deps
  )

  const reload = useCallback(
    () => load(false),
    [load]
  )
  const refresh = useCallback(
    () => load(true),
    [load]
  )

  // Carga inicial
  useEffect(() => {
    reload()
  }, [reload])

  return {
    data,
    loading,
    error,
    reload,
    refresh
  }
}
