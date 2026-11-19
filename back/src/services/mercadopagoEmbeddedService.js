import { createHash, randomUUID } from "node:crypto"
import { Payment } from "mercadopago"
import { pool } from "../db/connection.js"
import { mercadoPagoClient } from "../config/mercadopago.js"
import { getPedidoById } from "../resolvers/helpers.js"
import { confirmarPagoMercadoPago } from "./mercadopagoService.js"

const pagosMP = new Payment(mercadoPagoClient)

function centavos(valor) {
  if (valor == null || valor === "") return NaN
  const numero = Number(valor)
  return Number.isFinite(numero) ? Math.round(numero * 100) : NaN
}

const esRechazadoOCancelado = (estado) =>
  ["rejected", "cancelled"].includes(estado)

const esAcreditado = (pago) =>
  pago.status === "approved" &&
  pago.status_detail === "accredited" &&
  centavos(pago.transaction_amount_refunded ?? 0) === 0

async function marcarRevision(intentoId, motivo) {
  if (!intentoId) return

  console.error("[Mercado Pago] Intento en revisión:", {
    intentoId,
    motivo
  })

  await pool.query(
    `UPDATE intento_pago_mp
     SET estado = 'REVISION'
     WHERE id = $1
       AND estado NOT IN ('approved', 'rejected', 'cancelled')`,
    [intentoId]
  )
}

async function obtenerPedido(pedidoId, usuarioId, conexion = pool) {
  const resultado = await conexion.query(
    `SELECT p.*,
            pg.id AS pago_id,
            pg.proveedor,
            pg.monto,
            pg.estado AS estado_pago,
            pg.referencia_externa
     FROM pedido p
     JOIN pago pg ON pg.pedido_id = p.id
     WHERE p.id = $1 AND p.usuario_id = $2`,
    [pedidoId, usuarioId]
  )

  const pedido = resultado.rows[0]

  if (!pedido || pedido.proveedor !== "MERCADO_PAGO") {
    throw new Error("Pedido de Mercado Pago no encontrado")
  }

  if (pedido.status === "CANCELADO") {
    throw new Error("El pedido está cancelado; requiere revisión")
  }

  return pedido
}

function validarDatos(datos) {
  if (
    !datos ||
    !/^[A-Za-z0-9_-]{10,256}$/.test(datos.token || "") ||
    !/^[A-Za-z0-9_-]{1,50}$/.test(datos.paymentMethodId || "") ||
    !Number.isInteger(datos.installments) ||
    datos.installments < 1 ||
    datos.installments > 48 ||
    typeof datos.email !== "string" ||
    datos.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)
  ) {
    throw new Error("Los datos del formulario de pago no son válidos")
  }
}

function validarOperacion(operacion, pedido) {
  const vendedorId = process.env.MERCADOPAGO_SELLER_ID?.trim()
  const diferencias = []

  if (!/^[1-9]\d*$/.test(String(operacion?.id ?? ""))) {
    diferencias.push("id")
  }

  if (
    String(operacion?.external_reference ?? "") !==
    String(pedido.id)
  ) {
    diferencias.push("external_reference")
  }

  if (operacion?.currency_id !== "MXN") {
    diferencias.push("currency_id")
  }

  if (
    !vendedorId ||
    String(operacion?.collector_id ?? "") !== vendedorId
  ) {
    diferencias.push("collector_id")
  }

  const montoMP = centavos(operacion?.transaction_amount)

  if (
    !Number.isFinite(montoMP) ||
    montoMP <= 0 ||
    montoMP !== centavos(pedido.total)
  ) {
    diferencias.push("total")
  }

  if (
    !Number.isFinite(montoMP) ||
    montoMP !== centavos(pedido.monto)
  ) {
    diferencias.push("monto_local")
  }

  if (diferencias.length) {
    console.error("[Mercado Pago] Datos distintos al pedido:", {
      pedidoId: pedido.id,
      pagoId: operacion?.id ?? null,
      diferencias,
      referenciaMP: operacion?.external_reference ?? null,
      monedaMP: operacion?.currency_id ?? null,
      vendedorMP: operacion?.collector_id ?? null,
      vendedorConfigurado: vendedorId ?? null,
      importeMP: operacion?.transaction_amount ?? null,
      totalPedido: pedido.total,
      montoPagoLocal: pedido.monto,
      estadoMP: operacion?.status ?? null
    })

    throw new Error(
      `La operación recibida no corresponde al pedido: ${diferencias.join(", ")}`
    )
  }
}

