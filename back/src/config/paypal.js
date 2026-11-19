
const baseURL =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"

export async function obtenerPayPalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !secret) {
    throw new Error("Faltan las credenciales de PayPal")
  }

  const credentials = Buffer.from(
    `${clientId}:${secret}`
  ).toString("base64")

  const response = await fetch(
    `${baseURL}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  )

  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(
      "No se pudo autenticar con PayPal"
    )
  }

  return data.access_token
}

export async function paypalRequest(
  endpoint,
  { method = "GET", body, requestId } = {}
) {
  const token = await obtenerPayPalToken()

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  }

  if (requestId) {
    headers["PayPal-Request-Id"] = requestId
  }

  const response = await fetch(
    `${baseURL}${endpoint}`,
    {
      method,
      headers,
      
      ...(body !== undefined
        ? {
            body: typeof body === "string"
              ? body
              : JSON.stringify(body)
          }
        : {})
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      `PayPal rechazó la solicitud: ${data.message || response.status}`
    )
  }

  return data
}


export async function verificarWebhookPayPal(
  headers,
  cuerpoOriginal
) {
  const webhookId =
    process.env.PAYPAL_WEBHOOK_ID?.trim()

  if (!webhookId) {
    throw new Error(
      "Falta configurar PAYPAL_WEBHOOK_ID"
    )
  }

  
  const campos = {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: webhookId
  }

  if (Object.values(campos).some((valor) => !valor)) {
    return false
  }

  const payload =
    JSON.stringify(campos).slice(0, -1) +
    ',"webhook_event":' +
    cuerpoOriginal +
    "}"

  const respuesta = await paypalRequest(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: payload
    }
  )

  return respuesta.verification_status === "SUCCESS"
}

