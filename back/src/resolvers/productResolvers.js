import { pool } from "../db/connection.js"
import {
  mapProducto,
  mapCategoria,
  requireAdmin,
  requireAuth
} from "./helpers.js"

function normalizarCategorias(categoriaId, categoriaIds) {
  const principal = Number(categoriaId)

  if (!Number.isSafeInteger(principal) || principal <= 0) {
    throw new Error("Selecciona una categoría principal válida")
  }

  const valores = categoriaIds == null ? [principal] : categoriaIds

  if (!Array.isArray(valores) || valores.length === 0 || valores.length > 50) {
    throw new Error("Selecciona entre 1 y 50 categorías")
  }

  const ids = [...new Set(valores.map(Number))]

  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("Las categorías seleccionadas no son válidas")
  }

  if (!ids.includes(principal)) {
    throw new Error("La categoría principal debe estar entre las seleccionadas")
  }

  return { principal, ids }
}

async function validarCategorias(cliente, ids) {
  const resultado = await cliente.query(
    "SELECT id FROM categoria WHERE id = ANY($1::integer[])",
    [ids]
  )

  if (resultado.rowCount !== ids.length) {
    throw new Error("Una o más categorías no existen")
  }
}

async function guardarCategorias(cliente, productoId, ids) {
  await cliente.query(
    `DELETE FROM producto_categoria
     WHERE producto_id = $1
       AND NOT (categoria_id = ANY($2::integer[]))`,
    [productoId, ids]
  )

  await cliente.query(
    `INSERT INTO producto_categoria (producto_id, categoria_id)
     SELECT $1, unnest($2::integer[])
     ON CONFLICT (producto_id, categoria_id) DO NOTHING`,
    [productoId, ids]
  )
}

export const productQueries = {
  misFavoritos: async (_, __, context) => {
    const usuario = requireAuth(context)

    const resultado = await pool.query(
      `SELECT p.*
       FROM producto p
       INNER JOIN producto_favorito f ON f.producto_id = p.id
       WHERE f.usuario_id = $1 AND p.activo = TRUE
       ORDER BY f.creado_en DESC`,
      [usuario.id]
    )

    return resultado.rows.map(mapProducto)
  },

  productos: async (_, args) => {
    const {
      busqueda = "",
      categoriaId = null,
      incluirInactivos = false,
      limite = 50,
      desde = 0
    } = args

    const filtros = []
    const valores = []

    if (!incluirInactivos) {
      filtros.push("p.activo = TRUE")
    }

    const textoBusqueda = typeof busqueda === "string" ? busqueda.trim() : ""

    if (textoBusqueda) {
      valores.push(`%${textoBusqueda}%`)
      filtros.push(
        `(p.nombre ILIKE $${valores.length} OR COALESCE(p.descripcion, '') ILIKE $${valores.length})`
      )
    }

    if (categoriaId) {
      valores.push(categoriaId)
      filtros.push(
        `EXISTS (
          SELECT 1
          FROM producto_categoria pc
          WHERE pc.producto_id = p.id
            AND pc.categoria_id = $${valores.length}
        )`
      )
    }

    valores.push(Math.max(1, Math.min(Number(limite) || 50, 200)))
    const limitePos = valores.length
    valores.push(Math.max(0, Number(desde) || 0))
    const desdePos = valores.length

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : ""
    const resultado = await pool.query(
      `SELECT p.* FROM producto p ${where}
       ORDER BY p.id
       LIMIT $${limitePos} OFFSET $${desdePos}`,
      valores
    )

    return resultado.rows.map(mapProducto)
  },

  producto: async (_, { id: productoId }) => {
    const resultado = await pool.query(
      "SELECT * FROM producto WHERE id = $1",
      [productoId]
    )
    return mapProducto(resultado.rows[0])
  }
}

