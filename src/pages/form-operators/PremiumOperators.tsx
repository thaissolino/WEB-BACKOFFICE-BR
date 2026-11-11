import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, Check, Eye, EyeOff } from "lucide-react";
import { api } from "../../services/api";
import { buscarOperadores, guardarOperadores, lerOperadores } from "./operadoresCache";
import "./operators.css";

type Operator = {
  id: string;
  name: string;
  email: string;
  password: string;
  accessPassword: string;
  role: "OPERATOR" | "ADMIN" | "MASTER";
  status: "active" | "inactive" | "pending";
  lastAccess: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Record<string, any>;
};

type SubPermission = { id: string; label: string; type?: "boolean"; options?: string[] };
type Permission = { id: string; name: string; description: string; category: string; bucket?: "invoices"; kind?: "list"; subPermissions?: SubPermission[] };

const CATEGORY_ORDER = ["Cadastro", "Compras", "Movimentações", "Caixas", "Relatórios", "Equipe"];

const defaultPermissions = {
  CRIAR_USUARIO: { enabled: false },
  GERENCIAR_GRUPOS: { enabled: false },
  GERENCIAR_USUARIOS: { enabled: false },
  GERENCIAR_OPERADORES: { enabled: false },
  GERENCIAR_PLANILHAS: { enabled: false },
  GERENCIAR_INVOICES: {
    enabled: false, INVOICES: false, PRODUTOS: false, FORNECEDORES: false, FRETEIROS: false, OUTROS: false, LOJISTAS: false, TABELA_PRECO: false,
    MEDIA_DOLAR: false, RELATORIOS: false, MELHORES_PRECOS: false, LISTAS_COMPRAS: false, PERDIDOS: false, BUSCAR_IMEI: false, ETIQUETAS: false,
    PLANO_CONTAS: false, DESPESAS: false, RELATORIO_DRE: false, RELATORIO_ITENS: false, RELATORIO_AUDITORIA: false, RELATORIO_ESTOQUE: false, RELATORIO_IMEI: false,
    CAIXAS: [], CAIXAS_BR: [], CAIXAS_PERMITIDOS: [], CAIXAS_BR_PERMITIDOS: [],
  },
  GERENCIAR_TOKENS: { enabled: false, FORNECEDORES: [], RECOLHEDORES: [], OPERAÇÕES: false, LUCROS: false, LUCROS_RECOLHEDORES: false },
  GERENCIAR_BOLETOS: { enabled: false },
  GERENCIAR_OPERACOES: { enabled: false },
  VENDAS_CONCLUIDAS: { enabled: false },
  ALTERAR_SENHA: { enabled: false },
};

const emptyForm = {
  id: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  accessPassword: "",
  status: "active" as "active" | "inactive" | "pending",
};

function statusLabel(status: string) {
  if (status === "active") return "Ativo";
  if (status === "inactive") return "Inativo";
  if (status === "pending") return "Pendente";
  return status;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "OP";
}

const ABERTOS_ANTIGOS = ["MELHORES_PRECOS", "LISTAS_COMPRAS", "PERDIDOS", "BUSCAR_IMEI", "TABELA_PRECO", "PLANO_CONTAS", "DESPESAS", "RELATORIO_DRE", "RELATORIO_ITENS", "RELATORIO_AUDITORIA", "RELATORIO_ESTOQUE", "RELATORIO_IMEI", "ETIQUETAS"];

function normalizarPermissoes(saved?: Record<string, any>) {
  const base = structuredClone(defaultPermissions);
  const atual = saved || {};
  const invoices = { ...base.GERENCIAR_INVOICES, ...(atual.GERENCIAR_INVOICES || {}) };
  if (atual.GERENCIAR_INVOICES?.enabled && typeof atual.GERENCIAR_INVOICES?.MELHORES_PRECOS !== "boolean") {
    ABERTOS_ANTIGOS.forEach((chave) => { invoices[chave] = true; });
  }
  return {
    ...base,
    ...atual,
    GERENCIAR_INVOICES: invoices,
    GERENCIAR_PLANILHAS: atual.GERENCIAR_PLANILHAS || { enabled: false },
    GERENCIAR_BOLETOS: atual.GERENCIAR_BOLETOS || { enabled: false },
    GERENCIAR_OPERACOES: atual.GERENCIAR_OPERACOES || { enabled: false },
    VENDAS_CONCLUIDAS: atual.VENDAS_CONCLUIDAS || { enabled: false },
    ALTERAR_SENHA: atual.ALTERAR_SENHA || { enabled: false },
  };
}

