import { FormEvent, useEffect, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useClientAuth } from "../../hooks/clientAuth"
import PdvShell, { PdvLoading, usePdvSession } from "./dashboard/PdvShell"
import { CAIXA_STORAGE_KEY, NENHUM_CAIXA } from "./dashboard/mockData"
import { api } from "../../services/api"
import { formatMoneyRs, type PdvProduct } from "./cadastros/produtos/types"
import { listCatalog, type CatalogItem } from "./cadastros/catalog/catalogApi"
import "./cadastros/cadastros.css"

function readStoredCaixa() {
  if (typeof sessionStorage === "undefined") return NENHUM_CAIXA
  return sessionStorage.getItem(CAIXA_STORAGE_KEY) || NENHUM_CAIXA
}

type CartLine = {
  id: string
  code: string
  name: string
  qty: number
  price: number
}

function PdvBoard() {
  const navigate = useNavigate()
  const { storeName } = usePdvSession()
  const caixa = readStoredCaixa()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<PdvProduct[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [payments, setPayments] = useState<CatalogItem[]>([])
  const [pay, setPay] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    listCatalog("payment", true)
      .then((items) => {
        setPayments(items)
        setPay((current) => current || items[0]?.name || "")
      })
      .catch(() => setPayments([]))
  }, [])

  const total = cart.reduce((sum, line) => sum + line.qty * line.price, 0)

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      setHits([])
      return
    }
    api
      .get("/clients/products", { params: { search: q, ativo: "1" } })
      .then(({ data }) => {
        const products = (data.products as PdvProduct[]) ?? []
        setHits(products.slice(0, 8))
        setStatus(products.length ? "" : "Nenhum produto encontrado.")
      })
      .catch(() => setStatus("Não foi possível pesquisar produtos."))
  }

  function addProduct(product: PdvProduct) {
    setCart((current) => {
      const found = current.find((line) => line.id === product.id)
      if (found) {
        return current.map((line) => (line.id === product.id ? { ...line, qty: line.qty + 1 } : line))
      }
      return [
        ...current,
        {
          id: product.id,
          code: product.code || product.barcode,
          name: product.name,
          qty: 1,
          price: product.salePrice || 0,
        },
      ]
    })
    setQuery("")
    setHits([])
    setStatus("")
  }

  function finish() {
    if (cart.length === 0) {
      setStatus("Inclua um produto.")
      return
    }
    setCart([])
    setStatus("Venda registrada no PDV. Emissão fiscal permanece fora desta tela.")
  }

  return (
    <section className="pdv-cad-page" aria-labelledby="pdv-sale-title">
      <div className="pdv-cad-sheet pdv-cad-sheet-wide">
        <div className="pdv-cad-head">
          <h1 id="pdv-sale-title">PDV</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate("/client/caixa")}>
            Voltar
          </button>
        </div>
        <ul className="pdv-facts">
          <li>
            <span>Loja</span>
            <strong>{storeName}</strong>
          </li>
          <li>
            <span>Caixa</span>
            <strong>{caixa}</strong>
          </li>
        </ul>
        <form className="pdv-cad-filters" onSubmit={onSearch}>
          <label>
            Produto / Código de barras
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
          <div className="pdv-cad-filters-go">
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="submit">
              Buscar
            </button>
          </div>
        </form>
        {hits.length > 0 ? (
          <ul className="pdv-sale-hits">
            {hits.map((product) => (
              <li key={product.id}>
                <button className="pdv-cfg-item" type="button" onClick={() => addProduct(product)}>
                  {product.code} — {product.name} — {formatMoneyRs(product.salePrice || 0)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="pdv-cad-table-wrap">
          <table className="pdv-cad-table">
            <thead>
              <tr>
                <th>Cod</th>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Valor</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.id}>
                  <td>{line.code}</td>
                  <td>{line.name}</td>
                  <td>{line.qty}</td>
                  <td>{formatMoneyRs(line.price)}</td>
                  <td>{formatMoneyRs(line.qty * line.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pdv-sale-total">
          Total <strong>{formatMoneyRs(total)}</strong>
        </p>
        <div className="pdv-cad-form-row">
          <span className="pdv-cad-form-label">Forma de Pagamento</span>
          <select value={pay} onChange={(event) => setPay(event.target.value)}>
            {payments.map((item) => (
              <option key={item.code}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="pdv-cad-actions">
          <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={finish}>
            Finalizar
          </button>
        </div>
        {status ? (
          <p className="pdv-prod-status" role="status">
            {status}
          </p>
        ) : null}
      </div>
      <p className="pdv-caixa-foot">
        Caixa: <strong>{caixa}</strong>
      </p>
    </section>
  )
}

export default function ClientPdv() {
  const { client, loadingClient } = useClientAuth()

  if (loadingClient) return <PdvLoading />
  if (!client) return <Navigate to="/signin/lojista" replace />

  return (
    <PdvShell variant="form">
      <PdvBoard />
    </PdvShell>
  )
}
