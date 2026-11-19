import AuthForm from "../../components/AuthForm"
import { navigate } from "../../lib/navigate"
import { useAuthStore } from "../../store/authStore"

export default function Login() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <AuthForm
          mode="login"
          onSuccess={() => {
            const usuario = useAuthStore.getState().usuario
            navigate(usuario?.rol === "ADMIN" ? "/admin" : "/")
          }}
        />

        <div className="auth-switch">
          <button
            type="button"
            className="ghost"
            onClick={() => navigate("/recuperar-contrasena")}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <div className="auth-switch">
          <span>¿Aún no tienes cuenta?</span>
          <button
            type="button"
            className="ghost"
            onClick={() => navigate("/registro")}
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  )
}