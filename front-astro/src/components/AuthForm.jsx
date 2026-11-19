import { useState } from "react"
import { mutateGraphQL } from "../lib/apollo"
import { M_LOGIN, M_REGISTRAR_USUARIO } from "../lib/queries"
import { useAuthStore } from "../store/authStore"
import { Input } from "@/components/motion/input"
import { Eye, EyeOff } from "lucide-react"

export default function AuthForm({ mode = "login", onSuccess }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [nombre, setNombre] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const loginStore = useAuthStore((state) => state.login)
    const isRegister = mode === "register"

    const submit = async (event) => {
        event.preventDefault()
        setError("")

        if (isRegister && password !== confirmPassword) {
            setError("Las contraseñas no coinciden")
            return
        }

        setLoading(true)

        try {
            let response

            if (isRegister) {
                const result = await mutateGraphQL(M_REGISTRAR_USUARIO, {
                    datos: {
                        nombre,
                        email,
                        password
                    }
                })

                response = result.registrarUsuario
            } else {
                const result = await mutateGraphQL(M_LOGIN, {
                    email,
                    password
                })

                response = result.login
            }

            if (!response.ok) {
                throw new Error(response.mensaje)
            }

            loginStore(response.usuario, response.token)

            if (onSuccess) {
                onSuccess(response.usuario)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={submit}>
            <div className="auth-heading">
            <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
            <p>
                {isRegister
                ? "Crea tu cuenta y comienza tu próxima aventura."
                : "Continúa tu aventura en Quest Merchant."}
            </p>
            </div>

            {isRegister && (
            <Input
                label="Nombre"
                required
                value={nombre}
                onChange={setNombre}
                placeholder="Tu nombre"
            />
            )}

            <Input
                label="Correo"
                required
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="aventurero@correo.com"
            />

            <Input
                label="Contraseña"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={
                    isRegister ? "new-password" : "current-password"
                }
                rightIcon={
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                            showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        aria-pressed={showPassword}
                        title={
                            showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                }
            />

            
            {isRegister && (
                <Input
                    label="Confirmar contraseña"
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    rightIcon={
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                        }
                        aria-label={
                        showConfirmPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }           
                        aria-pressed={showConfirmPassword}
                    >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </button>
                    }
                    error={
                    confirmPassword && password !== confirmPassword
                        ? "Las contraseñas no coinciden"
                        : false
                    }
                    success={
                        Boolean(confirmPassword) &&
                        password === confirmPassword
                    }
                />
            )}

            {error && <div className="inline-error">{error}</div>}

            <button className="auth-submit" disabled={loading}>
            {loading
                ? "Procesando..."
                : isRegister
                ? "Crear cuenta"
                : "Iniciar sesión"}
            </button>
        </form>
    )
}