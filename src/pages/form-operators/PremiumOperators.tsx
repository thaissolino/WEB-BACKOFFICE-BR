import { FormEvent, useEffect, useState } from "react";
import { BrSwitch, BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api } from "../../services/api";

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
type Permission = { id: string; name: string; description: string; category: string; subPermissions?: SubPermission[] };

const defaultPermissions = {
  CRIAR_USUARIO: { enabled: false },
  GERENCIAR_GRUPOS: { enabled: false },
  GERENCIAR_USUARIOS: { enabled: false },
  GERENCIAR_OPERADORES: { enabled: false },
  GERENCIAR_PLANILHAS: { enabled: false },
  GERENCIAR_INVOICES: {
    enabled: false, INVOICES: false, PRODUTOS: false, FORNECEDORES: false, FRETEIROS: false, OUTROS: false, MEDIA_DOLAR: false, RELATORIOS: false, CAIXAS: [], CAIXAS_BR: [],
  },
  GERENCIAR_TOKENS: { enabled: false, FORNECEDORES: [], RECOLHEDORES: [], OPERAÇÕES: false, LUCROS: false, LUCROS_RECOLHEDORES: false },
  GERENCIAR_BOLETOS: { enabled: false },
  GERENCIAR_OPERACOES: { enabled: false },
};

