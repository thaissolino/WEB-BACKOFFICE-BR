import SimNaoToggle from "./SimNaoToggle"
import { STATUS_OPTIONS, type StoreIntegracoes } from "./types"
import { WM10_API_URL, WM10_WEBHOOK_PLACEHOLDER } from "./defaults"

const COMMERCIAL_ALERT =
  "Atenção. Caso tenha interesse em conhecer esse produto, por favor entre contato com nosso comercial."

function StatusRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = `status-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <label className="loja-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function TabIntegracoes({
  value,
  onChange,
  testNotice,
  onTestSmartbis,
}: {
  value: StoreIntegracoes
  onChange: (next: StoreIntegracoes) => void
  testNotice?: string
  onTestSmartbis?: () => void
}) {
  const s = value.status
  const sb = value.smartbis
  const api = value.wm10Api
  const hook = value.wm10Webhook

  function showMapsHelp() {
    window.alert("Necessária para exibir o mapa de localização de clientes no Dashboard.")
  }

  return (
    <div>
      <section className="loja-panel" aria-labelledby="loja-sigep-title">
        <div className="loja-panel-head">
          <span id="loja-sigep-title">SIGEP</span>
          <span className="loja-brand">Correios</span>
        </div>
        <div className="loja-panel-body">
          <div className="loja-alert" role="status">
            {COMMERCIAL_ALERT}
          </div>
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-status-title">
        <div className="loja-panel-head">
          <span id="loja-status-title">Status</span>
        </div>
        <div className="loja-panel-body loja-grid">
          <p className="loja-note" style={{ marginTop: 0 }}>
            Alterar Status
          </p>
          <StatusRow
            label="NF-e"
            value={s.nfe}
            onChange={(v) => onChange({ ...value, status: { ...s, nfe: v } })}
          />
          <StatusRow
            label="PLP"
            value={s.plp}
            onChange={(v) => onChange({ ...value, status: { ...s, plp: v } })}
          />
          <StatusRow
            label="Conferência"
            value={s.conferencia}
            onChange={(v) => onChange({ ...value, status: { ...s, conferencia: v } })}
          />
          <StatusRow
            label="Impressão de Pedido"
            value={s.impressaoPedido}
            onChange={(v) => onChange({ ...value, status: { ...s, impressaoPedido: v } })}
          />
          <StatusRow
            label="Conferência de envio"
            value={s.conferenciaEnvio}
            onChange={(v) => onChange({ ...value, status: { ...s, conferenciaEnvio: v } })}
          />
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-smartbis-title">
        <div className="loja-panel-head">
          <span id="loja-smartbis-title">Sistema Fidelidade</span>
          <span className="loja-brand">SMARTBIS</span>
        </div>
        <div className="loja-panel-body loja-grid">
          <label className="loja-field" htmlFor="smartbis-token">
            <span>Token de acesso</span>
            <input
              id="smartbis-token"
              value={sb.token}
              onChange={(event) => onChange({ ...value, smartbis: { ...sb, token: event.target.value } })}
            />
          </label>
          <label className="loja-field" htmlFor="smartbis-senha">
            <span>Senha</span>
            <input
              id="smartbis-senha"
              type="password"
              value={sb.senha}
              onChange={(event) => onChange({ ...value, smartbis: { ...sb, senha: event.target.value } })}
            />
          </label>
          <SimNaoToggle
            id="smartbis-ativo"
            label="Ativo"
            value={sb.ativo}
            onChange={(v) => onChange({ ...value, smartbis: { ...sb, ativo: v } })}
          />
          <div className="loja-field">
            <span />
            <button className="loja-btn loja-btn-orange" type="button" onClick={onTestSmartbis}>
              Testar Conexão
            </button>
          </div>
          {testNotice ? (
            <p className="loja-status" data-tone="ok" role="status">
              {testNotice}
            </p>
          ) : null}
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-boleto-title">
        <div className="loja-panel-head">
          <span id="loja-boleto-title">Boleto</span>
          <span className="loja-brand">Boleto Cloud</span>
        </div>
        <div className="loja-panel-body">
          <div className="loja-alert" role="status">
            {COMMERCIAL_ALERT}
          </div>
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-wm10-api-title">
        <div className="loja-panel-head">
          <span id="loja-wm10-api-title">WM10 API</span>
        </div>
        <div className="loja-panel-body loja-grid">
          <div className="loja-field">
            <span>URL</span>
            <div className="loja-url-ro">
              <code>{api.url || WM10_API_URL}</code>
              <a href={api.url || WM10_API_URL} target="_blank" rel="noreferrer">
                [acessar]
              </a>
            </div>
          </div>
          <label className="loja-field" htmlFor="wm10-cnpj">
            <span>CNPJ</span>
            <input
              id="wm10-cnpj"
              value={api.cnpj}
              onChange={(event) => onChange({ ...value, wm10Api: { ...api, cnpj: event.target.value } })}
            />
          </label>
          <label className="loja-field" htmlFor="wm10-token">
            <span>Token</span>
            <input
              id="wm10-token"
              value={api.token}
              onChange={(event) => onChange({ ...value, wm10Api: { ...api, token: event.target.value } })}
            />
          </label>
          <p className="loja-note">
            Cada requisição terá um custo de R$ 0,01 e será enviado o custo na próxima mensalidade!
            Requisição é considerada qualquer consulta, cadastro ou atualização, por isso mantenha seu
            token protegido!
          </p>
          <div className="loja-table-wrap">
            <table className="loja-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Qtd Requisições</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {api.usage.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Nenhuma requisição registrada.</td>
                  </tr>
                ) : (
                  api.usage.map((row) => (
                    <tr key={row.mes}>
                      <td>{row.mes}</td>
                      <td>{row.qtd}</td>
                      <td>{row.valor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-wm10-hook-title">
        <div className="loja-panel-head">
          <span id="loja-wm10-hook-title">WM10 Webhook</span>
        </div>
        <div className="loja-panel-body loja-grid">
          <SimNaoToggle
            id="hook-ativo"
            label="Ativo"
            value={hook.ativo}
            onChange={(v) => onChange({ ...value, wm10Webhook: { ...hook, ativo: v } })}
          />
          <p className="loja-note" style={{ fontWeight: 800, color: "inherit" }}>
            Módulos do Webhook
          </p>
          <SimNaoToggle
            id="hook-venda"
            label="Venda"
            value={hook.venda}
            onChange={(v) => onChange({ ...value, wm10Webhook: { ...hook, venda: v } })}
          />
          <SimNaoToggle
            id="hook-cliente"
            label="Cliente"
            value={hook.cliente}
            onChange={(v) => onChange({ ...value, wm10Webhook: { ...hook, cliente: v } })}
          />
          <SimNaoToggle
            id="hook-produto"
            label="Produto"
            value={hook.produto}
            onChange={(v) => onChange({ ...value, wm10Webhook: { ...hook, produto: v } })}
          />
          <label className="loja-field" htmlFor="hook-url">
            <span>URL webhook de destino</span>
            <input
              id="hook-url"
              placeholder={WM10_WEBHOOK_PLACEHOLDER}
              value={hook.url}
              onChange={(event) => onChange({ ...value, wm10Webhook: { ...hook, url: event.target.value } })}
            />
          </label>
          <div className="loja-field">
            <span />
            <a className="loja-btn loja-btn-blue" href="https://app.wm10.com.br/webhook" target="_blank" rel="noreferrer">
              Ver Documentação
            </a>
          </div>
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-maps-title">
        <div className="loja-panel-head">
          <span id="loja-maps-title">Google Maps</span>
        </div>
        <div className="loja-panel-body">
          <div className="loja-field">
            <label htmlFor="maps-key">API Key</label>
            <div className="loja-inline">
              <input
                id="maps-key"
                style={{ flex: 1 }}
                placeholder="AIzaSy..."
                value={value.googleMapsApiKey}
                onChange={(event) => onChange({ ...value, googleMapsApiKey: event.target.value })}
              />
              <button className="loja-info" type="button" aria-label="Informação da API Key" onClick={showMapsHelp}>
                i
              </button>
            </div>
          </div>
          <p className="loja-help">
            Necessária para exibir o mapa de localização de clientes no Dashboard.
          </p>
        </div>
      </section>
    </div>
  )
}
