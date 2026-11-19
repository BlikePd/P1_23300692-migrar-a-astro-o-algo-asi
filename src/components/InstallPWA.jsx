import { useEffect, useState } from "react"

// Bono P10: botón propio de instalación con beforeinstallprompt.
export default function InstallPWA() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }
    const onPrompt = (e) => {
      e.preventDefault() // evita el mini-infobar y guarda el evento
      setPromptEvent(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed || !promptEvent) return null

  const instalar = async () => {
    promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null) // el evento solo se puede usar una vez
  }

  return (
    <button
      type="button"
      onClick={instalar}
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 60,
        padding: ".7rem 1.1rem",
        border: "none",
        borderRadius: "999px",
        background: "var(--accent)",
        color: "#fff",
        fontWeight: 600,
        fontFamily: "inherit",
        boxShadow: "var(--shadow)",
        cursor: "pointer"
      }}
    >
      Instalar Quest Merchant
    </button>
  )
}