function permissoesParaSalvar(perms: Record<string, any>) {
  const invoices = { ...(perms.GERENCIAR_INVOICES || {}) };
  const algum = Object.entries(invoices).some(([chave, valor]) => chave !== "enabled" && chave !== "CAIXAS" && chave !== "CAIXAS_BR" && (valor === true || (Array.isArray(valor) && valor.length > 0)));
  invoices.enabled = algum;
  return { ...perms, GERENCIAR_INVOICES: invoices };
}

function errorText(error: unknown, fallback: string) {
  const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function PremiumOperators() {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [recolhedores, setRecolhedores] = useState<string[]>([]);
  const [caixa, setCaixa] = useState<string[]>([]);
  const [caixaBR, setCaixaBR] = useState<string[]>([]);
  const equipeInicial = lerOperadores() as Operator[];
  const [operators, setOperators] = useState<Operator[]>(equipeInicial);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, any>>(structuredClone(defaultPermissions));
  const [searchTerm, setSearchTerm] = useState("");
  const [listQuery, setListQuery] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(equipeInicial.length === 0);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState("");
  const [toast, setToast] = useState({ open: false, message: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  const availablePermissions: Permission[] = [
    { id: "LOJISTAS", name: "Lojistas", description: "Cadastro de lojistas", category: "Cadastro", bucket: "invoices" },
    { id: "FORNECEDORES", name: "Fornecedores", description: "Cadastro de fornecedores", category: "Cadastro", bucket: "invoices" },
    { id: "PRODUTOS", name: "Produtos", description: "Listar, lote e categorias", category: "Cadastro", bucket: "invoices" },
    { id: "GERENCIAR_OPERADORES", name: "Operadores", description: "Esta tela e as permissões", category: "Cadastro" },
    { id: "FRETEIROS", name: "Freteiros", description: "Cadastro de freteiros", category: "Cadastro", bucket: "invoices" },
    { id: "OUTROS", name: "Outros", description: "Cadastro de outros parceiros", category: "Cadastro", bucket: "invoices" },
    { id: "TABELA_PRECO", name: "Tabela de preços", description: "Tabelas de preço do cadastro", category: "Cadastro", bucket: "invoices" },
    { id: "INVOICES", name: "Invoices", description: "Compras e invoices", category: "Compras", bucket: "invoices" },
    { id: "MEDIA_DOLAR", name: "Média dólar", description: "Média do dólar nas compras", category: "Compras", bucket: "invoices" },
    { id: "RELATORIOS", name: "Relatórios da compra", description: "Relatórios dentro de compras", category: "Compras", bucket: "invoices" },
    { id: "MELHORES_PRECOS", name: "Melhores preços", description: "Preços SP e Paraguai", category: "Compras", bucket: "invoices" },
    { id: "LISTAS_COMPRAS", name: "Listas de compras", description: "Listas do fornecedor", category: "Compras", bucket: "invoices" },
    { id: "PERDIDOS", name: "Perdidos", description: "Produtos perdidos", category: "Compras", bucket: "invoices" },
    { id: "BUSCAR_IMEI", name: "Buscar IMEI", description: "Busca de IMEI", category: "Compras", bucket: "invoices" },
    { id: "ETIQUETAS", name: "Etiquetas da entrada", description: "Impressão da etiqueta de entrada", category: "Compras", bucket: "invoices" },
    { id: "VENDAS_CONCLUIDAS", name: "Vendas concluídas", description: "Vendas concluídas e etiqueta da venda", category: "Movimentações" },
    { id: "PLANO_CONTAS", name: "Plano de contas", description: "Financeiro, plano de contas", category: "Movimentações", bucket: "invoices" },
    { id: "DESPESAS", name: "Despesas e receitas", description: "Listar e cadastrar despesas e receitas", category: "Movimentações", bucket: "invoices" },
    { id: "CAIXAS_PERMITIDOS", name: "Caixas", description: "Quais caixas esta pessoa abre", category: "Caixas", bucket: "invoices", kind: "list", subPermissions: [{ id: "CAIXAS_PERMITIDOS", label: "Caixas", options: caixa }] },
    { id: "CAIXAS_BR_PERMITIDOS", name: "Caixas BR", description: "Quais caixas BR esta pessoa abre", category: "Caixas", bucket: "invoices", kind: "list", subPermissions: [{ id: "CAIXAS_BR_PERMITIDOS", label: "Caixas BR", options: caixaBR }] },
    { id: "RELATORIO_DRE", name: "DRE gerencial", description: "Relatório DRE", category: "Relatórios", bucket: "invoices" },
    { id: "RELATORIO_ITENS", name: "Itens das vendas", description: "Relatório de itens das vendas", category: "Relatórios", bucket: "invoices" },
    { id: "RELATORIO_AUDITORIA", name: "Auditoria estoque", description: "Auditoria de estoque", category: "Relatórios", bucket: "invoices" },
    { id: "RELATORIO_ESTOQUE", name: "Estoque", description: "Relatório de estoque", category: "Relatórios", bucket: "invoices" },
    { id: "RELATORIO_IMEI", name: "Buscar IMEI", description: "Movimentação do IMEI no estoque", category: "Relatórios", bucket: "invoices" },
    { id: "CRIAR_USUARIO", name: "Criar usuário", description: "Cadastro antigo de usuário", category: "Equipe" },
    { id: "GERENCIAR_GRUPOS", name: "Gerenciar grupos", description: "Grupos da mensageria", category: "Equipe" },
    { id: "GERENCIAR_USUARIOS", name: "Gerenciar usuários", description: "Usuários da mensageria", category: "Equipe" },
    { id: "ALTERAR_SENHA", name: "Alterar a própria senha", description: "A pessoa troca a senha dela dentro do painel", category: "Equipe" },
    {
      id: "GERENCIAR_TOKENS", name: "Gerenciar tokens", description: "Tokens, fornecedores e lucros", category: "Equipe",
      subPermissions: [
        { id: "FORNECEDORES_PERMITIDOS", label: "Fornecedores", options: fornecedores },
        { id: "RECOLHEDORES_PERMITIDOS", label: "Recolhedores", options: recolhedores },
        { id: "OPERAÇÕES", label: "Operações", type: "boolean" },
        { id: "LUCROS", label: "Lucros", type: "boolean" },
        { id: "LUCROS_RECOLHEDORES", label: "Lucros dos recolhedores", type: "boolean" },
      ],
    },
  ];

  async function loadOperatorsFromDB() {
    const jaTem = lerOperadores().length > 0
    if (!jaTem) setLoading(true)
    const lista = buscarOperadores()
    const apoios = Promise.all([
      api.get("/suppliers/list_suppliers"),
      api.get("/collectors/list_collectors"),
      api.get("/invoice/carriers"),
      api.get("/invoice/supplier"),
      api.get("/invoice/partner"),
    ]).then(([suppliers, collectors, caixa1, caixa2, caixaBrRes]) => {
      setFornecedores(suppliers.data.map((item: { name: string }) => item.name));
      setRecolhedores(collectors.data.map((item: { name: string }) => item.name));
      setCaixa([...caixa1.data.map((item: { name: string }) => item.name), ...caixa2.data.map((item: { name: string }) => item.name)]);
      setCaixaBR(caixaBrRes.data.brl.map((item: { name: string }) => item.name));
    }).catch(() => undefined)
    try {
      const rows = await lista
      setOperators(rows as Operator[])
      return rows as Operator[]
    } catch {
      if (!jaTem) setOperators([])
      return [] as Operator[]
    } finally {
      setLoading(false)
      void apoios
    }
  }

  useEffect(() => {
    loadOperatorsFromDB();
  }, []);

  useEffect(() => {
    if (!avisoSenha) return;
    const timer = window.setTimeout(() => setAvisoSenha(""), 4000);
    return () => window.clearTimeout(timer);
  }, [avisoSenha]);

  useEffect(() => {
    if (!toast.open) return;
    const timer = window.setTimeout(() => setToast({ open: false, message: "" }), 4000);
    return () => window.clearTimeout(timer);
  }, [toast.open, toast.message]);

  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  function loadOperator(operator: Operator) {
    setFichaAberta(true);
    setGruposAbertos({});
    setCurrentOperator(operator);
    setShowPassword(false);
    setAvisoSenha("");
    setFormData({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      password: "",
      confirmPassword: "",
      accessPassword: "",
      status: operator.status.toLocaleLowerCase() as "active" | "inactive" | "pending",
    });
    setSelectedPermissions(normalizarPermissoes(operator.permissions));
  }

  function newOperator() {
    setFichaAberta(true);
    setGruposAbertos({});
    setCurrentOperator(null);
    setShowPassword(false);
    setAvisoSenha("");
    setFormData({ ...emptyForm });
    setSelectedPermissions(structuredClone(defaultPermissions));
  }

  async function saveOperator() {
    const { name, email, password, confirmPassword, status, accessPassword } = formData;
    const isNew = !formData.id;
    if (!name || !email) { setToast({ open: true, message: "Preencha nome e e-mail." }); return; }
    if (isNew && !password) { setToast({ open: true, message: "Informe uma senha para o operador novo." }); return; }
    if (password && password !== confirmPassword) { setToast({ open: true, message: "As senhas não coincidem." }); return; }
    setSaving(true);
    let responseEmailSent = false;
    try {
      if (isNew) {
        const createdResponse = await api.post("/users_operators", {
          id: "", name, email, status, lastAccess: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          permissions: permissoesParaSalvar(JSON.parse(JSON.stringify(selectedPermissions))),
          ...(password ? { password } : {}),
          ...(accessPassword ? { accessPassword } : {}),
        });
        responseEmailSent = createdResponse.data?.emailSent === true;
      } else {
        const operatorIndex = operators.findIndex((op) => op.id.toString() === formData.id);
        if (operatorIndex === -1) throw new Error("Operador não encontrado");
        const updatedResponse = await api.patch(`/users_operators/${operators[operatorIndex].id}`, {
          id: operators[operatorIndex].id, name, email, status, lastAccess: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          permissions: permissoesParaSalvar(JSON.parse(JSON.stringify(selectedPermissions))),
          ...(password ? { password } : {}), ...(accessPassword ? { accessPassword } : {}),
        });
        responseEmailSent = updatedResponse.data?.emailSent === true;
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "", accessPassword: "" }));
      }
      if (password) {
        setAvisoSenha(responseEmailSent ? `Senha nova enviada para ${email}.` : "Senha nova salva. O e-mail não saiu.");
      } else {
        setAvisoSenha("");
      }
      setToast({
        open: true,
        message: password
          ? responseEmailSent
            ? "Senha nova enviada."
            : "Senha nova salva. O e-mail não saiu."
          : "Salvo.",
      });
    } catch (error) {
      setToast({ open: true, message: errorText(error, "Não foi possível salvar o operador.") });
      return;
    } finally {
      setSaving(false);
    }
    const fresh = await loadOperatorsFromDB();
    if (isNew) {
      const created = fresh.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (created) loadOperator(created);
    }
  }

  async function deleteOperator() {
    if (!currentOperator) return;
    setSaving(true);
    try {
      await api.delete(`/users_operators/${currentOperator.id}`);
      const updatedOperators = operators.filter((op) => op.id !== currentOperator.id);
      setOperators(updatedOperators);
      guardarOperadores(updatedOperators);
      setToast({ open: true, message: "Operador excluído." });
      setFichaAberta(false);
      setGruposAbertos({});
      setCurrentOperator(null);
      setFormData({ ...emptyForm });
      setSelectedPermissions(structuredClone(defaultPermissions));
    } catch (error) {
      setToast({ open: true, message: errorText(error, "Não foi possível excluir o operador.") });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  function togglePermission(permissionId: string, enabled: boolean) {
    setSelectedPermissions((prev) => {
      const next = { ...prev };
      const permission = availablePermissions.find((item) => item.id === permissionId);
      const previous = { ...(prev[permissionId] || {}) };
      previous.enabled = enabled;
      if (enabled && permission?.subPermissions) {
        permission.subPermissions.forEach((sub) => {
          if (previous[sub.id] === undefined) previous[sub.id] = sub.type === "boolean" ? false : [];
        });
      }
      next[permissionId] = previous;
      return next;
    });
  }

  function updateSubPermission(permissionId: string, subPermissionId: string, value: unknown) {
    setSelectedPermissions((prev) => {
      const current = { ...(prev[permissionId] || { enabled: true }) };
      current[subPermissionId] = value;
      current.enabled = true;
      return { ...prev, [permissionId]: current };
    });
  }

  async function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setShowPassword(false);
    setFormData((prev) => ({ ...prev, password, confirmPassword: password }));
    if (!formData.id) {
      setAvisoSenha("Senha gerada. Clique em Salvar para enviar ao e-mail.");
      return;
    }
    setSaving(true);
    setAvisoSenha("");
    try {
      const response = await api.patch(`/users_operators/${formData.id}`, { password });
      setAvisoSenha(response.data?.emailSent === true ? `Senha nova enviada para ${formData.email}.` : "Senha nova salva. O e-mail não saiu.");
    } catch (error) {
      setAvisoSenha("");
      setToast({ open: true, message: errorText(error, "Não foi possível enviar a senha nova.") });
    } finally {
      setSaving(false);
    }
  }

  const visibleOperators = operators
    .filter((operator) => operator.role !== "MASTER")
    .filter((operator) => !searchTerm || operator.name.toLowerCase().includes(searchTerm.toLowerCase()) || operator.email.toLowerCase().includes(searchTerm.toLowerCase()));

  function acessoLigado(item: Permission) {
    if (item.bucket === "invoices") {
      const valor = selectedPermissions.GERENCIAR_INVOICES?.[item.id];
      return Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
    }
    return Boolean(selectedPermissions[item.id]?.enabled);
  }

  function alternarAcesso(item: Permission, enabled: boolean) {
    if (item.bucket === "invoices") {
      setSelectedPermissions((prev) => ({
        ...prev,
        GERENCIAR_INVOICES: { ...(prev.GERENCIAR_INVOICES || {}), [item.id]: enabled },
      }));
      return;
    }
    togglePermission(item.id, enabled);
  }

  const enabledTotal = availablePermissions.filter((item) => acessoLigado(item)).length;

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    availablePermissions.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return CATEGORY_ORDER.filter((name) => map.has(name)).map((name) => ({ name, items: map.get(name)! }));
  }, [fornecedores, recolhedores, caixa, caixaBR]);

  return (
    <div className="op-page">
      <header className="op-head">
        <div>
          <h1>Operadores</h1>
          <p>Quem entra no painel e o que cada pessoa pode abrir.</p>
        </div>
        <button className="op-btn op-btn-ink op-novo" type="button" onClick={newOperator}>Novo operador</button>
      </header>

      <div className="op-split">
        {fichaAberta ? (
        <form className="op-card" onSubmit={(event: FormEvent) => { event.preventDefault(); saveOperator(); }}>
            <h2>{formData.id ? "Ficha do operador" : "Novo operador"}</h2>
            <div className="op-grid">
              <label className="op-field">
                <span>Nome</span>
                <input required value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="op-field">
                <span>E-mail</span>
                <input type="email" required value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="op-field">
                <span>Situação</span>
                <select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as typeof formData.status }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>
              <label className="op-field">
                <span>Senha <em>· Gerar senha grava e envia para o e-mail.</em></span>
                <span className="op-secret">
                  <input type={showPassword ? "text" : "password"} value={formData.password} autoComplete="new-password" onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} />
                  <button className="op-eye" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </span>
              </label>
              <label className="op-field">
                <span>Confirmar senha</span>
                <span className="op-secret">
                  <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} autoComplete="new-password" onChange={(event) => setFormData((current) => ({ ...current, confirmPassword: event.target.value }))} />
                  <button className="op-eye" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </span>
              </label>
              <label className="op-field">
                <span>Senha de acesso <em>· em branco mantém a atual</em></span>
                <span className="op-secret">
                  <input type={showPassword ? "text" : "password"} value={formData.accessPassword} autoComplete="new-password" onChange={(event) => setFormData((current) => ({ ...current, accessPassword: event.target.value }))} />
                  <button className="op-eye" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </span>
              </label>
            </div>
            {avisoSenha ? <p className="op-senha-ok" role="status">{avisoSenha}</p> : null}
            <div className="op-actions">
              <button className="op-btn" type="button" onClick={generatePassword} disabled={saving}>Gerar senha</button>
              <button className="op-btn op-btn-ink" type="submit" disabled={saving}>Salvar</button>
              {formData.id ? <button className="op-btn op-btn-red" type="button" onClick={() => setConfirmOpen(true)}>Excluir</button> : null}
            </div>
            <p className="op-note">{enabledTotal} de {availablePermissions.length} acessos ligados nesta ficha.</p>
            <h2 className="op-liberacoes">Liberações</h2>
          <div className="op-groups">
            {grouped.map((group) => {
              const ligados = group.items.filter((item) => acessoLigado(item)).length;
              return (
              <section className="op-grupo" key={group.name} data-open={gruposAbertos[group.name] ? "true" : "false"}>
                <button className="op-grupo-head" type="button" aria-expanded={gruposAbertos[group.name] ? "true" : "false"} onClick={() => setGruposAbertos((atual) => ({ ...atual, [group.name]: !atual[group.name] }))}>
                  <strong>{group.name}</strong>
                  <span>{ligados} de {group.items.length}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                <div className="op-grupo-body">
                {group.items.map((permission) => {
                  const enabled = permission.kind === "list" ? true : acessoLigado(permission);
                  const permissionId = permission.bucket === "invoices" ? "GERENCIAR_INVOICES" : permission.id;
                  return (
                    <div className="op-perm" key={permission.id}>
                      {permission.kind === "list" ? (
                        <div className="op-switch">
                          <span>
                            <strong>{permission.name}</strong>
                            <small>{permission.description}</small>
                          </span>
                        </div>
                      ) : (
                        <label className="op-switch">
                          <input type="checkbox" checked={enabled} onChange={(event) => alternarAcesso(permission, event.target.checked)} />
                          <span>
                            <strong>{permission.name}</strong>
                            <small>{permission.description}</small>
                          </span>
                        </label>
                      )}
                      {enabled && permission.subPermissions ? (
                        <div className="op-subs">
                          {permission.subPermissions.map((sub) => {
                            const value = selectedPermissions[permissionId]?.[sub.id];
                            if (sub.options) {
                              const selected = Array.isArray(value) ? value : [];
                              const query = (listQuery[sub.id] || "").trim().toLowerCase();
                              const options = sub.options.filter((item) => !query || item.toLowerCase().includes(query));
                              return (
                                <div key={sub.id}>
                                  <div className="op-inline">
                                    <strong>{sub.label}</strong>
                                    <span className="op-pill">{selected.length} escolhidos</span>
                                    <button className="op-btn" type="button" onClick={() => updateSubPermission(permissionId, sub.id, Array.from(new Set([...selected, ...options])))}>Marcar estes</button>
                                    <button className="op-btn" type="button" onClick={() => updateSubPermission(permissionId, sub.id, [])}>Limpar</button>
                                  </div>
                                  <input className="op-filter" value={listQuery[sub.id] || ""} onChange={(event) => setListQuery((current) => ({ ...current, [sub.id]: event.target.value }))} placeholder={`Buscar em ${sub.label.toLowerCase()}`} />
                                  <div className="op-options">
                                    {options.length === 0 ? <p className="op-empty">Nada com esse nome.</p> : null}
                                    {options.map((opt) => (
                                      <label className="op-check" key={opt}>
                                        <input
                                          type="checkbox"
                                          checked={selected.includes(opt)}
                                          onChange={(event) => updateSubPermission(permissionId, sub.id, event.target.checked ? [...selected, opt] : selected.filter((item) => item !== opt))}
                                        />
                                        {opt}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <label className="op-check" key={sub.id}>
                                <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateSubPermission(permissionId, sub.id, event.target.checked)} />
                                {sub.label}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                </div>
              </section>
              );
            })}
            <div className="op-actions op-actions-end">
              <button className="op-btn op-btn-ink" type="submit" disabled={saving}>Salvar</button>
            </div>
          </div>
        </form>
        ) : (
          <section className="op-card">
            <h2>Cadastro</h2>
            <p className="op-empty">Nenhum operador selecionado. Clique em Novo operador para cadastrar, ou escolha alguém na lista.</p>
          </section>
        )}

        <aside className="op-card op-side">
          <h2>Operadores</h2>
          <input className="op-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome ou e-mail" />
          {loading ? <p className="op-empty">Carregando a equipe…</p> : null}
          {!loading && visibleOperators.length === 0 ? <p className="op-empty">Nenhum operador com esse filtro.</p> : null}
          <div className="op-list">
            {visibleOperators.map((operator) => {
              const acesso = normalizarPermissoes(operator.permissions);
              const count = availablePermissions.filter((item) => {
                if (item.bucket === "invoices") {
                  const valor = acesso.GERENCIAR_INVOICES?.[item.id];
                  return Array.isArray(valor) ? valor.length > 0 : Boolean(valor);
                }
                return Boolean(acesso[item.id]?.enabled);
              }).length;
              return (
                <button key={operator.id} type="button" className="op-person" data-active={currentOperator?.id === operator.id ? "true" : "false"} onClick={() => loadOperator(operator)}>
                  <span className="op-avatar">{initials(operator.name)}</span>
                  <span className="op-person-main">
                    <strong>{operator.name}</strong>
                    <small>{operator.email}</small>
                    <small>
                      <span className="op-pill" data-on={operator.status === "active" ? "true" : "false"}>{statusLabel(operator.status)}</span>
                      {" · "}
                      {count} {count === 1 ? "acesso" : "acessos"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
      {confirmOpen ? (
        <div className="op-dialog" role="dialog" aria-modal="true" aria-labelledby="excluir-op" onClick={() => setConfirmOpen(false)}>
          <div className="op-dialog-card" onClick={(event) => event.stopPropagation()}>
            <h2 id="excluir-op">Excluir operador</h2>
            <p>{currentOperator?.name} sai da equipe e perde o acesso.</p>
            <div className="op-actions">
              <button className="op-btn" type="button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="op-btn op-btn-red" type="button" onClick={deleteOperator} disabled={saving}>Excluir</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast.open && toast.message === "Salvo." ? (
        <div className="op-dialog" role="dialog" aria-modal="true" aria-labelledby="op-salvo" onClick={() => setToast({ open: false, message: "" })}>
          <div className="op-dialog-card op-salvo-card" onClick={(event) => event.stopPropagation()}>
            <span className="op-salvo-marca" aria-hidden="true"><Check size={22} /></span>
            <h2 id="op-salvo">Salvo</h2>
            <p>A ficha deste operador foi gravada.</p>
            <button className="op-btn op-btn-ink" type="button" onClick={() => setToast({ open: false, message: "" })}>Ok</button>
          </div>
        </div>
      ) : toast.open ? (
        <p className="op-toast" role="status">
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast({ open: false, message: "" })} aria-label="Fechar aviso">×</button>
        </p>
      ) : null}
    </div>
  );
}
