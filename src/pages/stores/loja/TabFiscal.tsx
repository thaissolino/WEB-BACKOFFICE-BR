import SimNaoToggle from "./SimNaoToggle"
import type { StoreFiscal } from "./types"

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="loja-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione...",
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <label className="loja-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function TabFiscal({
  value,
  onChange,
  notice,
}: {
  value: StoreFiscal
  onChange: (next: StoreFiscal) => void
  notice?: string
}) {
  const c = value.certificado

  return (
    <div>
      <section className="loja-panel" aria-labelledby="loja-fiscal-geral">
        <div className="loja-panel-head">
          <span id="loja-fiscal-geral">Geral</span>
          <button className="loja-btn loja-btn-blue" type="button" title="Paramêtros Fiscais">
            Paramêtros Fiscais
          </button>
        </div>
        <div className="loja-panel-body loja-grid">
          <SelectField
            id="regime"
            label="Regime Tributário"
            value={value.regimeTributario}
            onChange={(v) => onChange({ ...value, regimeTributario: v })}
            options={["Simples Nacional", "Lucro Presumido", "Lucro Real"]}
          />
          <Field
            id="aliq"
            label="Aliq. aplicável cálc. crédito"
            value={value.aliqCredito}
            onChange={(v) => onChange({ ...value, aliqCredito: v })}
          />
          <SelectField
            id="regra-pf"
            label="Regra padrão NF-e PF"
            value={value.regraNfePf}
            onChange={(v) => onChange({ ...value, regraNfePf: v })}
            options={["Padrão"]}
          />
          <SelectField
            id="regra-pj"
            label="Regra padrão NF-e PJ"
            value={value.regraNfePj}
            onChange={(v) => onChange({ ...value, regraNfePj: v })}
            options={["Padrão"]}
          />
          <SelectField
            id="regra-nfce"
            label="Regra padrão NFC-e"
            value={value.regraNfce}
            onChange={(v) => onChange({ ...value, regraNfce: v })}
            options={["Padrão"]}
          />
          <SelectField
            id="regra-sat"
            label="Regra padrão SAT CF-e"
            value={value.regraSatCfe}
            onChange={(v) => onChange({ ...value, regraSatCfe: v })}
            options={["Padrão"]}
          />
          <div className="loja-field">
            <span>ICMS(ECF) padrão</span>
            <div className="loja-field-split">
              <select
                aria-label="ICMS(ECF) padrão"
                value={value.icmsEcfTipo}
                onChange={(event) => onChange({ ...value, icmsEcfTipo: event.target.value })}
              >
                <option>Tributado</option>
                <option>Isento</option>
              </select>
              <input
                aria-label="Alíquota ICMS(ECF)"
                value={value.icmsEcfAliq}
                onChange={(event) => onChange({ ...value, icmsEcfAliq: event.target.value })}
              />
            </div>
          </div>
          <SelectField
            id="frete-mod"
            label="Modalidade do Frete padrão"
            value={value.modalidadeFrete}
            onChange={(v) => onChange({ ...value, modalidadeFrete: v })}
            options={["Sem Ocorrência de Transporte"]}
          />
          <SelectField
            id="transportadora"
            label="Transportadora padrão"
            value={value.transportadora}
            onChange={(v) => onChange({ ...value, transportadora: v })}
            options={[]}
            placeholder="Nenhum selecionado"
          />
          <SelectField
            id="info-adic"
            label="Informação Adicional padrão"
            value={value.informacaoAdicional}
            onChange={(v) => onChange({ ...value, informacaoAdicional: v })}
            options={["Nenhum"]}
          />
          <Field
            id="meta"
            label="Meta de Faturamento"
            value={value.metaFaturamento}
            onChange={(v) => onChange({ ...value, metaFaturamento: v })}
          />
          <SimNaoToggle
            id="exibir-fatura"
            label="Exibir Fatura"
            value={value.exibirFatura}
            onChange={(v) => onChange({ ...value, exibirFatura: v })}
          />
          <SimNaoToggle
            id="habilita-frete"
            label="Habilita Frete(NFe/NFCe)"
            value={value.habilitaFrete}
            onChange={(v) => onChange({ ...value, habilitaFrete: v })}
          />
          <SimNaoToggle
            id="habilita-num"
            label="Habilita última numeração de nota mais um"
            value={value.habilitaUltimaNumeracao}
            onChange={(v) => onChange({ ...value, habilitaUltimaNumeracao: v })}
          />
          <SimNaoToggle
            id="habilita-brinde"
            label="Habilita Brinde NF"
            value={value.habilitaBrindeNf}
            onChange={(v) => onChange({ ...value, habilitaBrindeNf: v })}
          />
          <div className="loja-field">
            <span>Tributação ICMS(PF)</span>
            <div className="loja-radio" role="radiogroup" aria-label="Tributação ICMS(PF)">
              <label>
                <input
                  type="radio"
                  name="icms-pf"
                  checked={value.tributacaoIcmsPf === "padrao"}
                  onChange={() => onChange({ ...value, tributacaoIcmsPf: "padrao" })}
                />
                padrão
              </label>
              <label>
                <input
                  type="radio"
                  name="icms-pf"
                  checked={value.tributacaoIcmsPf === "alternativo"}
                  onChange={() => onChange({ ...value, tributacaoIcmsPf: "alternativo" })}
                />
                Alternativo
              </label>
            </div>
          </div>
          <SelectField
            id="cod-nfe"
            label="Cod Padrão da NFe"
            value={value.codPadraoNfe}
            onChange={(v) => onChange({ ...value, codPadraoNfe: v })}
            options={["Código do Produto"]}
          />
          <SelectField
            id="ordem-nota"
            label="Ordem dos produtos dentro da nota."
            value={value.ordemProdutosNota}
            onChange={(v) => onChange({ ...value, ordemProdutosNota: v })}
            options={["Nome do produto A-Z"]}
          />
        </div>
      </section>

      <section className="loja-panel" aria-labelledby="loja-cert-title">
        <div className="loja-panel-head">
          <span id="loja-cert-title">Certificado Digital</span>
        </div>
        <div className="loja-panel-body">
          <div className="loja-btn-row" style={{ marginBottom: 12 }}>
            <button className="loja-btn loja-btn-green" type="button">
              + Novo Certificado
            </button>
            <button className="loja-btn loja-btn-blue" type="button">
              Carregar Logo
            </button>
            <button className="loja-btn loja-btn-orange" type="button">
              Testar NF-e
            </button>
            <button className="loja-btn loja-btn-orange" type="button">
              Testar NFC-e
            </button>
          </div>
          {notice ? (
            <p className="loja-status" data-tone="ok" role="status">
              {notice}
            </p>
          ) : null}
          <div className="loja-grid">
            <Field
              id="cod-interno"
              label="Código Interno"
              value={c.codigoInterno}
              onChange={(v) => onChange({ ...value, certificado: { ...c, codigoInterno: v } })}
            />
            <Field
              id="cert-nome"
              label="Nome"
              value={c.nome}
              onChange={(v) => onChange({ ...value, certificado: { ...c, nome: v } })}
            />
            <Field
              id="cert-email"
              label="E-mail"
              value={c.email}
              onChange={(v) => onChange({ ...value, certificado: { ...c, email: v } })}
            />
            <Field
              id="token-prod"
              label="ID/Token Produção"
              value={c.tokenProducao}
              onChange={(v) => onChange({ ...value, certificado: { ...c, tokenProducao: v } })}
            />
            <Field
              id="token-hom"
              label="ID/Token Homologação"
              value={c.tokenHomologacao}
              onChange={(v) => onChange({ ...value, certificado: { ...c, tokenHomologacao: v } })}
            />
          </div>
          <div className="loja-logos" style={{ marginTop: 12 }}>
            <div className="loja-logo-box">Logo NF-e</div>
            <div className="loja-logo-box">Logo NFC-e</div>
          </div>
          <p className="loja-help">Ao subir um novo certificado, automaticamente o antigo será inativado.</p>
          <div className="loja-table-wrap" style={{ marginTop: 12 }}>
            <table className="loja-table">
              <thead>
                <tr>
                  <th>Cod</th>
                  <th>Modelo</th>
                  <th>Cadastro</th>
                  <th>Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {c.certificados.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Nenhum certificado cadastrado.</td>
                  </tr>
                ) : (
                  c.certificados.map((row) => (
                    <tr key={row.cod}>
                      <td>{row.cod}</td>
                      <td>{row.modelo}</td>
                      <td>{row.cadastro}</td>
                      <td>{row.vencimento}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