async function respuesta(estado, mensaje, pagoId, pedidoId) {
  return {
    estado,
    mensaje,
    pagoId: pagoId == null ? null : String(pagoId),
    pedido: await getPedidoById(pedidoId)
  }
}

async function procesarResultado(operacionInicial, pedido, intento) {
  const pagoId = String(operacionInicial?.id ?? "")

  if (!/^[1-9]\d*$/.test(pagoId)) {
    await marcarRevision(
      intento?.id,
      "Mercado Pago no devolvió ID de pago"
    )

    throw new Error(
      "Mercado Pago no devolvió un ID de pago válido"
    )
  }

  const operacion = await pagosMP.get({ id: pagoId })

  try {
    if (String(operacion?.id ?? "") !== pagoId) {
      throw new Error(
        "El ID consultado no coincide con la operación"
      )
    }

    validarOperacion(operacion, pedido)
  } catch (error) {
    await marcarRevision(intento?.id, error.message)
    throw error
  }

  const acreditado = esAcreditado(operacion)
  const estadoMP = operacion.status || "pending"

  if (
    (estadoMP === "approved" && !acreditado) ||
    ["refunded", "charged_back", "in_mediation"].includes(estadoMP)
  ) {
    await marcarRevision(
      intento?.id,
      `Estado ${estadoMP}/${operacion.status_detail}`
    )

    return respuesta(
      "pending",
      "La operación necesita revisión. No vuelvas a pagar este pedido.",
      pagoId,
      pedido.id
    )
  }

  if (acreditado) {
    try {

      await confirmarPagoMercadoPago({
        pagoId,
        pedidoId: pedido.id,
        usuarioId: pedido.usuario_id
      })
    } catch (error) {
      await marcarRevision(intento?.id, error.message)
      throw error
    }
  }

  const conexion = await pool.connect()
  let conflicto = false

  try {
    await conexion.query("BEGIN")

    await conexion.query(
      "SELECT id FROM pedido WHERE id = $1 FOR UPDATE",
      [pedido.id]
    )

    const registro = await conexion.query(
      `SELECT referencia_externa, estado
       FROM pago
       WHERE id = $1
       FOR UPDATE`,
      [pedido.pago_id]
    )

    const pagoLocal = registro.rows[0]

    if (!pagoLocal) {
      throw new Error("No existe el registro local del pago")
    }

    if (intento) {
      await conexion.query(
        `UPDATE intento_pago_mp
         SET pago_mp_id = $1,
             estado = $2
         WHERE id = $3`,
        [pagoId, estadoMP, intento.id]
      )
    }

    if (
      pagoLocal.referencia_externa &&
      String(pagoLocal.referencia_externa) !== pagoId
    ) {

      conflicto = true

      if (intento) {
        await conexion.query(
          `UPDATE intento_pago_mp
           SET estado = 'REVISION'
           WHERE id = $1`,
          [intento.id]
        )
      }
    } else if (esRechazadoOCancelado(estadoMP)) {
      await conexion.query(
        `UPDATE pago
         SET referencia_externa = NULL,
             estado = 'RECHAZADO_MERCADO_PAGO'
         WHERE id = $1
           AND estado NOT LIKE 'APROBADO%'`,
        [pedido.pago_id]
      )
    } else if (!acreditado) {
      await conexion.query(
        `UPDATE pago
         SET referencia_externa = $1,
             estado = 'PENDIENTE_MERCADO_PAGO'
         WHERE id = $2
           AND estado NOT LIKE 'APROBADO%'`,
        [pagoId, pedido.pago_id]
      )
    }

    await conexion.query("COMMIT")
  } catch (error) {
    await conexion.query("ROLLBACK")
    throw error
  } finally {
    conexion.release()
  }

  if (conflicto) {
    return respuesta(
      "pending",
      "El pedido tiene otra operación asociada. Necesita revisión.",
      pagoId,
      pedido.id
    )
  }

  if (acreditado) {
    return respuesta(
      "approved",
      "Pago confirmado correctamente.",
      pagoId,
      pedido.id
    )
  }

  if (esRechazadoOCancelado(estadoMP)) {
    return respuesta(
      estadoMP,
      "El pago fue rechazado o cancelado. Puedes usar una tarjeta nueva.",
      pagoId,
      pedido.id
    )
  }

  return respuesta(
    estadoMP,
    "El pago está en proceso. Verifica su estado antes de volver a pagar.",
    pagoId,
    pedido.id
  )
}