export default function PremiumOperators() {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [recolhedores, setRecolhedores] = useState<string[]>([]);
  const [caixa, setCaixa] = useState<string[]>([]);
  const [caixaBR, setCaixaBR] = useState<string[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, any>>(defaultPermissions);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "", name: "", email: "", password: "", confirmPassword: "", accessPassword: "",
    status: "active" as "active" | "inactive" | "pending",
  });

  const availablePermissions: Permission[] = [
    { id: "CRIAR_USUARIO", name: "Criar Usuário", description: "Permite criar novos usuários no sistema", category: "Usuários" },
    { id: "GERENCIAR_GRUPOS", name: "Gerenciar Grupos", description: "Permite criar, editar e excluir grupos", category: "Usuários" },
    {
      id: "GERENCIAR_TOKENS", name: "Gerenciar Tokens", description: "Tokens e recortes de acesso", category: "Segurança",
      subPermissions: [
        { id: "FORNECEDORES_PERMITIDOS", label: "Fornecedores", options: fornecedores },
        { id: "RECOLHEDORES_PERMITIDOS", label: "Recolhedores", options: recolhedores },
        { id: "OPERAÇÕES", label: "Operações", type: "boolean" },
        { id: "LUCROS", label: "Lucros", type: "boolean" },
        { id: "LUCROS_RECOLHEDORES", label: "Lucros Recolhedores", type: "boolean" },
      ],
    },
    { id: "GERENCIAR_BOLETOS", name: "Gerenciar Boletos", description: "Emitir e cancelar boletos", category: "Financeiro" },
    {
      id: "GERENCIAR_INVOICES", name: "Gerenciar Invoices", description: "Invoices e caixas", category: "Financeiro",
      subPermissions: [
        { id: "PRODUTOS", label: "Produtos", type: "boolean" },
        { id: "INVOICES", label: "Invoices", type: "boolean" },
        { id: "FORNECEDORES", label: "Fornecedores", type: "boolean" },
        { id: "FRETEIROS", label: "Freteiros", type: "boolean" },
        { id: "OUTROS", label: "Outros", type: "boolean" },
        { id: "MEDIA_DOLAR", label: "Média Dólar", type: "boolean" },
        { id: "RELATORIOS", label: "Relatórios", type: "boolean" },
        { id: "CAIXAS_PERMITIDOS", label: "Caixas", options: caixa },
        { id: "CAIXAS_BR_PERMITIDOS", label: "Caixas BR", options: caixaBR },
      ],
    },
    { id: "GERENCIAR_USUARIOS", name: "Gerenciar Usuários", description: "Editar e desativar contas", category: "Usuários" },
    { id: "GERENCIAR_OPERACOES", name: "Gerenciar Operações", description: "Operação completa", category: "Operações" },
    { id: "GERENCIAR_PLANILHAS", name: "Gerenciar Planilhas", description: "Planilhas e importação", category: "Documentos" },
    { id: "GERENCIAR_OPERADORES", name: "Gerenciar Operadores", description: "Operadores e permissões", category: "Segurança" },
  ];

  async function loadOperatorsFromDB() {
    try {
      const [response, suppliers, collectors, caixa1, caixa2, caixaBrRes] = await Promise.all([
        api.get("/users_operators"),
        api.get("/suppliers/list_suppliers"),
        api.get("/collectors/list_collectors"),
        api.get("/invoice/carriers"),
        api.get("/invoice/supplier"),
        api.get("/invoice/partner"),
      ]);
      setFornecedores(suppliers.data.map((item: any) => item.name));
      setRecolhedores(collectors.data.map((item: any) => item.name));
      setCaixa([...caixa1.data.map((item: any) => item.name), ...caixa2.data.map((item: any) => item.name)]);
      setCaixaBR(caixaBrRes.data.brl.map((item: any) => item.name));
      setOperators(response.data);
    } catch {
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOperatorsFromDB(); }, []);

  function loadOperator(operator: Operator) {
    setCurrentOperator(operator);
    setFormData({
      id: operator.id, name: operator.name, email: operator.email, password: "", confirmPassword: "", accessPassword: "",
      status: operator.status.toLocaleLowerCase() as "active" | "inactive" | "pending",
    });
    setSelectedPermissions(JSON.parse(JSON.stringify(operator.permissions || defaultPermissions)));
  }

  function newOperator() {
    setCurrentOperator(null);
    setFormData({ id: "", name: "", email: "", password: "", confirmPassword: "", accessPassword: "", status: "active" });
    setSelectedPermissions(defaultPermissions);
  }

  async function saveOperator() {
    const { name, email, password, confirmPassword, status, accessPassword } = formData;
    const isNew = !formData.id;
    if (!name || !email) { setToast({ open: true, message: "Preencha todos os campos obrigatórios" }); return; }
    if (isNew && !password) { setToast({ open: true, message: "Por favor, informe uma senha" }); return; }
    if (password && password !== confirmPassword) { setToast({ open: true, message: "As senhas não coincidem" }); return; }
    setLoading(true);
    try {
      if (isNew) {
        await api.post("/users_operators", {
          id: "", name, email, status, lastAccess: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)), ...(password ? { password } : {}),
        });
      } else {
        const operatorIndex = operators.findIndex((op) => op.id.toString() === formData.id);
        if (operatorIndex === -1) throw new Error("Operador não encontrado");
        await api.patch(`/users_operators/${operators[operatorIndex].id}`, {
          id: operators[operatorIndex].id, name, email, status, lastAccess: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          permissions: JSON.parse(JSON.stringify(selectedPermissions)),
          ...(password ? { password } : {}), ...(accessPassword ? { accessPassword } : {}),
        });
        setFormData((prev) => ({ ...prev, password: "", confirmPassword: "", accessPassword: "" }));
      }
      setToast({ open: true, message: isNew ? "Operador criado com sucesso!" : "Operador atualizado com sucesso!" });
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : "Erro ao salvar operador" });
    } finally {
      await loadOperatorsFromDB();
      setLoading(false);
    }
  }

  async function deleteOperator() {
    if (!currentOperator) return;
    setLoading(true);
    try {
      await api.delete(`/users_operators/${currentOperator.id}`);
      const updatedOperators = operators.filter((op) => op.id !== currentOperator.id);
      setOperators(updatedOperators);
      setToast({ open: true, message: "Operador excluído com sucesso!" });
      if (updatedOperators.length > 0) loadOperator(updatedOperators[0]);
      else newOperator();
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : "Erro ao excluir operador" });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  function togglePermission(permissionId: string, enabled: boolean) {
    setSelectedPermissions((prev) => {
      const next = { ...prev };
      const permission = availablePermissions.find((item) => item.id === permissionId);
      next[permissionId] = { enabled };
      if (enabled && permission?.subPermissions) {
        permission.subPermissions.forEach((sub) => {
          if (next[permissionId][sub.id] === undefined) next[permissionId][sub.id] = sub.type === "boolean" ? false : [];
        });
      }
      return next;
    });
  }

  function updateSubPermission(permissionId: string, subPermissionId: string, value: any) {
    setSelectedPermissions((prev) => {
      const next = { ...prev };
      if (!next[permissionId]) next[permissionId] = { enabled: true };
      next[permissionId][subPermissionId] = value;
      return next;
    });
  }

  function generatePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, password, confirmPassword: password }));
  }

  const visibleOperators = operators
    .filter((operator) => operator.role !== "MASTER")
    .filter((operator) => !searchTerm || operator.name.toLowerCase().includes(searchTerm.toLowerCase()) || operator.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <PremiumStage
      title="Operadores"
      hint="Selecione à esquerda. Ficha e permissões à direita."
      actions={<button className="br-btn br-btn-brass" type="button" onClick={newOperator}>Novo</button>}
    >
      <div className="br-split">
        <section className="br-panel">
          <h2>Equipe</h2>
          <label className="br-field">
            <span>Buscar</span>
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </label>
          {loading ? <p className="br-empty">Carregando…</p> : null}
          {!loading && visibleOperators.length === 0 ? <p className="br-empty">Nenhum operador.</p> : null}
          {!loading && visibleOperators.length > 0 ? (
            <div className="br-list" style={{ marginTop: 8 }}>
              {visibleOperators.map((operator) => (
                <button
                  key={operator.id}
                  type="button"
                  className="br-row"
                  data-active={currentOperator?.id === operator.id ? "true" : "false"}
                  onClick={() => loadOperator(operator)}
                >
                  <div className="br-row-main">
                    <strong>{operator.name}</strong>
                    <small>
                      <span className="br-pip" data-on={operator.status === "active" ? "true" : "false"}>
                        {operator.status}
                      </span>
                      {" · "}
                      {operator.email}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="br-stack">
          <form className="br-panel" onSubmit={(event: FormEvent) => { event.preventDefault(); saveOperator(); }}>
            <h2>{formData.id ? "Editar operador" : "Novo operador"}</h2>
            <div className="br-grid two">
              <label className="br-field">
                <span>Nome *</span>
                <input required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label className="br-field">
                <span>Email *</span>
                <input type="email" required value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label className="br-field">
                <span>Status</span>
                <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as typeof formData.status }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="pending">Pendente</option>
                </select>
              </label>
              <label className="br-field">
                <span>Senha</span>
                <input value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} />
              </label>
              <label className="br-field">
                <span>Confirmar</span>
                <input value={formData.confirmPassword} onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))} />
              </label>
              <label className="br-field">
                <span>Senha de acesso</span>
                <input value={formData.accessPassword} onChange={(e) => setFormData((p) => ({ ...p, accessPassword: e.target.value }))} />
              </label>
            </div>
            <div className="br-actions" style={{ marginTop: 14 }}>
              <button className="br-btn" type="button" onClick={generatePassword}>Gerar senha</button>
              <button className="br-btn br-btn-brass" type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
              {formData.id ? <button className="br-btn br-btn-danger" type="button" onClick={() => setConfirmOpen(true)}>Excluir</button> : null}
            </div>
          </form>

          <section className="br-panel">
            <h2>Permissões</h2>
            {availablePermissions.map((permission) => {
              const enabled = Boolean(selectedPermissions[permission.id]?.enabled);
              return (
                <div className="br-perm" key={permission.id}>
                  <BrSwitch
                    label={`${permission.name}`}
                    hint={`${permission.category} · ${permission.description}`}
                    checked={enabled}
                    onChange={(e) => togglePermission(permission.id, e.target.checked)}
                  />
                  {enabled && permission.subPermissions ? (
                    <div className="br-subs">
                      {permission.subPermissions.map((sub) => {
                        const value = selectedPermissions[permission.id]?.[sub.id];
                        if (sub.options) {
                          const selected = Array.isArray(value) ? value : [];
                          return (
                            <div key={sub.id}>
                              <label className="br-check">
                                <input
                                  type="checkbox"
                                  checked={selected.length > 0}
                                  onChange={(e) => updateSubPermission(permission.id, sub.id, e.target.checked ? [...sub.options!] : [])}
                                />
                                {sub.label}
                              </label>
                              {sub.options.map((opt) => (
                                <label className="br-check" key={opt} style={{ paddingLeft: 18 }}>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={(e) => updateSubPermission(permission.id, sub.id, e.target.checked ? [...selected, opt] : selected.filter((item) => item !== opt))}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <label className="br-check" key={sub.id}>
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => updateSubPermission(permission.id, sub.id, e.target.checked)}
                            />
                            {sub.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        </div>
      </div>

      {confirmOpen ? (
        <div className="br-dialog" role="dialog" aria-modal="true" aria-labelledby="excluir-op">
          <div className="br-dialog-card">
            <h2 id="excluir-op">Excluir operador</h2>
            <p className="br-seg-hint">{currentOperator?.name}</p>
            <div className="br-actions">
              <button className="br-btn" type="button" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button className="br-btn br-btn-danger" type="button" onClick={deleteOperator}>Confirmar</button>
            </div>
          </div>
        </div>
      ) : null}
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}
