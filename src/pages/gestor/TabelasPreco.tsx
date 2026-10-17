import { FormEvent, useEffect, useState } from "react"
import { api, parseError } from "../../services/api"
import GestaoShell from "./GestaoShell"

type PriceTable = {
  id: string
  name: string
  slug: string
  isDefault: boolean
}

export default function TabelasPreco() {
  const [tables, setTables] = useState<PriceTable[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await api.get("/backoffice/price-tables")
    setTables(data.tables || [])
  }

  useEffect(() => {
    load().catch((err) => setError(parseError(err).friend || "Não foi possível carregar as tabelas."))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Informe o nome da tabela.")
      return
    }
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const { data } = await api.post("/backoffice/price-tables", { name: name.trim() })
      setTables(data.tables || [])
      setName("")
      setStatus("Tabela cadastrada.")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível cadastrar.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(table: PriceTable) {
    if (table.isDefault) return
    if (!window.confirm(`Excluir a tabela ${table.name}?`)) return
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const { data } = await api.delete(`/backoffice/price-tables/${table.id}`)
      setTables(data.tables || [])
      setStatus("Tabela excluída.")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível excluir.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <GestaoShell>
      <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold text-gray-800">Tabela de preços</h1>
        <p className="text-sm text-gray-600">
          Padrão é o preço de venda do produto. Lojas usa esse mesmo preço enquanto não houver um valor cadastrado nela.
          O lojista escolhe de qual tabela ele é no cadastro.
        </p>
        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4" onSubmit={onSubmit}>
          <label className="block min-w-[16rem] flex-1 text-sm font-medium text-gray-700">
            Nova tabela
            <input
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              placeholder="Nome da tabela"
            />
          </label>
          <button className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={busy}>
            Cadastrar
          </button>
        </form>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        {status ? <p className="text-sm font-semibold text-green-700">{status}</p> : null}
        <ul className="flex flex-col gap-2">
          {tables.map((table) => (
            <li key={table.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="font-semibold text-gray-800">{table.name}</p>
                <p className="text-sm text-gray-500">
                  {table.isDefault
                    ? "Preço de venda que já está no produto."
                    : table.slug === "lojas"
                      ? "Se não tiver preço cadastrado, usa o Padrão."
                      : "Usa o Padrão quando o produto não tiver preço nesta tabela."}
                </p>
              </div>
              {table.isDefault ? null : (
                <button
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-60"
                  type="button"
                  disabled={busy}
                  onClick={() => remove(table)}
                >
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </GestaoShell>
  )
}
