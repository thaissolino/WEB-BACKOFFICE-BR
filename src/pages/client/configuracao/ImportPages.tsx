import { FormEvent, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import CadastroShell from "../cadastros/CadastroShell"
import { api, parseError } from "../../../services/api"
import { usePdvSession } from "../dashboard/PdvShell"

export type ImportKind =
  | "cliente"
  | "fornecedor"
  | "produto"
  | "grade-categoria"
  | "crediario"
  | "contas-pagar"
  | "atualizar-estoque"
  | "atualizar-estoque-fornecedor"
  | "atualizar-produto"

type ImportDef = {
  kind: ImportKind
  title: string
  downloadLabel: string
  headers: string[]
  persist: "customer" | "supplier" | "product" | "stock" | "product-update" | "local"
}

const IMPORTS: Record<ImportKind, ImportDef> = {
  cliente: {
    kind: "cliente",
    title: "CLIENTE IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Cliente",
    headers: [
      "Nome",
      "Responsavel",
      "Carteira",
      "Telefone",
      "Classificacao",
      "Cidade",
      "UF",
      "CEP",
      "Documento",
      "CodigoFinanceiro",
    ],
    persist: "customer",
  },
  fornecedor: {
    kind: "fornecedor",
    title: "FORNECEDOR IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Fornecedor",
    headers: ["Fantasia", "Razao", "Documento", "Cidade", "UF", "Telefone", "Email"],
    persist: "supplier",
  },
  produto: {
    kind: "produto",
    title: "PRODUTO IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Produto",
    headers: ["Nome", "CodigoBarras", "Referencia", "PrecoVenda", "PrecoCusto", "Estoque", "NCM"],
    persist: "product",
  },
  "grade-categoria": {
    kind: "grade-categoria",
    title: "GRADE X CATEGORIA IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Grade x Categoria",
    headers: ["Categoria", "Tamanho", "Cor"],
    persist: "local",
  },
  crediario: {
    kind: "crediario",
    title: "CREDIÁRIO IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Crediários em Aberto",
    headers: ["Cliente", "Documento", "Valor", "Vencimento"],
    persist: "local",
  },
  "contas-pagar": {
    kind: "contas-pagar",
    title: "CONTAS A PAGAR IMPORTAÇÃO",
    downloadLabel: "Download Excel para importação de Contas a Pagar",
    headers: ["Fornecedor", "Documento", "Valor", "Vencimento"],
    persist: "local",
  },
  "atualizar-estoque": {
    kind: "atualizar-estoque",
    title: "ATUALIZAÇÃO DE ESTOQUE DE PRODUTOS",
    downloadLabel: "Download Excel para atualização de Estoque",
    headers: ["Codigo", "CodigoBarras", "Estoque"],
    persist: "stock",
  },
  "atualizar-estoque-fornecedor": {
    kind: "atualizar-estoque-fornecedor",
    title: "ATUALIZAÇÃO DE ESTOQUE DE PRODUTOS POR FORNECEDOR",
    downloadLabel: "Download Excel para atualização de Estoque Fornecedor",
    headers: ["Fornecedor", "CodigoBarras", "Estoque"],
    persist: "stock",
  },
  "atualizar-produto": {
    kind: "atualizar-produto",
    title: "ATUALIZAÇÃO PRODUTOS POR PLANILHA",
    downloadLabel: "Download Excel para atualização de Produto",
    headers: ["Codigo", "Nome", "PrecoVenda", "PrecoCusto", "NCM"],
    persist: "product-update",
  },
}

function splitCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return [] as string[][]
  const sep = lines[0].includes(";") ? ";" : ","
  return lines.map((line) => line.split(sep).map((cell) => cell.trim().replace(/^"|"$/g, "")))
}

