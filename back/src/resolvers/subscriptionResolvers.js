
import jwt from "jsonwebtoken"
import { GraphQLError } from "graphql"
import { pool } from "../db/connection.js"
import { requireAdmin } from "./helpers.js"
import {
  crearIteradorBackoffice,
  crearIteradorCatalogo
} from "../graphql/backofficeEvents.js"

async function validarAdministradorActual(context) {
  let claims

  try {
    claims = jwt.verify(
      context.token,
      process.env.JWT_SECRET
    )
  } catch {
    throw new GraphQLError(
      "Sesion vencida o invalida",
      {
        extensions: {
          code: "UNAUTHENTICATED"
        }
      }
    )
  }

  if (
    claims.rol !== "ADMIN" ||
    String(claims.id) !== String(context.usuario?.id)
  ) {
    throw new GraphQLError(
      "Acceso administrativo denegado",
      {
        extensions: {
          code: "FORBIDDEN"
        }
      }
    )
  }

  const { rows } = await pool.query(
    "SELECT rol, activo FROM usuario WHERE id = $1",
    [claims.id]
  )

  if (
    !rows[0]?.activo ||
    rows[0]?.rol !== "ADMIN"
  ) {
    throw new GraphQLError(
      "Cuenta sin permisos administrativos",
      {
        extensions: {
          code: "FORBIDDEN"
        }
      }
    )
  }
}

export const subscriptionResolvers = {
  eventoBackoffice: {
    subscribe: async (_, __, context) => {
      requireAdmin(context)

      const validar = () =>
        validarAdministradorActual(context)

      await validar()

      return crearIteradorBackoffice(validar)
    }
  },

  catalogoActualizado: {
    subscribe: () => crearIteradorCatalogo()
  }
}
