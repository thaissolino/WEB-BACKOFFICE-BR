import { useEffect, useState } from "react"

export function avisarSalvo(message = "Salvo.") {
  window.dispatchEvent(new CustomEvent("pdv-salvo", { detail: message }))
}

export function AvisoSalvo() {
  const [message, setMessage] = useState("")

  useEffect(() => {
    let timer = 0
    function onAviso(event: Event) {
      setMessage(String((event as CustomEvent).detail || "Salvo."))
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(""), 3200)
    }
    window.addEventListener("pdv-salvo", onAviso)
    return () => {
      window.removeEventListener("pdv-salvo", onAviso)
      window.clearTimeout(timer)
    }
  }, [])

  if (!message) return null
  return (
    <p className="pdv-salvo" role="status">
      {message}
    </p>
  )
}
