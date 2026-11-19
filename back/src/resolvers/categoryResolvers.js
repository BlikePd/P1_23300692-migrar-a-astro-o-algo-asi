
import { pool } from "../db/connection.js"
import { mapCategoria, mapProducto, requireAdmin } from "./helpers.js"

export const categoryQueries = {
  categorias: async (_, { incluirInactivas = false }) => {
    const result = await pool.query(
      `SELECT *
       FROM categoria
       ${incluirInactivas ? "" : "WHERE activo = TRUE"}
       ORDER BY nombre`
    )

    return result.rows.map(mapCategoria)
  },

  categoria: async (_, { id: categoriaId }) => {
    const result = await pool.query(
      "SELECT * FROM categoria WHERE id = $1",
      [categoriaId]
    )

    return mapCategoria(result.rows[0])
  }
}

export const categoryMutations = {
  crearCategoria: async (_, { datos }, context) => {
    requireAdmin(context)

    const result = await pool.query(
      `INSERT INTO categoria (nombre, activo)
       VALUES ($1, $2)
       RETURNING *`,
      [datos.nombre.trim(), datos.activo ?? true]
    )

    return mapCategoria(result.rows[0])
  },

  actualizarCategoria: async (_, { id: categoriaId, datos }, context) => {
    requireAdmin(context)

    const result = await pool.query(
      `UPDATE categoria
       SET nombre = $1, activo = $2
       WHERE id = $3
       RETURNING *`,
      [
        datos.nombre.trim(),
        datos.activo ?? true,
        categoriaId
      ]
    )

    return mapCategoria(result.rows[0])
  },

  eliminarCategoria: async (_, { id: categoriaId }, context) => {
    requireAdmin(context)

    const result = await pool.query(
      `UPDATE categoria
       SET activo = FALSE
       WHERE id = $1
       RETURNING id`,
      [categoriaId]
    )

    return result.rowCount === 1
  }
}

export const categoryTypes = {
  Categoria: {
    productos: async (categoria) => {
      const result = await pool.query(
        `SELECT p.*
         FROM producto p
         INNER JOIN producto_categoria pc
           ON pc.producto_id = p.id
         WHERE pc.categoria_id = $1
         ORDER BY p.nombre`,
        [categoria.id]
      )

      return result.rows.map(mapProducto)
    }
  }
}
