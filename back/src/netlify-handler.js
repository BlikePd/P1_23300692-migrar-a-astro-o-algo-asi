import { randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"
import { getStore } from "@netlify/blobs"
import { ApolloServer, HeaderMap } from "@apollo/server"
import { typeDefs } from "./graphql/schema.js"
import { resolvers } from "./resolvers/resolvers.js"

const server = new ApolloServer({ typeDefs, resolvers })
const started = server.start()

async function ensureJwtSecret() {
  if (process.env.JWT_SECRET) {
    return
  }

  const store = getStore("quest-merchant-config")
  let secret = await store.get("jwt-secret")

  if (!secret) {
    await store.set("jwt-secret", randomBytes(48).toString("hex"), { onlyIfNew: true })
    secret = await store.get("jwt-secret")
  }

  process.env.JWT_SECRET = secret
}

function getUsuario(req) {
  const authHeader = req.headers.get("authorization") || ""

  if (!authHeader.startsWith("Bearer ")) {
    return null
  }

  try {
    return jwt.verify(authHeader.slice(7), process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function handleGraphQLRequest(req) {
  await started
  await ensureJwtSecret()

  const headers = new HeaderMap()
  req.headers.forEach((value, key) => headers.set(key, value))

  const url = new URL(req.url)
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : undefined

  const result = await server.executeHTTPGraphQLRequest({
    httpGraphQLRequest: {
      method: req.method.toUpperCase(),
      headers,
      search: url.search,
      body
    },
    context: async () => ({ usuario: getUsuario(req) })
  })

  const responseHeaders = new Headers()
  for (const [key, value] of result.headers) {
    responseHeaders.set(key, value)
  }

  if (result.body.kind === "complete") {
    return new Response(result.body.string, {
      status: result.status || 200,
      headers: responseHeaders
    })
  }

  let text = ""
  for await (const chunk of result.body.asyncIterator) {
    text += chunk
  }

  return new Response(text, {
    status: result.status || 200,
    headers: responseHeaders
  })
}
