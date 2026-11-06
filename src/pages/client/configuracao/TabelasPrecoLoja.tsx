import { FormEvent, useEffect, useState } from "react"
import CadastroShell from "../cadastros/CadastroShell"
import { api, parseError } from "../../../services/api"
import { avisarSalvo } from "../avisoSalvo"

type PriceTable = {
  id: string
  name: string
}

export default function TabelasPrecoLoja() {
  const [tables, setTables] = useState<PriceTable[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function load() {
    api
      .get("/clients/price-tables")
      .then(({ data }) => {
        setTables(data.tables || [])
        setError("")
      })
      .catch((err) => setError(parseError(err).friend || "Não foi possível carregar as tabelas."))
  }

  useEffect(() => {
    load()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (clean.length < 2) {
      setError("Informe o nome da tabela.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const { data } = await api.post("/clients/price-tables", { name: clean })
      setTables(data.tables || [])
      setName("")
      avisarSalvo("Tabela cadastrada.")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível cadastrar.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(table: PriceTable) {
    if (!window.confirm(`Excluir a tabela ${table.name}?`)) return
    setBusy(true)
    setError("")
    try {
      const { data } = await api.delete(`/clients/price-tables/${table.id}`)
      setTables(data.tables || [])
      avisarSalvo("Tabela excluída.")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível excluir.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page pdv-cli-page" aria-labelledby="pdv-tabelas-preco">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-tabelas-preco">TABELAS DE PREÇO</h1>
          <p className="pdv-cad-kicker">A tabela cadastrada aparece como coluna na lista de produtos.</p>
          <form className="pdv-tabelas-form" onSubmit={(event) => void onSubmit(event)}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.toLocaleUpperCase("pt-BR"))}
              autoComplete="off"
              placeholder="Nome da tabela"
              aria-label="Nome da tabela"
            />
            <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={busy}>
              Cadastrar
            </button>
          </form>
          {error ? <p className="pdv-cad-error">{error}</p> : null}
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th className="act">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tables.length === 0 ? (
                  <tr>
                    <td className="pdv-cad-vazio" colSpan={2}>
                      Nenhuma tabela cadastrada.
                    </td>
                  </tr>
                ) : (
                  tables.map((table) => (
                    <tr key={table.id}>
                      <td>{table.name}</td>
                      <td className="act">
                        <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => void remove(table)}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </CadastroShell>
  )
}
