
import { useState } from "react"
import { useCartStore, selectCount } from "../store/cartStore"
import { useAuthStore } from "../store/authStore"
import { useAvatarStore } from "../store/avatarStore"
import { Drawer } from "@/components/motion/drawer"

const avatarOptions = [
  ["star.svg", "Estrella"],
  ["leaf.svg", "Hoja"],
  ["ruedita.svg", "Rueda"],
  ["flame.svg", "Fuego"],
  ["biohazard.svg", "Biohazard"],
  ["copo.svg", "Copo"],
  ["mask.svg", "Máscara"],
  ["origami.svg", "Origami"],
  ["rose.svg", "Rosa"]
]

export default function ClientShell({
  children,
  navigate,
  search,
  setSearch
}) {
  const usuario = useAuthStore((state) => state.usuario)
  const logout = useAuthStore((state) => state.logout)

  const count = useCartStore(selectCount(usuario?.id))

  const avatar = useAvatarStore(
    (state) => state.avatars[usuario?.id] || "star.svg"
  )

  const setAvatar = useAvatarStore(
    (state) => state.setAvatar
  )

  const [showAvatars, setShowAvatars] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  const handleLogout = () => {
    logout()
    setShowAccount(false)
    navigate("/")
  }

  const goTo = (path) => {
    setShowAccount(false)
    navigate(path)
  }

  return (
    <div className="client-shell">

      <header className="topbar">

        <button
          className="brand"
          onClick={() => navigate("/")}
        >
          Quest Merchant
        </button>

        <div className="topbar-search">
          <input
            className="search"
            type="search"
            value={search || ""}
            onChange={(e) => setSearch?.(e.target.value)}
            placeholder="Buscar productos..."
            aria-label="Buscar productos"
            disabled={!setSearch}
          />
        </div>

        <div className="top-actions">

          <button
            className="ghost cart-button"
            onClick={() =>
              usuario
                ? navigate("/carrito")
                : navigate("/login")
            }
          >
            🛒
            <span>Carrito ({count})</span>
          </button>

          {!usuario ? (
            <button
              className="account-login"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          ) : (
            <div className="account-wrapper">

              <button
                className="account-trigger"
                onClick={() =>
                  setShowAccount((prev) => !prev)
                }
                aria-expanded={showAccount}
                aria-label="Menú de cuenta"
              >
                <img
                  src={`/avatars/${avatar}`}
                  alt="Avatar del usuario"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = "/avatars/star.svg"
                  }}
                />
                <span>{usuario.nombre}</span>
                <span className="account-chevron">⌄</span>
              </button>

              {showAccount && (
                <div className="account-menu">

                  <div className="account-menu-heading">
                    <strong>{usuario.nombre}</strong>
                    <small>Mi cuenta</small>
                  </div>

                  <button
                    type="button"
                    onClick={() => goTo("/me-gusta")}
                  >
                    ♥ Mis favoritos
                  </button>

                  <button
                    onClick={() => goTo("/pedidos")}
                  >
                    Mis pedidos
                  </button>

                  <button
                    onClick={() => {
                      setShowAccount(false)
                      setShowAvatars(true)
                    }}
                  >
                    Cambiar avatar
                  </button>

                  {usuario.rol === "ADMIN" && (
                    <button
                      onClick={() => goTo("/admin")}
                    >
                      Panel administrador
                    </button>
                  )}

                  <div className="account-menu-divider" />

                  <button
                    className="account-logout"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>

                </div>
              )}
            </div>
          )}

        </div>
      </header>

      <main className="content content-full">
        {children}
      </main>

      <footer className="footer footer-full">
        Quest Merchant · Tu próxima aventura comienza aquí
      </footer>

      <Drawer
        open={showAvatars}
        onOpenChange={setShowAvatars}
        side="right"
        ariaLabel="Seleccionar avatar"
        className="avatar-drawer"
        backdropClassName="avatar-drawer-backdrop"
      >
        <div className="avatar-drawer-header">
          <div>
            <span className="eyebrow">PERSONAJE</span>
            <h2>Elige tu clase</h2>
          </div>

          <button
            className="ghost"
            onClick={() => setShowAvatars(false)}
          >
            ✕
          </button>
        </div>

        <div className="avatar-drawer-grid">
          {avatarOptions.map(([file, name]) => (
            <button
              key={file}
              className={
                avatar === file
                  ? "avatar-drawer-option selected"
                  : "avatar-drawer-option"
              }
              onClick={() => {
                setAvatar(usuario.id, file)
                setShowAvatars(false)
              }}
            >
              <img
                src={`/avatars/${file}`}
                alt={name}
              />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </Drawer>

    </div>
  )
}
