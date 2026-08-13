import type { StoreChangeLogRow } from "./types"

function cell(value: string | null | undefined) {
  return value || "—"
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("pt-BR")
}

export default function TabLogs({ logs }: { logs: StoreChangeLogRow[] }) {
  return (
    <section className="loja-panel" aria-labelledby="loja-logs-title">
      <div className="loja-panel-head">
        <span id="loja-logs-title">Alterações de Configurações da Loja</span>
      </div>
      <div className="loja-panel-body">
        <div className="loja-table-wrap">
          <table className="loja-table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Alterou de</th>
                <th>Para</th>
                <th>Usuário</th>
                <th>Sessão</th>
                <th>Data</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhuma alteração registrada.</td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.field}</td>
                    <td>{cell(row.fromValue)}</td>
                    <td>{cell(row.toValue)}</td>
                    <td>{cell(row.userName)}</td>
                    <td>{cell(row.session)}</td>
                    <td>{formatWhen(row.createdAt)}</td>
                    <td>{cell(row.type)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
