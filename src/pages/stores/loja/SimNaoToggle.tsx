export default function SimNaoToggle({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="loja-field">
      <span id={`${id}-label`}>{label}</span>
      <div className="loja-simnao" role="group" aria-labelledby={`${id}-label`}>
        <button type="button" aria-pressed={value} onClick={() => onChange(true)}>
          Sim
        </button>
        <button type="button" data-off="true" aria-pressed={!value} onClick={() => onChange(false)}>
          Não
        </button>
      </div>
    </div>
  )
}
