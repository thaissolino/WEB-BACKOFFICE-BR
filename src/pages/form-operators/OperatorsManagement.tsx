import React, { useState, useEffect, useRef } from "react";

const OperatorManager: React.FC = () => {
  // Estados
  const [currentView, setCurrentView] = useState<"list" | "create" | "edit">("list");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [formData, setFormData] = useState<OperatorFormData>({
    id: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    permissions: [],
  });
  const [passwordVisible, setPasswordVisible] = useState({
    password: false,
    confirmPassword: false,
    editPassword: false,
    editConfirmPassword: false,
  });

  // Referências para animações
  const toastRef = useRef<HTMLDivElement>(null);
  const operatorListRef = useRef<HTMLDivElement>(null);

  // Permissões disponíveis
  const availablePermissions = [
    { id: "dashboard", name: "Dashboard", icon: "tachometer-alt", description: "Acesso ao painel principal" },
    { id: "clientes", name: "Clientes", icon: "users", description: "Gerenciar cadastro de clientes" },
    {
      id: "Fornecedores-Tokens",
      name: "Fornecedores Tokens",
      icon: "cog",
      description: "Ajustar configurações do sistema",
    },
    {
      id: "Recolhedores-Tokens",
      name: "Recolhedores Tokens",
      icon: "file-invoice-dollar",
      description: "Emitir e gerenciar boletos",
    },
    { id: "financeiro", name: "Financeiro", icon: "dollar-sign", description: "Acesso a relatórios financeiros" },
    { id: "relatorios", name: "Relatórios", icon: "chart-bar", description: "Gerar relatórios do sistema" },
    { id: "operadores", name: "Operadores", icon: "user-shield", description: "Gerenciar outros operadores" },
    { id: "suporte", name: "Suporte", icon: "headset", description: "Acesso ao sistema de suporte" },
  ];

  // Interfaces TypeScript
  interface Operator {
    id: string;
    name: string;
    email: string;
    password: string;
    permissions: string[];
    createdAt: string;
  }

  interface OperatorFormData {
    id: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    permissions: string[];
  }

  interface Permission {
    id: string;
    name: string;
    icon: string;
    description: string;
  }

  // Carregar operadores do localStorage
  useEffect(() => {
    const storedOperators = localStorage.getItem("operators");
    if (storedOperators) {
      try {
        const parsedOperators: Operator[] = JSON.parse(storedOperators);
        setOperators(parsedOperators);
        setFilteredOperators(parsedOperators);
      } catch (e) {
        console.error("Erro ao carregar operadores:", e);
        setOperators([]);
        setFilteredOperators([]);
      }
    }
  }, []);

  // Filtrar operadores quando o termo de busca mudar
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOperators(operators);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = operators.filter(
        (op) => op.name.toLowerCase().includes(term) || op.email.toLowerCase().includes(term)
      );
      setFilteredOperators(filtered);
    }
  }, [searchTerm, operators]);

  // Mostrar toast de notificação
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // Alternar entre views
  const showView = (view: "list" | "create" | "edit") => {
    setCurrentView(view);
    if (view === "list") {
      // Recarregar operadores quando voltar para a lista
      const storedOperators = localStorage.getItem("operators");
      if (storedOperators) {
        setOperators(JSON.parse(storedOperators));
      }
    }
  };

  // Alternar visibilidade da senha
  const togglePasswordVisibility = (field: keyof typeof passwordVisible) => {
    setPasswordVisible((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Gerar senha aleatória
  const generatePassword = (isEdit = false) => {
    const randomPassword = Math.random().toString(36).slice(-10);

    if (isEdit) {
      setFormData((prev) => ({
        ...prev,
        password: randomPassword,
        confirmPassword: randomPassword,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        password: randomPassword,
        confirmPassword: randomPassword,
      }));
    }
  };

  // Selecionar/desselecionar permissão
  const togglePermission = (permissionId: string, isEdit = false) => {
    setFormData((prev) => {
      const currentPermissions = isEdit ? [...prev.permissions] : [...prev.permissions];
      const index = currentPermissions.indexOf(permissionId);

      if (index > -1) {
        currentPermissions.splice(index, 1);
      } else {
        currentPermissions.push(permissionId);
      }

      return {
        ...prev,
        permissions: currentPermissions,
      };
    });
  };

  // Verificar se uma permissão está selecionada
  const isPermissionSelected = (permissionId: string, isEdit = false) => {
    return formData.permissions.includes(permissionId);
  };

  // Preencher formulário de edição
  const editOperator = (operator: Operator) => {
    setFormData({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      password: "",
      confirmPassword: "",
      permissions: [...operator.permissions],
    });
    setCurrentView("edit");
  };

  // Excluir operador
  const deleteOperator = (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este operador?")) return;

    const updatedOperators = operators.filter((op) => op.id !== id);
    setOperators(updatedOperators);
    localStorage.setItem("operators", JSON.stringify(updatedOperators));
    showToast("Operador excluído com sucesso!");
  };

  // Lidar com criação de operador
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { name, email, password, confirmPassword, permissions } = formData;

    // Validações
    if (!name || !email || !password) {
      showToast("Preencha todos os campos obrigatórios!", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("As senhas não coincidem!", "error");
      return;
    }

    if (permissions.length === 0) {
      showToast("Selecione pelo menos uma permissão!", "error");
      return;
    }

    // Verificar se email já existe
    if (operators.some((op) => op.email === email)) {
      showToast("Este email já está cadastrado!", "error");
      return;
    }

    // Criar novo operador
    const newOperator: Operator = {
      id: Date.now().toString(),
      name,
      email,
      password,
      permissions,
      createdAt: new Date().toISOString(),
    };

    const updatedOperators = [...operators, newOperator];
    setOperators(updatedOperators);
    localStorage.setItem("operators", JSON.stringify(updatedOperators));

    showToast("Operador criado com sucesso!");
    setCurrentView("list");
    setFormData({
      id: "",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      permissions: [],
    });
  };

  // Lidar com edição de operador
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { id, name, email, password, confirmPassword, permissions } = formData;

    // Validações
    if (!name || !email) {
      showToast("Preencha todos os campos obrigatórios!", "error");
      return;
    }

    if (password && password !== confirmPassword) {
      showToast("As senhas não coincidem!", "error");
      return;
    }

    if (permissions.length === 0) {
      showToast("Selecione pelo menos uma permissão!", "error");
      return;
    }

    // Encontrar operador
    const operatorIndex = operators.findIndex((op) => op.id === id);
    if (operatorIndex === -1) {
      showToast("Operador não encontrado!", "error");
      return;
    }

    // Verificar se email já existe (ignorando o próprio)
    if (operators.some((op, index) => op.email === email && index !== operatorIndex)) {
      showToast("Este email já está em uso!", "error");
      return;
    }

    // Atualizar operador
    const updatedOperators = [...operators];
    updatedOperators[operatorIndex] = {
      ...updatedOperators[operatorIndex],
      name,
      email,
      permissions,
      // Atualizar senha apenas se foi fornecida
      password: password || updatedOperators[operatorIndex].password,
    };

    setOperators(updatedOperators);
    localStorage.setItem("operators", JSON.stringify(updatedOperators));

    showToast("Operador atualizado com sucesso!");
    setCurrentView("list");
  };

  // Renderizar cards de permissão
  const renderPermissionCards = (isEdit = false) => {
    return availablePermissions.map((permission) => (
      <div
        key={permission.id}
        className={`permission-card border rounded-lg p-4 cursor-pointer ${
          isPermissionSelected(permission.id, isEdit) ? "border-blue-500 bg-blue-50 selected" : "border-gray-200"
        }`}
        onClick={() => togglePermission(permission.id, isEdit)}
      >
        <div className="flex items-center mb-2">
          <i className={`fas fa-${permission.icon} text-blue-600 text-lg mr-3`}></i>
          <h4 className="font-semibold text-gray-800">{permission.name}</h4>
        </div>
        <p className="text-sm text-gray-600">{permission.description}</p>
        <div className="mt-3 flex justify-end">
          <span
            className={`text-xs px-2 py-1 rounded ${
              isPermissionSelected(permission.id, isEdit) ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
            }`}
          >
            {isPermissionSelected(permission.id, isEdit) ? "Selecionado" : "Não selecionado"}
          </span>
        </div>
      </div>
    ));
  };

  // Renderizar lista de operadores
  const renderOperatorList = () => {
    if (filteredOperators.length === 0 && operators.length === 0) {
      return (
        <div id="empty-state" className="text-center py-12">
          <i className="fas fa-user-slash text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum operador cadastrado</h3>
          <p className="text-gray-500 mb-4">Comece cadastrando seu primeiro operador.</p>
          <button
            onClick={() => showView("create")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <i className="fas fa-plus mr-2"></i>Criar Operador
          </button>
        </div>
      );
    }

    if (filteredOperators.length === 0 && operators.length > 0) {
      return (
        <div id="no-results" className="text-center text-gray-500 mt-4">
          Nenhum operador encontrado.
        </div>
      );
    }

    return (
      <div id="operator-list" className="space-y-3" ref={operatorListRef}>
        {filteredOperators.map((operator) => (
          <div
            key={operator.id}
            className="operator-card bg-white p-4 rounded-lg border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          >
            <div className="flex-1">
              <div className="font-bold text-gray-800 flex items-center">
                <i className="fas fa-user-circle mr-2 text-blue-500"></i> {operator.name}
              </div>
              <div className="text-sm text-gray-600 mt-1 flex items-center">
                <i className="fas fa-envelope mr-2"></i> {operator.email}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {operator.permissions.slice(0, 3).map((permission) => {
                  const perm = availablePermissions.find((p) => p.id === permission);
                  return (
                    <span key={permission} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      {perm ? perm.name : permission}
                    </span>
                  );
                })}
                {operator.permissions.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                    +{operator.permissions.length - 3} mais
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => editOperator(operator)}
                className="edit-btn text-blue-600 hover:text-blue-800 transition px-3 py-1.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100"
              >
                <i className="fas fa-edit mr-1"></i> Editar
              </button>
              <button
                onClick={() => deleteOperator(operator.id)}
                className="delete-btn text-red-600 hover:text-red-800 transition px-3 py-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100"
              >
                <i className="fas fa-trash-alt mr-1"></i> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-blue-100 text-gray-900 flex min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            <i className="fas fa-users-cog text-blue-600 mr-2"></i>Gerenciar Operadores
          </h1>
          <p className="text-gray-600">Gerencie operadores e suas permissões no sistema</p>
        </div>

        {/* Menu de navegação */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <button
            onClick={() => showView("list")}
            className={`${
              currentView === "list" ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white px-5 py-2.5 rounded-lg transition flex items-center`}
          >
            <i className="fas fa-list mr-2"></i> Listar Operadores
          </button>
          <button
            onClick={() => showView("create")}
            className={`${
              currentView === "create" ? "bg-green-700" : "bg-green-600 hover:bg-green-700"
            } text-white px-5 py-2.5 rounded-lg transition flex items-center`}
          >
            <i className="fas fa-plus mr-2"></i> Criar Operador
          </button>
        </div>

        {/* Conteúdo dinâmico */}
        <div id="content-view" className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* View de Listagem */}
          <div id="list-view" className={`p-6 ${currentView !== "list" ? "hidden" : ""}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <i className="fas fa-users mr-2 text-blue-600"></i> Operadores Cadastrados
              </h2>
              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar operador..."
                    className="border rounded-lg px-4 py-2.5 pl-10 focus:ring-2 focus:ring-blue-300 w-full"
                  />
                  <i className="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                </div>
                <button
                  onClick={() => setSearchTerm("")}
                  className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition flex items-center whitespace-nowrap"
                >
                  <i className="fas fa-filter mr-2"></i> Limpar Filtro
                </button>
              </div>
            </div>

            {renderOperatorList()}
          </div>

          {/* View de Criação */}
          <div id="create-view" className={`p-6 ${currentView !== "create" ? "hidden" : ""}`}>
            <div className="flex items-center mb-6">
              <button onClick={() => showView("list")} className="mr-3 text-gray-500 hover:text-gray-700">
                <i className="fas fa-arrow-left"></i>
              </button>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <i className="fas fa-user-plus mr-2 text-green-600"></i> Criar Novo Operador
              </h2>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Informações do Operador</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="Digite o nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="exemplo@dominio.com"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                    <input
                      type={passwordVisible.password ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="Crie uma senha segura"
                    />
                    <i
                      className={`fas ${
                        passwordVisible.password ? "fa-eye" : "fa-eye-slash"
                      } absolute right-3 top-10 text-gray-500 cursor-pointer`}
                      onClick={() => togglePasswordVisibility("password")}
                    ></i>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
                    <input
                      type={passwordVisible.confirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="Confirme a senha"
                    />
                    <i
                      className={`fas ${
                        passwordVisible.confirmPassword ? "fa-eye" : "fa-eye-slash"
                      } absolute right-3 top-10 text-gray-500 cursor-pointer`}
                      onClick={() => togglePasswordVisibility("confirmPassword")}
                    ></i>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => generatePassword(false)}
                      className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                    >
                      <i className="fas fa-key mr-2"></i> Gerar Senha
                    </button>
                    <button
                      type="submit"
                      className="bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <i className="fas fa-save mr-2"></i> Criar Operador
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Permissões de Acesso</h3>
                  <p className="text-sm text-gray-600">
                    Selecione as áreas do sistema que este operador poderá acessar:
                  </p>

                  <div id="permissions-container" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderPermissionCards()}
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* View de Edição */}
          <div id="edit-view" className={`p-6 ${currentView !== "edit" ? "hidden" : ""}`}>
            <div className="flex items-center mb-6">
              <button onClick={() => showView("list")} className="mr-3 text-gray-500 hover:text-gray-700">
                <i className="fas fa-arrow-left"></i>
              </button>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <i className="fas fa-user-edit mr-2 text-blue-600"></i> Editar Operador
              </h2>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <input type="hidden" value={formData.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Informações do Operador</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (opcional)</label>
                    <input
                      type={passwordVisible.editPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="Deixe em branco para manter a atual"
                    />
                    <i
                      className={`fas ${
                        passwordVisible.editPassword ? "fa-eye" : "fa-eye-slash"
                      } absolute right-3 top-10 text-gray-500 cursor-pointer`}
                      onClick={() => togglePasswordVisibility("editPassword")}
                    ></i>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                    <input
                      type={passwordVisible.editConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-300"
                      placeholder="Confirme a nova senha"
                    />
                    <i
                      className={`fas ${
                        passwordVisible.editConfirmPassword ? "fa-eye" : "fa-eye-slash"
                      } absolute right-3 top-10 text-gray-500 cursor-pointer`}
                      onClick={() => togglePasswordVisibility("editConfirmPassword")}
                    ></i>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => generatePassword(true)}
                      className="bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                    >
                      <i className="fas fa-key mr-2"></i> Gerar Senha
                    </button>
                    <button
                      type="submit"
                      className="bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                    >
                      <i className="fas fa-save mr-2"></i> Salvar Alterações
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Permissões de Acesso</h3>
                  <p className="text-sm text-gray-600">
                    Atualize as áreas do sistema que este operador poderá acessar:
                  </p>

                  <div id="edit-permissions-container" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {renderPermissionCards(true)}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast de notificação */}
      <div
        ref={toastRef}
        className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 flex items-center ${
          toast.show ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        } ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
      >
        <i className={`fas ${toast.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"} mr-2`}></i>
        <span>{toast.message}</span>
      </div>
    </div>
  );
};

export default OperatorManager;
