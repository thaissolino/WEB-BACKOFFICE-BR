import { useState } from "react"
import { Settings } from "lucide-react"
import CatalogList, { type CatalogColumn, type CatalogListConfig } from "./catalog/CatalogList"
import { type CatalogItem } from "./catalog/catalogApi"
import { api, parseError } from "../../../services/api"
import { useNavigate } from "react-router-dom"

function GroupEventos({ item }: { item: CatalogItem }) {
  const navigate = useNavigate()
  return (
    <button
      className="pdv-cad-icon-btn"
      type="button"
      aria-label={`Eventos de ${item.name}`}
      title="Eventos do grupo"
      onClick={() => navigate(`/client/usuarios/grupos/eventos?id=${item.code}`)}
    >
      <Settings size={16} aria-hidden="true" />
    </button>
  )
}

function SendPassword({ item }: { item: CatalogItem }) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    setNote("")
    try {
      await api.post(`/clients/catalog/user/${item.code}/senha`)
      setNote("Senha enviada para o e-mail cadastrado.")
    } catch (err) {
      setNote(parseError(err).friend || "Não foi possível enviar a senha.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="pdv-cad-btn" type="button" disabled={busy} onClick={() => void send()}>
        {busy ? "Enviando…" : "Enviar senha"}
      </button>
      {note ? <span className="pdv-sr">{note}</span> : null}
    </>
  )
}

function userCell(item: CatalogItem, column: CatalogColumn) {
  if (column.key !== "senha") return undefined
  return <SendPassword item={item} />
}

function groupCell(item: CatalogItem, column: CatalogColumn) {
  if (column.key !== "eventos") return undefined
  return <GroupEventos item={item} />
}

function VincularBtn() {
  const navigate = useNavigate()
  return (
    <button className="pdv-cad-btn pdv-cad-btn-blue" type="button" onClick={() => navigate("/client/usuarios/representantes/identificadores/vincular")}>
      Vincular a Representante
    </button>
  )
}

export const USER_LIST: CatalogListConfig = {
  kind: "user",
  title: "USUÁRIOS",
  cadastrarLabel: "Cadastrar Usuário",
  cadastrarPath: "/client/usuarios/cadastrar",
  inativosLabel: "Usuários Inativos",
  ativosLabel: "Usuários Ativos",
  inativosPath: "/client/usuarios/inativos",
  listPath: "/client/usuarios",
  filters: [
    { key: "code", label: "Cod. Usuário", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "grupo", label: "Grupo", from: "payload", payloadKey: "grupo" },
  ],
  columns: [
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "usuario", label: "Usuario", payloadKey: "usuario" },
    { key: "telefone", label: "Telefone", payloadKey: "telefone" },
    { key: "grupo", label: "Grupo", payloadKey: "grupo" },
    { key: "createdAt", label: "Data de Cadastro", from: "createdAt" },
    { key: "replicar", label: "Replicar Acesso" },
    { key: "senha", label: "Trocar Senha" },
    { key: "atividade", label: "Atividade" },
    { key: "atualizar", label: "Atualizar", from: "action" },
    { key: "inativar", label: "Inativar", from: "active" },
  ],
}

