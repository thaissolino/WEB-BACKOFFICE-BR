import { ChangeEvent, CSSProperties, Fragment, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { api, parseError } from "../../../../services/api"
import { avisarSalvo } from "../../avisoSalvo"
import { CadastroFrame } from "../CadastroShell"
import { loadProductCategories, toFlatOptions, type FlatOption } from "./categoryModel"
import {
  EMPTY_PRODUCT_FILTERS,
  ProductFilterForm,
  productFilterParams,
  readProductFilters,
  type ProductFacets,
  type ProductFilters,
} from "./productFilters"
import { formatMoneyBr, moneyWidthCh, parseMoneyBr, type PdvProduct } from "./types"
import { useVerCusto } from "../usuarios/useVerCusto"

const LOTE_FILTER_KEY = "pdv-lote-last-filter"

function maskLoteMoney(raw: string, previous: string) {
  let digits = raw.replace(/\D/g, "").slice(0, 12)
  const prevDigits = previous.replace(/\D/g, "")
  const deleting = raw.length < previous.length
  if (deleting && digits.replace(/0/g, "") === "" ) return ""
  if (deleting && (digits === prevDigits || formatMoneyBr(Number(digits || "0") / 100) === previous)) {
    digits = prevDigits.slice(0, -1)
  }
  if (!digits) return ""
  return formatMoneyBr(Number(digits) / 100)
}

function paintLoteMoney(event: ChangeEvent<HTMLInputElement>, previous: string, setValue: (next: string) => void) {
  const input = event.currentTarget
  const next = maskLoteMoney(event.target.value, previous)
  setValue(next)
  requestAnimationFrame(() => input.setSelectionRange(next.length, next.length))
}

function finishLoteMoney(raw: string) {
  if (!raw.trim()) return ""
  return formatMoneyBr(parseMoneyBr(raw))
}

type LoteAction = "sale" | "cost" | "qty" | "priceTable" | "category" | "ncm" | "gender" | "collection" | "brand"

type PriceTableOption = { id: string; name: string; slug?: string; isDefault: boolean }

function isLojasTable(table?: { id?: string; name?: string; slug?: string } | null) {
  if (!table) return false
  const slug = String(table.slug || "").toLowerCase()
  const name = String(table.name || "").toLowerCase()
  return slug === "lojas" || name === "lojas" || table.id === "00000000-0000-4000-8000-0000000000a2"
}

async function loadLojasPrices(products: PdvProduct[]) {
  const ids = products.map((row) => row.id).filter(Boolean)
  const map: Record<string, number> = {}
  let lojasId = ""
  for (let index = 0; index < ids.length; index += 180) {
    const chunk = ids.slice(index, index + 180)
    const { data } = await api.get("/clients/price-tables/grid", { params: { ids: chunk.join(",") } })
    if (!lojasId) {
      const found = ((data.tables || []) as PriceTableOption[]).find((table) => isLojasTable(table))
      lojasId = found?.id || ""
    }
    if (!lojasId) continue
    for (const item of (data.prices || []) as Array<{ productId: string; priceTableId: string; price: number }>) {
      if (item.priceTableId === lojasId) map[item.productId] = Number(item.price) || 0
    }
  }
  return map
}

function LotePick({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (next: string) => void
  options: { value: string; label: string }[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])
  const current = options.find((item) => item.value === value)
  return (
    <div className="pdv-lote-pick" ref={ref} data-open={open ? "true" : undefined}>
      <button type="button" className="pdv-lote-pick-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((item) => !item)}>
        <span>{current?.label || "Selecione"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <ul className="pdv-lote-pick-list" role="listbox" aria-label={label}>
          {options.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function filled(rows: PdvProduct[], key: keyof PdvProduct) {
  const set = new Set<string>()
  for (const row of rows) {
    const value = String(row[key] ?? "").trim()
    if (value) set.add(value)
  }
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export default function GerenciarLote() {
  const gestao = useLocation().pathname.startsWith("/gestao/")
  const podeCusto = useVerCusto()
  const verCusto = gestao || podeCusto
  const [draft, setDraft] = useState<ProductFilters>(EMPTY_PRODUCT_FILTERS)
  const [rows, setRows] = useState<PdvProduct[]>([])
  const [total, setTotal] = useState(0)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [categories, setCategories] = useState<FlatOption[]>([])
  const [facets, setFacets] = useState<ProductFacets>({ brands: [], collections: [], genders: [], suppliers: [] })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [saleValue, setSaleValue] = useState("")
  const [costValue, setCostValue] = useState("")
  const [qtyValue, setQtyValue] = useState("")
  const [tables, setTables] = useState<PriceTableOption[]>([])
  const [tableId, setTableId] = useState("")
  const [tableValue, setTableValue] = useState("")
  const [lojasPrices, setLojasPrices] = useState<Record<string, number>>({})
  const [categoryId, setCategoryId] = useState("")
  const [ncm, setNcm] = useState("")
  const [gender, setGender] = useState("")
  const [collection, setCollection] = useState("")
  const [brand, setBrand] = useState("")

  useEffect(() => {
    loadProductCategories()
      .then((items) => setCategories(toFlatOptions(items.filter((item) => item.active))))
      .catch(() => setCategories([]))
    api
      .get("/clients/products", { params: { page: "1", limit: "1", todos: "1", wide: "1" } })
      .then(({ data }) => {
        if (!data.facets) return
        setFacets({
          brands: data.facets.brands || [],
          collections: data.facets.collections || [],
          genders: data.facets.genders || [],
          suppliers: data.facets.suppliers || [],
        })
      })
      .catch(() => undefined)
    api
      .get("/clients/price-tables")
      .then(({ data }) => setTables((data.tables || []) as PriceTableOption[]))
      .catch(() => setTables([]))
  }, [])

  const selected = useMemo(() => rows.filter((row) => picked[row.id]), [rows, picked])
  const rowKey = rows.map((row) => row.id).join(",")

  useEffect(() => {
    if (!gestao || !rowKey) return
    let cancel = false
    loadLojasPrices(rows)
      .then((map) => {
        if (!cancel) setLojasPrices(map)
      })
      .catch(() => {
        if (!cancel) setLojasPrices({})
      })
    return () => {
      cancel = true
    }
    // Recarrega só quando a lista de produtos muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestao, rowKey])
  const allChecked = rows.length > 0 && rows.every((row) => picked[row.id])

  const groups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, PdvProduct[]>()
    for (const row of rows) {
      const name = row.category || "Sem categoria"
      if (!map.has(name)) {
        map.set(name, [])
        order.push(name)
      }
      map.get(name)!.push(row)
    }
    return order.map((name) => ({ name, rows: map.get(name)! }))
  }, [rows])

  const brands = facets.brands.length ? facets.brands : filled(rows, "brand")
  const collections = facets.collections.length ? facets.collections : filled(rows, "collection")
  const genders = facets.genders.length ? facets.genders : filled(rows, "gender")
  const suppliers = facets.suppliers.length ? facets.suppliers : filled(rows, "supplierName")

  async function runSearch(filters: ProductFilters) {
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const { data } = await api.get("/clients/products", {
        params: {
          ...productFilterParams(filters, 1, gestao ? "backoffice" : "loja", { order: "name" }),
          limit: 800,
          wide: "1",
        },
      })
      const products = (data.products || []) as PdvProduct[]
      setRows(products)
      setTotal(Number(data.total) || products.length)
      setPicked({})
      if (data.facets) {
        setFacets({
          brands: data.facets.brands || [],
          collections: data.facets.collections || [],
          genders: data.facets.genders || [],
          suppliers: data.facets.suppliers || [],
        })
      }
      setStatus(products.length ? "" : "Nenhum produto encontrado.")
    } catch (err) {
      setRows([])
      setTotal(0)
      setError(parseError(err).friend || "Não foi possível pesquisar.")
    } finally {
      setBusy(false)
    }
  }

  function onSearch(event: FormEvent) {
    event.preventDefault()
    sessionStorage.setItem(LOTE_FILTER_KEY, JSON.stringify(draft))
    void runSearch(draft)
  }

  function onClear() {
    setDraft(EMPTY_PRODUCT_FILTERS)
    setRows([])
    setTotal(0)
    setPicked({})
    setStatus("")
    setError("")
  }

  function onLastFilter() {
    const last = readProductFilters(LOTE_FILTER_KEY)
    setDraft(last)
    void runSearch(last)
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {}
    if (checked) rows.forEach((row) => { next[row.id] = true })
    setPicked(next)
  }

  async function apply(action: LoteAction) {
    if (!selected.length) {
      setError("Marque ao menos um produto.")
      return
    }
    const adjusting = action === "sale" || action === "cost"
    const raw = action === "cost" ? costValue : saleValue
    const value = Number(String(raw).replace(/\./g, "").replace(",", "."))
    const qty = Number(qtyValue)
    const tableRaw = tableValue
    const tablePrice = Number(String(tableRaw).replace(/\./g, "").replace(",", "."))
    const chosenTable = tables.find((item) => item.id === tableId)
    if (adjusting && (raw.trim() === "" || !Number.isFinite(value) || value < 0)) {
      setError("Informe o valor.")
      return
    }
    if (action === "qty" && (qtyValue.trim() === "" || !Number.isFinite(qty) || qty < 0)) {
      setError("Informe a quantidade.")
      return
    }
    if (action === "priceTable" && !chosenTable) {
      setError("Escolha a tabela de preço.")
      return
    }
    if (action === "priceTable" && (tableRaw.trim() === "" || !Number.isFinite(tablePrice) || tablePrice < 0)) {
      setError("Informe o valor.")
      return
    }
    const category = categories.find((item) => item.id === categoryId)
    if (action === "category" && !category) {
      setError("Escolha a categoria.")
      return
    }
    const label =
      action === "sale"
        ? "reajustar o preço de venda"
        : action === "cost"
          ? "reajustar o preço de custo"
          : action === "qty"
            ? "alterar a quantidade"
            : action === "priceTable"
              ? `gravar o preço na tabela ${chosenTable?.name || ""}`
          : action === "category"
          ? "alterar a categoria"
          : action === "ncm"
            ? "alterar o NCM"
            : action === "gender"
              ? "alterar o gênero"
              : action === "collection"
                ? "alterar a coleção"
                : "alterar a marca"
    if (!window.confirm(`Aplicar em ${selected.length} produto(s): ${label}?`)) return
    setBusy(true)
    setError("")
    try {
      const { data } = await api.post("/clients/products/lote", {
        ids: selected.map((row) => row.id),
        action,
        mode: "replace",
        percent: false,
        value: adjusting ? value : action === "qty" ? qty : action === "priceTable" ? tablePrice : undefined,
        priceTableId: action === "priceTable" ? tableId : undefined,
        saleScope: action === "sale" && gestao ? "backoffice" : undefined,
        qtyScope: action === "qty" && gestao ? "backoffice" : undefined,
        categoryId: category?.id,
        category: category?.label,
        text: action === "ncm" ? ncm : action === "gender" ? gender : action === "collection" ? collection : action === "brand" ? brand : undefined,
      })
      const ids = new Set(selected.map((row) => row.id))
      setRows((current) =>
        current.map((row) => {
          if (!ids.has(row.id)) return row
          if (action === "sale") return gestao ? { ...row, salePrice: value } : { ...row, lojaSalePrice: value }
          if (action === "cost") return { ...row, costPrice: value }
          if (action === "priceTable") return row
          if (action === "qty") return gestao ? { ...row, stockQuantity: qty } : { ...row, lojaStock: qty }
          if (action === "category") return { ...row, categoryId: category?.id || "", category: category?.label || "" }
          if (action === "ncm") return { ...row, ncm }
          if (action === "gender") return { ...row, gender }
          if (action === "collection") return { ...row, collection }
          return { ...row, brand }
        }),
      )
      if (action === "priceTable" && isLojasTable(chosenTable)) {
        setLojasPrices((current) => {
          const next = { ...current }
          selected.forEach((row) => {
            next[row.id] = tablePrice
          })
          return next
        })
      }
      setStatus(`${Number(data.updated) || selected.length} produto(s) atualizado(s).`)
      avisarSalvo("Alteração salva.")
    } catch (err) {
      setError(parseError(err).friend || "Não foi possível aplicar.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <CadastroFrame>
      <section className="pdv-cad-page pdv-lote-page" aria-labelledby="pdv-lote-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-lote-title">Gerenciar lote</h1>
          <div className="pdv-lote-filters">
            <ProductFilterForm
              draft={draft}
              onChange={setDraft}
              onSubmit={onSearch}
              onClear={onClear}
              onLastFilter={onLastFilter}
              categoryOptions={categories}
              showInStock={!gestao}
              showCatalog={false}
              brands={brands}
              collections={collections}
              genders={genders}
              suppliers={suppliers}
              busy={busy}
            />
          </div>

          {error ? <p className="pdv-prod-status" role="alert">{error}</p> : null}
          {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
          {total > rows.length ? (
            <p className="pdv-lote-note">Mostrando {rows.length} de {total}. Afine a pesquisa para ver o restante.</p>
          ) : null}

          <div className="pdv-cad-table-wrap">
            <table
              className="pdv-cad-table"
              style={{
                "--sale-ch": `${moneyWidthCh(rows.map((row) => (gestao ? row.salePrice : row.lojaSalePrice)))}ch`,
                "--cost-ch": `${moneyWidthCh(rows.map((row) => row.costPrice))}ch`,
                "--lojas-ch": `${moneyWidthCh(rows.map((row) => lojasPrices[row.id] || 0))}ch`,
              } as CSSProperties}
            >
              <thead>
                <tr>
                  {gestao ? (
                    <th className="pdv-lote-mid">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        aria-label="Marcar todos"
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                  ) : null}
                  <th>Código</th>
                  {gestao ? <th>Categoria</th> : <th>Nome</th>}
                  {gestao ? <th>Nome</th> : <th>Categoria</th>}
                  <th className="pdv-lote-price pdv-lote-sale"><span className="pdv-lote-price-title">Preço de venda</span></th>
                  {gestao ? <th className="pdv-lote-price pdv-lote-lojas"><span className="pdv-lote-price-title">Tabela lojas</span></th> : null}
                  {verCusto ? <th className="pdv-lote-price pdv-lote-cost"><span className="pdv-lote-price-title">Preço de custo</span></th> : null}
                  <th className="pdv-lote-mid">Qtd</th>
                  {gestao ? null : (
                    <th className="pdv-lote-mid">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        aria-label="Marcar todos"
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.name}>
                    <tr className="pdv-lote-group">
                      <td colSpan={gestao ? 8 : 7} aria-hidden="true" />
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.id}>
                        {gestao ? (
                          <td className="pdv-lote-mid">
                            <input
                              type="checkbox"
                              checked={Boolean(picked[row.id])}
                              aria-label={`Marcar ${row.name}`}
                              onChange={(event) => setPicked((current) => ({ ...current, [row.id]: event.target.checked }))}
                            />
                          </td>
                        ) : null}
                        <td>{row.code}</td>
                        {gestao ? <td>{row.category || "—"}</td> : <td>{row.name}</td>}
                        {gestao ? <td>{row.name}</td> : <td>{row.category || "—"}</td>}
                        <td className="pdv-lote-price pdv-lote-sale">
                          <span className="pdv-lote-price-line">
                            <span className="pdv-lote-rs">R$</span>
                            <span>{formatMoneyBr(Number(gestao ? row.salePrice : row.lojaSalePrice) || 0)}</span>
                          </span>
                        </td>
                        {gestao ? (
                          <td className="pdv-lote-price pdv-lote-lojas">
                            <span className="pdv-lote-price-line">
                              <span className="pdv-lote-rs">R$</span>
                              <span>{formatMoneyBr(Number(lojasPrices[row.id]) || 0)}</span>
                            </span>
                          </td>
                        ) : null}
                        {verCusto ? (
                          <td className="pdv-lote-price pdv-lote-cost">
                            <span className="pdv-lote-price-line">
                              <span className="pdv-lote-rs">R$</span>
                              <span>{formatMoneyBr(Number(row.costPrice) || 0)}</span>
                            </span>
                          </td>
                        ) : null}
                        <td className="pdv-lote-mid">{Number(gestao ? row.stockQuantity : row.lojaStock) || 0}</td>
                        {gestao ? null : (
                          <td className="pdv-lote-mid">
                            <input
                              type="checkbox"
                              checked={Boolean(picked[row.id])}
                              aria-label={`Marcar ${row.name}`}
                              onChange={(event) => setPicked((current) => ({ ...current, [row.id]: event.target.checked }))}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length ? (
            <div className="pdv-lote-actions">
              <p className="pdv-lote-picked">{selected.length} selecionado(s)</p>
              <article>
                <h2>Reajuste do preço de venda</h2>
                <label>
                  Valor
                  <span className="pdv-lote-money">
                    <span>R$</span>
                    <input
                      value={saleValue}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      onChange={(event) => paintLoteMoney(event, saleValue, setSaleValue)}
                      onBlur={() => setSaleValue((current) => finishLoteMoney(current))}
                    />
                  </span>
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("sale")}>Aplicar</button>
              </article>
              {verCusto ? <article>
                <h2>Reajuste do preço de custo</h2>
                <label>
                  Valor
                  <span className="pdv-lote-money">
                    <span>R$</span>
                    <input
                      value={costValue}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      onChange={(event) => paintLoteMoney(event, costValue, setCostValue)}
                      onBlur={() => setCostValue((current) => finishLoteMoney(current))}
                    />
                  </span>
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("cost")}>Aplicar</button>
              </article> : null}
              <article>
                <h2>Alterar quantidade</h2>
                <label>
                  Quantidade
                  <input
                    value={qtyValue}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    onChange={(event) => setQtyValue(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("qty")}>Aplicar</button>
              </article>
              <article>
                <h2>Tabela de preço</h2>
                <label>
                  Tabela
                  <LotePick
                    label="Tabela de preço"
                    value={tableId}
                    onChange={setTableId}
                    options={[{ value: "", label: "Selecione" }, ...tables.map((item) => ({ value: item.id, label: item.name }))]}
                  />
                </label>
                <label>
                  Valor
                  <span className="pdv-lote-money">
                    <span>R$</span>
                    <input
                      value={tableValue}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      onChange={(event) => paintLoteMoney(event, tableValue, setTableValue)}
                      onBlur={() => setTableValue((current) => finishLoteMoney(current))}
                    />
                  </span>
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("priceTable")}>Aplicar</button>
              </article>
              <article>
                <h2>Alterar categoria</h2>
                <label>
                  Categoria
                  <LotePick
                    label="Categoria do lote"
                    value={categoryId}
                    onChange={setCategoryId}
                    options={[{ value: "", label: "Selecione" }, ...categories.map((item) => ({ value: item.id, label: item.label }))]}
                  />
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("category")}>Aplicar</button>
              </article>
              <article>
                <h2>Alterar NCM</h2>
                <label>
                  NCM
                  <input value={ncm} autoComplete="off" onChange={(event) => setNcm(event.target.value)} />
                </label>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("ncm")}>Aplicar</button>
              </article>
              <article>
                <h2>Alterar gênero</h2>
                <label>
                  Gênero
                  <input value={gender} list="pdv-lote-generos" autoComplete="off" onChange={(event) => setGender(event.target.value)} />
                </label>
                <datalist id="pdv-lote-generos">
                  {facets.genders.map((item) => <option key={item} value={item} />)}
                </datalist>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("gender")}>Aplicar</button>
              </article>
              <article>
                <h2>Alterar coleção</h2>
                <label>
                  Coleção
                  <input value={collection} list="pdv-lote-colecoes" autoComplete="off" onChange={(event) => setCollection(event.target.value)} />
                </label>
                <datalist id="pdv-lote-colecoes">
                  {facets.collections.map((item) => <option key={item} value={item} />)}
                </datalist>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("collection")}>Aplicar</button>
              </article>
              <article>
                <h2>Alterar marca</h2>
                <label>
                  Marca
                  <input value={brand} list="pdv-lote-marcas" autoComplete="off" onChange={(event) => setBrand(event.target.value)} />
                </label>
                <datalist id="pdv-lote-marcas">
                  {facets.brands.map((item) => <option key={item} value={item} />)}
                </datalist>
                <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => apply("brand")}>Aplicar</button>
              </article>
            </div>
          ) : null}
        </div>
      </section>
    </CadastroFrame>
  )
}
