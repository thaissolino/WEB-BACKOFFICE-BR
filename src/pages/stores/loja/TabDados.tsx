import { UF_OPTIONS, type CnpjSwap, type StoreDados } from "./types"

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  const id = `loja-dados-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <label className="loja-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export default function TabDados({
  value,
  onChange,
}: {
  value: StoreDados
  onChange: (next: StoreDados) => void
}) {
  const g = value.geral
  const r = value.responsavel
  const p = value.proprietario

  function setGeral<K extends keyof StoreDados["geral"]>(key: K, next: StoreDados["geral"][K]) {
    onChange({ ...value, geral: { ...g, [key]: next } })
  }

  return (
    <div className="loja-two-col">
      <section className="loja-panel" aria-labelledby="loja-geral-title">
        <div className="loja-panel-head">
          <span id="loja-geral-title">Geral</span>
        </div>
        <div className="loja-panel-body loja-grid">
          <Field label="Razão" value={g.razao} onChange={(v) => setGeral("razao", v)} />
          <Field label="Fantasia" value={g.fantasia} onChange={(v) => setGeral("fantasia", v)} />
          <Field label="CNPJ" value={g.cnpj} onChange={(v) => setGeral("cnpj", v)} />
          <Field label="IE" value={g.ie} onChange={(v) => setGeral("ie", v)} />
          <Field label="IM" value={g.im} onChange={(v) => setGeral("im", v)} />
          <Field label="Telefone" value={g.telefone} onChange={(v) => setGeral("telefone", v)} />
          <Field label="Fax" value={g.fax} onChange={(v) => setGeral("fax", v)} />
          <Field label="Celular" value={g.celular} onChange={(v) => setGeral("celular", v)} />
          <Field label="Inauguração" value={g.inauguracao} onChange={(v) => setGeral("inauguracao", v)} />
          <Field label="CEP" value={g.cep} onChange={(v) => setGeral("cep", v)} />
          <div className="loja-field">
            <label htmlFor="loja-endereco">Endereço</label>
            <div className="loja-field-split">
              <input
                id="loja-endereco"
                value={g.endereco}
                onChange={(event) => setGeral("endereco", event.target.value)}
              />
              <label className="loja-inline" htmlFor="loja-numero">
                <span>N.</span>
                <input
                  id="loja-numero"
                  value={g.numero}
                  onChange={(event) => setGeral("numero", event.target.value)}
                />
              </label>
            </div>
          </div>
          <Field label="Bairro" value={g.bairro} onChange={(v) => setGeral("bairro", v)} />
          <label className="loja-field" htmlFor="loja-uf">
            <span>UF</span>
            <select id="loja-uf" value={g.uf} onChange={(event) => setGeral("uf", event.target.value)}>
              <option value="">Selecione...</option>
              {UF_OPTIONS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          <Field label="Cidade" value={g.cidade} onChange={(v) => setGeral("cidade", v)} />
          <Field label="E-mail Contato" value={g.emailContato} onChange={(v) => setGeral("emailContato", v)} />
          <Field label="E-mail Cobrança" value={g.emailCobranca} onChange={(v) => setGeral("emailCobranca", v)} />
          <Field label="Nome Matriz" value={g.nomeMatriz} onChange={(v) => setGeral("nomeMatriz", v)} />
        </div>
      </section>

      <div>
        <section className="loja-panel" aria-labelledby="loja-resp-title">
          <div className="loja-panel-head">
            <span id="loja-resp-title">Responsável</span>
          </div>
          <div className="loja-panel-body loja-grid">
            <Field
              label="Nome"
              value={r.nome}
              onChange={(v) => onChange({ ...value, responsavel: { ...r, nome: v } })}
            />
            <Field
              label="Telefone"
              value={r.telefone}
              onChange={(v) => onChange({ ...value, responsavel: { ...r, telefone: v } })}
            />
          </div>
        </section>

        <section className="loja-panel" aria-labelledby="loja-prop-title">
          <div className="loja-panel-head">
            <span id="loja-prop-title">Proprietário</span>
          </div>
          <div className="loja-panel-body loja-grid">
            <Field
              label="Nome"
              value={p.nome}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, nome: v } })}
            />
            <Field
              label="CPF"
              value={p.cpf}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, cpf: v } })}
            />
            <Field
              label="RG"
              value={p.rg}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, rg: v } })}
            />
            <Field
              label="Nascimento"
              value={p.nascimento}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, nascimento: v } })}
            />
            <Field
              label="E-mail"
              value={p.email}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, email: v } })}
            />
            <Field
              label="Telefone"
              value={p.telefone}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, telefone: v } })}
            />
            <Field
              label="Celular"
              value={p.celular}
              onChange={(v) => onChange({ ...value, proprietario: { ...p, celular: v } })}
            />
          </div>
        </section>

        <section className="loja-panel" aria-labelledby="loja-cnpj-title">
          <div className="loja-panel-head">
            <span id="loja-cnpj-title">Trocas de CNPJ</span>
          </div>
          <div className="loja-panel-body">
            <div className="loja-table-wrap">
              <table className="loja-table">
                <thead>
                  <tr>
                    <th>Data alteração</th>
                    <th>CNPJ antigo</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {value.trocasCnpj.length === 0 ? (
                    <tr>
                      <td colSpan={3}>Nenhuma troca de CNPJ.</td>
                    </tr>
                  ) : (
                    value.trocasCnpj.map((row: CnpjSwap, index) => (
                      <tr key={`${row.dataAlteracao}-${index}`}>
                        <td>{row.dataAlteracao}</td>
                        <td>{row.cnpjAntigo}</td>
                        <td>{row.descricao}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
