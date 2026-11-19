import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql
} from "@apollo/client"
import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { OperationTypeNode } from "graphql"
import { createClient } from "graphql-ws"
import { useAuthStore } from "../store/authStore"

const graphqlUrl =
  import.meta.env.PUBLIC_GRAPHQL_URL?.trim() ||
  (import.meta.env.DEV
    ? "http://localhost:4000/"
    : "")

if (!graphqlUrl) {
  throw new Error(
    "Falta configurar PUBLIC_GRAPHQL_URL. " +
    "Configura la dirección del backend."
  )
}

let backendUrl

try {
  backendUrl = new URL(graphqlUrl)

  if (
    !["http:", "https:"].includes(backendUrl.protocol)
  ) {
    throw new Error("Protocolo no permitido")
  }

  if (
    import.meta.env.PROD &&
    backendUrl.protocol !== "https:"
  ) {
    throw new Error(
      "El backend debe utilizar HTTPS en producción"
    )
  }

  if (
    import.meta.env.PROD &&
    ["localhost", "127.0.0.1"].includes(
      backendUrl.hostname
    )
  ) {
    throw new Error(
      "No se puede utilizar localhost en producción"
    )
  }

} catch (error) {
  throw new Error(
    `PUBLIC_GRAPHQL_URL no es válida: ${error.message}`
  )
}

const httpLink = new HttpLink({
  uri: backendUrl.href,

  fetch: (uri, options = {}) => {
    const token = useAuthStore.getState().token

    const headers = new Headers(
      options.headers || {}
    )

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`
      )
    }

    return fetch(uri, {
      ...options,
      headers
    })
  }
})

const websocketUrl = new URL(
  "/subscriptions",
  backendUrl
)

websocketUrl.protocol =
  backendUrl.protocol === "https:"
    ? "wss:"
    : "ws:"

const wsLink =
  typeof window !== "undefined"
    ? new GraphQLWsLink(
        createClient({
          url: websocketUrl.href,

          lazy: true,
          retryAttempts: 10,

          connectionParams: () => {
            const token =
              useAuthStore.getState().token

            return token
              ? {
                  authorization: `Bearer ${token}`
                }
              : {}
          },

          on: {
            connecting: () => {
              console.info(
                "[WebSocket] Conectando..."
              )
            },

            connected: () => {
              console.info(
                "[WebSocket] Conectado correctamente"
              )
            },

            closed: (event) => {
              console.warn(
                "[WebSocket] Conexión cerrada:",
                event.code,
                event.reason
              )
            },

            error: (error) => {
              console.error(
                "[WebSocket] Error:",
                error
              )
            }
          }
        })
      )
    : null

const splitLink = wsLink
  ? ApolloLink.split(
      ({ operationType }) =>
        operationType ===
        OperationTypeNode.SUBSCRIPTION,

      wsLink,
      httpLink
    )
  : httpLink

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
})

function verificarSesion(error) {
  if (CombinedGraphQLErrors.is(error)) {
    const sesionInvalida = error.errors.some(
      (err) =>
        err.extensions?.code ===
        "UNAUTHENTICATED"
    )

    if (sesionInvalida) {
      useAuthStore.getState().logout()
    }
  }
}

export async function queryGraphQL(
  source,
  variables = {}
) {
  try {
    const result = await client.query({
      query: gql(source),
      variables,
      fetchPolicy: "no-cache"
    })

    return result.data

  } catch (error) {
    verificarSesion(error)
    throw error
  }
}

export async function mutateGraphQL(
  source,
  variables = {}
) {
  try {
    const result = await client.mutate({
      mutation: gql(source),
      variables
    })

    return result.data

  } catch (error) {
    verificarSesion(error)
    throw error
  }
}

export function subscribeGraphQL(
  source,
  { next, error } = {}
) {
  return client.subscribe({
    query: gql(source),
    errorPolicy: "all"
  }).subscribe({
    next: (result) => {
      if (result.error) {
        verificarSesion(result.error)

        console.error(
          "[GraphQL Subscription] Error:",
          result.error
        )

        error?.(result.error)
        return
      }

      if (result.data) {
        next?.(result.data)
      }
    },

    error: (err) => {
      verificarSesion(err)

      console.error(
        "[GraphQL Subscription] Falló:",
        err
      )

      error?.(err)
    }
  })
}