export async function consultarPagoIntegrado({
  pedidoId,
  usuarioId
}) {
  const pedido = await obtenerPedido(pedidoId, usuarioId)

  if (String(pedido.estado_pago).startsWith("APROBADO")) {
    return respuesta(
      "approved",
      "Pago confirmado correctamente.",
      pedido.referencia_externa,
      pedido.id
    )
  }

  const resultado = await pool.query(
    `SELECT *
     FROM intento_pago_mp
     WHERE pedido_id = $1
     ORDER BY fecha DESC, id DESC
     LIMIT 1`,
    [pedido.id]
  )

  const intento = resultado.rows[0]

  const pagoId =
    intento?.pago_mp_id ||
    pedido.referencia_externa

  if (pagoId) {
    return procesarResultado(
      { id: pagoId },
      pedido,
      intento
    )
  }

  if (intento && esRechazadoOCancelado(intento.estado)) {
    return respuesta(
      intento.estado,
      "El intento anterior no se aprobó. Genera un nuevo formulario de pago.",
      null,
      pedido.id
    )
  }

  if (intento) {

    for (let offset = 0; offset < 250; offset += 50) {
      const busqueda = await pagosMP.search({
        options: {
          external_reference: String(pedido.id),
          sort: "date_created",
          criteria: "desc",
          limit: 50,
          offset
        }
      })

      const resultados = busqueda.results ?? []

      const recuperada = resultados.find(
        (pago) =>
          String(pago.metadata?.intento_id ?? "") ===
          String(intento.id)
      )

      if (recuperada) {
        return procesarResultado(
          { id: recuperada.id },
          pedido,
          intento
        )
      }

      if (resultados.length < 50) {
        break
      }
    }

    return respuesta(
      "pending",
      "Hay un intento sin respuesta confirmada. No vuelvas a pagar; solicita revisión.",
      null,
      pedido.id
    )
  }

  return respuesta(
    "ready",
    "Ingresa los datos de tu tarjeta.",
    null,
    pedido.id
  )
}