export const productMutations = {
  crearProducto: async (_, { datos }, context) => {
    requireAdmin(context)

    const categorias = normalizarCategorias(
      datos.categoriaId,
      datos.categoriaIds
    )

    const cliente = await pool.connect()

    try {
      await cliente.query("BEGIN")
      await validarCategorias(cliente, categorias.ids)

      const resultado = await cliente.query(
        `INSERT INTO producto
         (nombre, descripcion, precio, imagen, stock, activo, categoria_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          datos.nombre.trim(),
          datos.descripcion || null,
          datos.precio,
          datos.imagen || null,
          datos.stock,
          datos.activo ?? true,
          categorias.principal
        ]
      )

      const producto = resultado.rows[0]
      await guardarCategorias(cliente, producto.id, categorias.ids)

      await cliente.query("COMMIT")
      return mapProducto(producto)
    } catch (error) {
      await cliente.query("ROLLBACK")
      throw error
    } finally {
      cliente.release()
    }
  },

  actualizarProducto: async (_, { id: productoId, datos }, context) => {
    requireAdmin(context)

    const cliente = await pool.connect()

    try {
      await cliente.query("BEGIN")

      const original = await cliente.query(
        "SELECT * FROM producto WHERE id = $1 FOR UPDATE",
        [productoId]
      )

      if (!original.rowCount) {
        await cliente.query("COMMIT")
        return null
      }

      const mapa = {
        nombre: "nombre",
        descripcion: "descripcion",
        precio: "precio",
        imagen: "imagen",
        stock: "stock",
        categoriaId: "categoria_id",
        activo: "activo"
      }

      const campos = []
      const valores = []

      for (const [clave, columna] of Object.entries(mapa)) {
        if (datos[clave] !== undefined && datos[clave] !== null) {
          valores.push(datos[clave])
          campos.push(`${columna} = $${valores.length}`)
        }
      }

      let producto = original.rows[0]

      if (campos.length) {
        valores.push(productoId)
        const resultado = await cliente.query(
          `UPDATE producto
           SET ${campos.join(", ")}
           WHERE id = $${valores.length}
           RETURNING *`,
          valores
        )
        producto = resultado.rows[0]
      }

      if (datos.categoriaIds != null) {
        const categorias = normalizarCategorias(
          producto.categoria_id,
          datos.categoriaIds
        )

        await validarCategorias(cliente, categorias.ids)
        await guardarCategorias(cliente, productoId, categorias.ids)
      } else if (datos.categoriaId != null) {
        const anteriores = await cliente.query(
          `SELECT categoria_id
           FROM producto_categoria
           WHERE producto_id = $1`,
          [productoId]
        )

        const categorias = normalizarCategorias(
          producto.categoria_id,
          [
            producto.categoria_id,
            ...anteriores.rows.map((fila) => fila.categoria_id)
          ]
        )

        await validarCategorias(cliente, categorias.ids)
        await guardarCategorias(cliente, productoId, categorias.ids)
      }

      await cliente.query("COMMIT")
      return mapProducto(producto)
    } catch (error) {
      await cliente.query("ROLLBACK")
      throw error
    } finally {
      cliente.release()
    }
  },

  eliminarProducto: async (_, { id: productoId }, context) => {
    requireAdmin(context)

    const resultado = await pool.query(
      "UPDATE producto SET activo = FALSE WHERE id = $1 RETURNING id",
      [productoId]
    )
    return resultado.rowCount === 1
  },

  alternarFavorito: async (_, { productoId }, context) => {
    const usuario = requireAuth(context)

    const producto = await pool.query(
      `SELECT id FROM producto WHERE id = $1 AND activo = TRUE`,
      [productoId]
    )

    if (!producto.rowCount) {
      throw new Error("El producto no está disponible")
    }

    const eliminado = await pool.query(
      `DELETE FROM producto_favorito
       WHERE usuario_id = $1 AND producto_id = $2
       RETURNING producto_id`,
      [usuario.id, productoId]
    )

    if (eliminado.rowCount) {
      return false
    }

    await pool.query(
      `INSERT INTO producto_favorito (usuario_id, producto_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [usuario.id, productoId]
    )

    return true
  },

  ajustarStock: async (_, { id: productoId, stock }, context) => {
    requireAdmin(context)
    if (stock < 0) throw new Error("El stock no puede ser negativo")

    const resultado = await pool.query(
      "UPDATE producto SET stock = $1 WHERE id = $2 RETURNING *",
      [stock, productoId]
    )
    return mapProducto(resultado.rows[0])
  }
}

export const productTypes = {
  Producto: {
    esFavorito: async (producto, _, context) => {
      if (!context?.usuario) return false

      const resultado = await pool.query(
        `SELECT EXISTS (
          SELECT 1
          FROM producto_favorito
          WHERE usuario_id = $1 AND producto_id = $2
        ) AS favorito`,
        [context.usuario.id, producto.id]
      )

      return resultado.rows[0].favorito
    },

    categoria: async (producto) => {
      const resultado = await pool.query(
        "SELECT * FROM categoria WHERE id = $1",
        [producto.categoria_id]
      )
      return mapCategoria(resultado.rows[0])
    },

    categorias: async (producto) => {
      const resultado = await pool.query(
        `SELECT c.*
         FROM categoria c
         INNER JOIN producto_categoria pc ON pc.categoria_id = c.id
         WHERE pc.producto_id = $1
         ORDER BY CASE WHEN c.id = $2 THEN 0 ELSE 1 END, c.nombre`,
        [producto.id, producto.categoria_id]
      )

      return resultado.rows.map(mapCategoria)
    }
  },

  DetallePedido: {
    producto: async (detalle) => {
      const resultado = await pool.query(
        "SELECT * FROM producto WHERE id = $1",
        [detalle.producto_id]
      )
      return mapProducto(resultado.rows[0])
    }
  }
}
