import { pool } from "../db/connection.js"

const suscriptores = new Set()
let escuchando = false
let conexion = null
let reconexion = null

function programarReconexion() {
  if (!escuchando || reconexion) return

  reconexion = setTimeout(async () => {
    reconexion = null

    try {
      await conectar()
    } catch (error) {
      console.error(
        "No se pudo recuperar LISTEN:",
        error.message
      )
      programarReconexion()
    }
  }, 5000)
}

async function conectar() {
  const cliente = await pool.connect()
  let liberado = false

  const desconectar = (error) => {
    if (liberado) return
    liberado = true

    if (conexion === cliente) conexion = null

    try {
      cliente.release(true)
    } catch {}

    if (error) {
      console.error(
        "Conexion de eventos perdida:",
        error.message
      )
    }

    programarReconexion()
  }

  cliente.on("error", desconectar)
  cliente.on("end", () => desconectar())

  cliente.on("notification", (mensaje) => {
    if (mensaje.channel !== "quest_backoffice") return

    try {
      const evento = JSON.parse(mensaje.payload)

      console.log(
        "[BackOffice]",
        evento.tipo,
        evento.operacion,
        evento.entidadId
      )

      for (const enviar of suscriptores) {
        enviar({ eventoBackoffice: evento })
      }
    } catch (error) {
      console.error(
        "Evento BackOffice invalido:",
        error.message
      )
    }
  })

  try {
    await cliente.query("LISTEN quest_backoffice")
    conexion = cliente

    console.log(
      "Eventos PostgreSQL: escuchando quest_backoffice"
    )
  } catch (error) {
    desconectar(error)
    throw error
  }
}

export async function iniciarEventosBackoffice() {
  if (escuchando) return

  escuchando = true
  await conectar()
}

export function crearIteradorBackoffice(validarPermiso) {
  const cola = []
  let resolverPendiente = null
  let cerrado = false

  const recibir = (evento) => {
    if (cerrado) return

    if (resolverPendiente) {
      const resolver = resolverPendiente
      resolverPendiente = null

      resolver({
        value: evento,
        done: false
      })
    } else {
      if (cola.length >= 100) cola.shift()
      cola.push(evento)
    }
  }

  const cerrar = () => {
    cerrado = true
    suscriptores.delete(recibir)

    if (resolverPendiente) {
      resolverPendiente({
        value: undefined,
        done: true
      })
      resolverPendiente = null
    }
  }

  suscriptores.add(recibir)

  return {
    async next() {
      if (cerrado) {
        return {
          value: undefined,
          done: true
        }
      }

      const resultado = cola.length
        ? {
            value: cola.shift(),
            done: false
          }
        : await new Promise((resolve) => {
            resolverPendiente = resolve
          })

      if (resultado.done) return resultado

      try {
        await validarPermiso()
        return resultado
      } catch (error) {
        cerrar()
        throw error
      }
    },

    async return() {
      cerrar()
      return {
        value: undefined,
        done: true
      }
    },

    async throw(error) {
      cerrar()
      throw error
    },

    [Symbol.asyncIterator]() {
      return this
    }
  }
}

export async function* crearIteradorCatalogo() {
  const iterador = crearIteradorBackoffice(async () => {})

  try {
    for await (const mensaje of iterador) {
      const tipo = mensaje.eventoBackoffice?.tipo

      if (
        tipo === "PRODUCTO" ||
        tipo === "CATEGORIA" ||
        tipo === "PEDIDO"
      ) {
        yield {
          catalogoActualizado: true
        }
      }
    }
  } finally {
    await iterador.return()
  }
}