export const GROUP_LIST: CatalogListConfig = {
  kind: "group",
  title: "GRUPOS",
  cadastrarLabel: "Cadastrar Grupos",
  cadastrarPath: "/client/usuarios/grupos/cadastrar",
  listPath: "/client/usuarios/grupos",
  columns: [
    { key: "eventos", label: "Eventos" },
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome Grupo", from: "name" },
    { key: "nivel", label: "Nível", payloadKey: "nivel" },
    { key: "ativo", label: "Ativo", from: "active" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export const REP_LIST: CatalogListConfig = {
  kind: "representative",
  title: "REPRESENTANTES",
  cadastrarLabel: "Cadastrar Representante",
  cadastrarPath: "/client/usuarios/representantes/cadastrar",
  inativosLabel: "Representantes Inativos",
  ativosLabel: "Representantes Ativos",
  inativosPath: "/client/usuarios/representantes/inativos",
  listPath: "/client/usuarios/representantes",
  filters: [{ key: "nome", label: "Nome", from: "name" }],
  columns: [
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "telefone", label: "Telefone", payloadKey: "telefone" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export const ID_LIST: CatalogListConfig = {
  kind: "identifier",
  title: "IDENTIFICADORES",
  cadastrarLabel: "Cadastrar Identificador",
  cadastrarPath: "/client/usuarios/representantes/identificadores/cadastrar",
  inativosLabel: "Identificadores Inativos",
  ativosLabel: "Identificadores Ativos",
  inativosPath: "/client/usuarios/representantes/identificadores/inativos",
  listPath: "/client/usuarios/representantes/identificadores",
  extraActions: <VincularBtn />,
  filters: [
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "telefone", label: "Telefone", from: "payload", payloadKey: "telefone" },
    { key: "email", label: "E-mail", from: "payload", payloadKey: "email" },
  ],
  columns: [
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "telefone", label: "Telefone", payloadKey: "telefone" },
    { key: "email", label: "E-mail", payloadKey: "email" },
    { key: "representante", label: "Representante", payloadKey: "representante" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export const PAY_LIST: CatalogListConfig = {
  kind: "payment",
  title: "FORMA DE PAGAMENTO ATIVO",
  cadastrarLabel: "Cadastrar Forma de Pagamento",
  cadastrarPath: "/client/financeiro/formas-pagamento/cadastrar",
  inativosLabel: "Forma de Pagamento Inativo",
  ativosLabel: "Forma de Pagamento Ativo",
  inativosPath: "/client/financeiro/formas-pagamento/inativos",
  listPath: "/client/financeiro/formas-pagamento",
  bulkDelete: true,
  bulkDisable: true,
  columns: [
    { key: "code", label: "Cod.", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "ativoVenda", label: "Ativo Venda", payloadKey: "vendaAtivo" },
    { key: "ativoCompra", label: "Ativo Compra", payloadKey: "compraAtivo" },
    { key: "financeiroNegativo", label: "Financeiro Negativo", payloadKey: "financeiroNegativo" },
    { key: "ordem", label: "Ordem", payloadKey: "ordem" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export const PLAN_LIST: CatalogListConfig = {
  kind: "account_plan",
  title: "CENTRO DE CUSTO",
  cadastrarLabel: "Cadastrar Centro de Custo",
  cadastrarPath: "/client/financeiro/plano-conta/cadastrar",
  inativosLabel: "Centro de Custo Inativos",
  ativosLabel: "Centro de Custo Ativos",
  inativosPath: "/client/financeiro/plano-conta/inativos",
  listPath: "/client/financeiro/plano-conta",
  filters: [
    { key: "code", label: "Cod. Centro de Custo", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
  ],
  columns: [
    { key: "code", label: "Código", from: "code" },
    { key: "nome", label: "Nome", from: "name" },
    { key: "ordem", label: "Ordem", payloadKey: "ordem" },
    { key: "atualizar", label: "Atualizar", from: "action" },
  ],
}

export function UsersList({ inactive = false }: { inactive?: boolean }) {
  return <CatalogList config={{ ...USER_LIST, renderCell: userCell }} inactive={inactive} />
}
export function GroupsList() {
  return <CatalogList config={{ ...GROUP_LIST, renderCell: groupCell }} />
}
export function RepsList({ inactive = false }: { inactive?: boolean }) {
  return <CatalogList config={REP_LIST} inactive={inactive} />
}
export function IdsList({ inactive = false }: { inactive?: boolean }) {
  return <CatalogList config={ID_LIST} inactive={inactive} />
}
export function PayList({ inactive = false }: { inactive?: boolean }) {
  return <CatalogList config={{ ...PAY_LIST, title: inactive ? "FORMA DE PAGAMENTO INATIVO" : PAY_LIST.title }} inactive={inactive} />
}
export function PlanList({ inactive = false }: { inactive?: boolean }) {
  return <CatalogList config={{ ...PLAN_LIST, title: inactive ? "CENTRO DE CUSTO INATIVOS" : PLAN_LIST.title }} inactive={inactive} />
}
