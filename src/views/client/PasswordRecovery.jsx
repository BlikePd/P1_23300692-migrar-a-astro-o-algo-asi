
import { useState } from "react"
import { mutateGraphQL } from "../../lib/apollo"
import { M_SOLICITAR_RECUPERACION, M_RESTABLECER_PASSWORD } from "../../lib/queries"
import { navigate } from "../../lib/navigate"

export default function PasswordRecovery({ mode = "request" }) {
  const esRestablecer = mode === "reset"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState("")

  const token = esRestablecer && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null

  const enviar = async (event) => {
    event.preventDefault()
    if (loading) return
    setError("")

    if (esRestablecer) {
      if (!token) {
        setError("Este enlace de recuperación no es válido")
        return
      }

      if (password.length < 8 || password.length > 128) {
        setError("La contraseña debe tener entre 8 y 128 caracteres")
        return
      }

      if (password !== confirmacion) {
        setError("Las contraseñas no coinciden")
        return
      }
    }

    setLoading(true)

    try {
      if (esRestablecer) {
        const resultado = await mutateGraphQL(M_RESTABLECER_PASSWORD, {
          token,
          nuevaPassword: password
        })

        if (resultado.restablecerPassword !== true) {
          throw new Error("No se pudo restablecer la contraseña")
        }

        window.history.replaceState(null, "", window.location.pathname)
      } else {
        await mutateGraphQL(M_SOLICITAR_RECUPERACION, {
          email: email.trim()
        })
      }

      setExito(true)
    } catch (err) {
      setError(err.message || "No se pudo completar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="eyebrow">QUEST MERCHANT</span>
          <h1>{esRestablecer ? "Nueva contraseña" : "Recuperar contraseña"}</h1>
          <p>
            {esRestablecer
              ? "Escribe tu nueva contraseña para volver a entrar a tu cuenta."
              : "Te enviaremos un enlace para restablecer tu contraseña."}
          </p>
        </div>

        {exito ? (
          <div className="notice-card" role="status">
            <p>
              {esRestablecer
                ? "Tu contraseña se cambió correctamente. Ya puedes iniciar sesión."
                : "Si existe una cuenta activa con ese correo, recibirás un enlace válido por 30 minutos. Revisa también la carpeta de spam."}
            </p>
            <button type="button" onClick={() => navigate("/login")}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={enviar}>
            {esRestablecer ? (
              <>
                {!token && (
                  <div className="inline-error" role="alert">
                    El enlace no contiene un token válido.
                  </div>
                )}

                <label className="recovery-field">
                  Nueva contraseña
                  <input
                    type={mostrar ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                <label className="recovery-field">
                  Confirmar contraseña
                  <input
                    type={mostrar ? "text" : "password"}
                    value={confirmacion}
                    onChange={(event) => setConfirmacion(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                  />
                </label>

                <label className="recovery-check">
                  <input
                    type="checkbox"
                    checked={mostrar}
                    onChange={(event) => setMostrar(event.target.checked)}
                  />
                  Mostrar contraseñas
                </label>
              </>
            ) : (
              <label className="recovery-field">
                Correo electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@gmail.com"
                  autoComplete="email"
                  required
                />
              </label>
            )}

            {error && <div className="inline-error" role="alert">{error}</div>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || (esRestablecer && !token)}
            >
              {loading
                ? "Procesando..."
                : esRestablecer
                  ? "Guardar nueva contraseña"
                  : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <button type="button" className="ghost" onClick={() => navigate("/login")}>
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    </main>
  )
}
