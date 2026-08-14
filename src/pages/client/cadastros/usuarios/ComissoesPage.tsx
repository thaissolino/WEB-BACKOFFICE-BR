import { useEffect, useState } from "react"
import CadastroShell from "../CadastroShell"
import { createCatalog, listCatalog, type CatalogItem } from "../catalog/catalogApi"

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]

export default function ComissoesPage() {
  const year = new Date().getFullYear()
  const [users, setUsers] = useState<CatalogItem[]>([])
  const [status, setStatus] = useState("")

  useEffect(() => {
    listCatalog("user", true).then(setUsers).catch(() => setUsers([]))
  }, [])

  async function addUser() {
    const name = window.prompt("Usuário")
    if (!name?.trim()) return
    try {
      await createCatalog("commission", { name: name.trim(), payload: { year, valores: {} } })
      setStatus("Usuário adicionado à comissão.")
      listCatalog("user", true).then(setUsers).catch(() => setUsers([]))
    } catch {
      setStatus("Não foi possível adicionar.")
    }
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-com-title">
        <div className="pdv-cad-sheet pdv-cad-sheet-wide">
          <h1 id="pdv-com-title">GERENCIADOR DE COMISSÃO</h1>
          <div className="pdv-cad-actions">
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Gerenciar Metas de Funcionários</button>
            <button className="pdv-cad-btn pdv-cad-btn-blue" type="button">Gerenciar Metas de Lojas</button>
            <button className="pdv-cad-btn pdv-cad-btn-green" type="button" onClick={addUser}>+ Novo Usuário</button>
          </div>
          <div className="pdv-cad-table-wrap">
            <table className="pdv-cad-table">
              <thead>
                <tr>
                  <th>ANOS</th>
                  {MONTHS.map((month) => (
                    <th key={month} colSpan={2}>{month}</th>
                  ))}
                  <th>TOTAL</th>
                </tr>
                <tr>
                  <th>{year}</th>
                  {MONTHS.flatMap((month) => [
                    <th key={`${month}-r`}>R$</th>,
                    <th key={`${month}-p`}>%</th>,
                  ])}
                  <th>R$</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={26}>Nenhum usuário com comissão.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.code}>
                      <td>{user.name}</td>
                      {MONTHS.map((month) => (
                        <td key={`${user.code}-${month}-r`} colSpan={2}>—</td>
                      ))}
                      <td>—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {status ? <p className="pdv-prod-status" role="status">{status}</p> : null}
        </div>
      </section>
    </CadastroShell>
  )
}
