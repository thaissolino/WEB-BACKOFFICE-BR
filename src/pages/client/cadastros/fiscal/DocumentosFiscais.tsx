import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import CadastroShell from "../CadastroShell"

export function ParametrosFiscais() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({
    regra: "Todos",
    ncm: "",
    movimentacao: "Todos",
    cst: "Todos",
    uf: "",
  })

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-nfe-param">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-nfe-param">PARÂMETROS DE DOCUMENTOS FISCAIS</h1>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button">Novo Parâmetro</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/configuracao/transportadora")}>Transportadora</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Informação Adicional</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Regra</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/produtos/ncm")}>NCM</button>
          </div>
          <form className="pdv-cad-filters" onSubmit={(event: FormEvent) => event.preventDefault()}>
            <label>
              Regra
              <select value={draft.regra} onChange={(event) => setDraft({ ...draft, regra: event.target.value })}>
                <option>Todos</option>
              </select>
            </label>
            <label>
              NCM
              <input value={draft.ncm} onChange={(event) => setDraft({ ...draft, ncm: event.target.value })} autoComplete="off" />
            </label>
            <label>
              Movimentação
              <select value={draft.movimentacao} onChange={(event) => setDraft({ ...draft, movimentacao: event.target.value })}>
                <option>Todos</option>
                <option>Entrada</option>
                <option>Saída</option>
              </select>
            </label>
            <label>
              CST Entrada
              <select value={draft.cst} onChange={(event) => setDraft({ ...draft, cst: event.target.value })}>
                <option>Todos</option>
              </select>
            </label>
            <label>
              UF Destino
              <input value={draft.uf} onChange={(event) => setDraft({ ...draft, uf: event.target.value })} autoComplete="off" />
            </label>
            <div className="pdv-cad-filters-go">
              <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">Filtrar</button>
            </div>
          </form>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Regra</th>
                  <th>NCM</th>
                  <th>Movimentação</th>
                  <th>CSTEntrada</th>
                  <th>UFDestino</th>
                  <th>Ativo</th>
                  <th>Atualizar | Replicar</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>
          <p className="pdv-cad-kicker">Parâmetros fiscais da loja. Emissão SEFAZ/NFS-e permanece fora desta tela.</p>
        </div>
      </section>
    </CadastroShell>
  )
}

export function CertificadoDigital() {
  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cert-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cert-title">CERTIFICADO DIGITAL</h1>
          <p className="pdv-cad-kicker">Envio e validade do certificado A1/A3 dependem da SEFAZ. Esta tela não simula autorização fiscal.</p>
          <div className="pdv-cad-form">
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Arquivo</span>
              <input type="file" disabled aria-label="Arquivo do certificado" />
            </div>
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Senha</span>
              <input type="password" disabled autoComplete="off" />
            </div>
          </div>
        </div>
      </section>
    </CadastroShell>
  )
}
