import { useEffect, useState } from "react"
import { Check } from "lucide-react"

export function avisarSalvo(message = "Salvo com sucesso.") {
  window.dispatchEvent(new CustomEvent("pdv-salvo", { detail: message }))
}

export function AvisoSalvo() {
  const [message, setMessage] = useState("")
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let timer = 0
    function onAviso(event: Event) {
      setMessage(String((event as CustomEvent).detail || "Salvo com sucesso."))
      setTick((atual) => atual + 1)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMessage(""), 4500)
    }
    window.addEventListener("pdv-salvo", onAviso)
    return () => {
      window.removeEventListener("pdv-salvo", onAviso)
      window.clearTimeout(timer)
    }
  }, [])

  if (!message) return null
  return (
    <div className="pdv-salvo" role="status" key={tick}>
      <span className="pdv-salvo-ico" aria-hidden="true">
        <Check size={16} strokeWidth={3} />
      </span>
      <span>{message}</span>
    </div>
  )
}