export async function cobrarTarjetaIntegrada({
  pedidoId,
  usuarioId,
  datos
}) {
  validarDatos(datos)

  const backendUrl = process.env.PUBLIC_BACKEND_URL
    ?.trim()
    .replace(/\/+$/, "")

  if (
    !backendUrl?.startsWith("https://") ||
    !process.env.MERCADOPAGO_SELLER_ID?.trim()
  ) {
    throw new Error(
      "Falta configurar PUBLIC_BACKEND_URL o MERCADOPAGO_SELLER_ID"
    )
  }

  const conexion = await pool.connect()

  let pedido
  let intento
  let existeOperacion = false

  try {
    await conexion.query("BEGIN")

    await conexion.query(
      `SELECT id
       FROM pedido
       WHERE id = $1
         AND usuario_id = $2
       FOR UPDATE`,
      [pedidoId, usuarioId]
    )

    pedido = await obtenerPedido(
      pedidoId,
      usuarioId,
      conexion
    )

    if (
      pedido.status !== "PENDIENTE" ||
      String(pedido.estado_pago).startsWith("APROBADO") ||
      !Number.isFinite(centavos(pedido.total)) ||
      centavos(pedido.total) <= 0 ||
      centavos(pedido.total) !== centavos(pedido.monto)
    ) {
      throw new Error(
        "El pedido no está disponible para pagar"
      )
    }

    const tokenHash = createHash("sha256")
      .update(datos.token)
      .digest("hex")

    const resultado = await conexion.query(
      `SELECT *
       FROM intento_pago_mp
       WHERE pedido_id = $1
         AND estado NOT IN ('rejected', 'cancelled')
       ORDER BY fecha DESC, id DESC
       LIMIT 1`,
      [pedido.id]
    )

    intento = resultado.rows[0]

    if (intento || pedido.referencia_externa) {
      existeOperacion = true
    } else {
      const nuevo = await conexion.query(
        `INSERT INTO intento_pago_mp (
           id,
           pedido_id,
           token_hash
         )
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          randomUUID(),
          pedido.id,
          tokenHash
        ]
      )

      intento = nuevo.rows[0]
    }

    await conexion.query("COMMIT")
  } catch (error) {
    await conexion.query("ROLLBACK")

    if (error.code === "23505") {
      throw new Error(
        "Este token ya fue utilizado. Recarga el formulario para generar otro."
      )
    }

    throw error
  } finally {
    conexion.release()
  }

  if (existeOperacion) {

    return consultarPagoIntegrado({
      pedidoId,
      usuarioId
    })
  }

  let operacion

  try {
    operacion = await pagosMP.create({
      body: {
        transaction_amount: Number(pedido.total),

        token: datos.token,

        description:
          `Quest Merchant ${pedido.numero_pedido}`,

        installments: datos.installments,

        payment_method_id: datos.paymentMethodId,

        ...(datos.issuerId
          ? { issuer_id: datos.issuerId }
          : {}),

        payer: {
          email: datos.email.trim(),

          ...(datos.identificationType &&
          datos.identificationNumber
            ? {
                identification: {
                  type: datos.identificationType,
                  number: datos.identificationNumber
                }
              }
            : {})
        },

        external_reference: String(pedido.id),

        notification_url:
          `${backendUrl}/webhooks/mercadopago`,

        metadata: {
          intento_id: intento.id
        }
      },

      requestOptions: {
        idempotencyKey: intento.id
      }
    })
  } catch (error) {
    const http = Number(
      error?.status ?? error?.statusCode
    )

    const causas = Array.isArray(error?.cause)
      ? error.cause
      : []

    const codigos = causas.map(
      (item) => String(item.code ?? "").toLowerCase()
    )

    const tokenInvalido =
      http === 400 &&
      (
        codigos.includes("invalid_card_token_id") ||
        /invalid.card.token.id/i.test(error?.message ?? "")
      )

    console.error(
      "[Mercado Pago] Error creando pago:",
      {
        pedidoId: pedido.id,
        intentoId: intento.id,

        http: Number.isFinite(http)
          ? http
          : null,

        message:
          error?.message ?? "Error desconocido",

        causas: causas.map((item) => ({
          code: item.code,
          description: item.description
        }))
      }
    )

    if (tokenInvalido) {

      await pool.query(
        `UPDATE intento_pago_mp
         SET estado = 'rejected'
         WHERE id = $1
           AND estado = 'CREANDO'`,
        [intento.id]
      )

      throw new Error(
        "El token de tarjeta no es válido. Genera uno nuevo e inténtalo otra vez."
      )
    }

    await marcarRevision(
      intento.id,
      "Resultado incierto de Payment.create"
    )

    throw new Error(
      "No se pudo confirmar la operación. Consulta el estado antes de volver a pagar."
    )
  }

  if (!/^[1-9]\d*$/.test(String(operacion?.id ?? ""))) {
    await marcarRevision(
      intento.id,
      "Payment.create respondió sin ID válido"
    )

    throw new Error(
      "Mercado Pago no devolvió un ID de pago válido"
    )
  }

  try {
    await pool.query(
      `UPDATE intento_pago_mp
       SET pago_mp_id = $1
       WHERE id = $2`,
      [
        String(operacion.id),
        intento.id
      ]
    )
  } catch (error) {
    console.error(
      "[Mercado Pago] No se pudo guardar el pago MP:",
      {
        intentoId: intento.id,
        pagoId: String(operacion.id),
        message: error.message
      }
    )

    throw new Error(
      "Se creó una operación, pero no se pudo registrarla. Requiere revisión."
    )
  }

  return procesarResultado(
    operacion,
    pedido,
    intento
  )
}