function downloadTemplate(def: ImportDef) {
  const blob = new Blob([`${def.headers.join(";")}\n`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${def.kind}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function money(value: string) {
  const n = Number(String(value).replace(/\./g, "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export default function ImportacaoPage() {
  const params = useParams()
  const kind = (params.kind || "cliente") as ImportKind
  const def = IMPORTS[kind] ?? IMPORTS.cliente
  const { stores, storeId, storeName } = usePdvSession()
  const [loja, setLoja] = useState(storeId)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<string[][]>([])
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  const storeLabel = useMemo(() => {
    return stores.find((item) => item.id === loja)?.label ?? storeName
  }, [loja, storeName, stores])

  function onFile(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setFileName(file.name)
    setStatus("")
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = splitCsv(String(reader.result || ""))
      setRows(parsed.slice(1))
      setStatus(parsed.length > 1 ? `${parsed.length - 1} linha(s) lida(s).` : "Arquivo sem linhas de dados.")
    }
    reader.readAsText(file, "utf-8")
  }

  async function importRows() {
    if (rows.length === 0) {
      setStatus("Selecione o arquivo.")
      return
    }
    setBusy(true)
    setStatus("")
    let ok = 0
    let fail = 0
    try {
      if (def.persist === "customer") {
        for (const row of rows) {
          try {
            await api.post("/clients/customers", {
              name: row[0] || "Cliente importado",
              responsible: row[1] || "",
              portfolio: row[2] || "",
              phone: row[3] || "",
              classification: row[4] || "",
              city: row[5] || "",
              state: row[6] || "",
              cep: row[7] || "",
              document: row[8] || "",
              financialCode: row[9] || "",
              active: true,
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
      } else if (def.persist === "supplier") {
        for (const row of rows) {
          try {
            await api.post("/clients/suppliers", {
              personType: "juridica",
              document: row[2] || "",
              razao: row[1] || row[0] || "Fornecedor",
              fantasia: row[0] || row[1] || "Fornecedor",
              inscricaoEstadual: "",
              cep: "",
              address: "",
              number: "",
              neighborhood: "",
              city: row[3] || "",
              uf: row[4] || "",
              phone: row[5] || "",
              mobile: "",
              contact: "",
              profitCalc: "",
              email: row[6] || "",
              supplierKind: "produto",
              internal: false,
              notes: "",
              active: true,
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
      } else if (def.persist === "product") {
        const { data } = await api.get("/clients/products/categories")
        const categories = (data.categories as Array<{ id: string; name: string }>) ?? []
        const category = categories[0]
        for (const row of rows) {
          try {
            await api.post("/clients/products", {
              name: row[0] || "Produto importado",
              barcode: row[1] || "",
              reference: row[2] || "",
              salePrice: money(row[3]),
              costPrice: money(row[4]),
              stockQuantity: money(row[5]),
              ncm: row[6] || "",
              description: row[0] || "Produto importado",
              categoryId: category?.id || "",
              category: category?.name || "",
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
      } else if (def.persist === "stock") {
        const { data } = await api.get("/clients/products", { params: { ativo: "1" } })
        const products = (data.products as Array<{ id: string; code: string; barcode: string }>) ?? []
        for (const row of rows) {
          const match = products.find(
            (item) => item.code === row[0] || item.barcode === row[1] || item.barcode === row[0],
          )
          if (!match) {
            fail += 1
            continue
          }
          try {
            await api.patch(`/clients/products/${match.id}/stock`, { stockQuantity: money(row[2] || row[1]) })
            ok += 1
          } catch {
            fail += 1
          }
        }
      } else if (def.persist === "product-update") {
        const { data } = await api.get("/clients/products", { params: { ativo: "1" } })
        const products = (data.products as Array<{ id: string; code: string; name: string }>) ?? []
        for (const row of rows) {
          const match = products.find((item) => item.code === row[0] || item.name === row[1])
          if (!match) {
            fail += 1
            continue
          }
          try {
            await api.put(`/clients/products/${match.id}`, {
              name: row[1] || match.name,
              salePrice: money(row[2]),
              costPrice: money(row[3]),
              ncm: row[4] || "",
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
      } else {
        ok = rows.length
      }
      setStatus(
        def.persist === "local"
          ? `${ok} linha(s) lida(s) na loja ${storeLabel}. Este tipo não grava no financeiro/estoque.`
          : fail
            ? `Importados ${ok}. Falhas ${fail}. Loja: ${storeLabel}.`
            : `Importados ${ok} registro(s) na loja ${storeLabel}.`,
      )
    } catch (err) {
      setStatus(parseError(err).friend || "Não foi possível importar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-import-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-import-title">{def.title}</h1>
          <p className="pdv-cad-kicker">Primeiro faça o download do arquivo:</p>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => downloadTemplate(def)}>
              {def.downloadLabel}
            </button>
          </div>
          <form
            className="pdv-cad-form"
            onSubmit={(event) => {
              event.preventDefault()
              importRows()
            }}
          >
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Selecione o Arquivo:</span>
              <input type="file" accept=".csv,text/csv,.txt" onChange={onFile} />
            </div>
            {fileName ? <p className="pdv-cad-kicker">{fileName}</p> : <p className="pdv-cad-kicker">Nenhum arquivo selecionado</p>}
            <div className="pdv-cad-form-row">
              <span className="pdv-cad-form-label">Loja:</span>
              <select value={loja} onChange={(event) => setLoja(event.target.value)}>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pdv-cad-form-go">
              <button className="pdv-cad-btn pdv-cad-btn-green" type="submit" disabled={busy}>
                Importar
              </button>
            </div>
          </form>
          {status ? (
            <p className="pdv-prod-status" role="status">
              {status}
            </p>
          ) : null}
          <p className="pdv-cad-kicker">
            O modelo baixado é CSV (UTF-8). Planilha Excel do WM10 não é reproduzida como arquivo .xls.
          </p>
        </div>
      </section>
    </CadastroShell>
  )
}
