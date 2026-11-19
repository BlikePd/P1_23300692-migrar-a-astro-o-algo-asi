import AuthForm from "../../components/AuthForm"
import { navigate } from "../../lib/navigate"

export default function Register() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <AuthForm
          mode="register"
          onSuccess={() => navigate("/")}
        />

        <div className="auth-switch">
          <span>¿Ya tienes cuenta?</span>

          <button
            className="ghost"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  )
}