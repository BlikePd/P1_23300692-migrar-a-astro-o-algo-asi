import { pool } from "../db/connection.js"
import { mapUsuario, mapPedido, requireAdmin } from "./helpers.js"

export const userQueries = {
  usuarios: async (_, { busqueda, rol, activo }, context) => {
    requireAdmin(context)

    const condiciones = []
    const valores = []
    const texto = typeof busqueda === "string" ? busqueda.trim() : ""

    if (texto) {
      valores.push(`%${texto}%`)
      const indice = valores.length

      condiciones.push(
        `(u.nombre ILIKE $${indice} OR u.email ILIKE $${indice} OR u.id::text ILIKE $${indice})`
      )
    }

    if (rol) {
      valores.push(rol)
      condiciones.push(`u.rol = $${valores.length}`)
    }

    if (typeof activo === "boolean") {
      valores.push(activo)
      condiciones.push(`u.activo = $${valores.length}`)
    }

    const where = condiciones.length
      ? `WHERE ${condiciones.join(" AND ")}`
      : ""

    const result = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo
       FROM usuario u
       ${where}
       ORDER BY u.id`,
      valores
    )

    return result.rows.map(mapUsuario)
  }
}

export const userMutations = {
  actualizarUsuario: async (_, { id: usuarioId, rol, activo }, context) => {
    requireAdmin(context)

    const campos = []
    const valores = []

    if (rol !== undefined && rol !== null) {
      valores.push(rol)
      campos.push(`rol = $${valores.length}`)
    }

    if (activo !== undefined && activo !== null) {
      valores.push(activo)
      campos.push(`activo = $${valores.length}`)
    }

    if (!campos.length) {
      const actual = await pool.query(
        "SELECT id, nombre, email, rol, activo FROM usuario WHERE id = $1",
        [usuarioId]
      )

      return mapUsuario(actual.rows[0])
    }

    valores.push(usuarioId)

    const result = await pool.query(
      `UPDATE usuario SET ${campos.join(", ")}
       WHERE id = $${valores.length}
       RETURNING id, nombre, email, rol, activo`,
      valores
    )

    return mapUsuario(result.rows[0])
  }
}

export const userTypes = {
  Usuario: {
    pedidos: async (usuario) => {
      const result = await pool.query(
        "SELECT * FROM pedido WHERE usuario_id = $1 ORDER BY fecha DESC",
        [usuario.id]
      )

      return result.rows.map(mapPedido)
    }
  }
}