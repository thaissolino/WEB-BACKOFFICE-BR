import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ShoppingCart,
  Package,
  HelpCircle,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../../hooks/notification";

interface Product {
  id: string;
  name: string;
  code: string;
  priceweightAverage: number;
  weightAverage: number;
  description: string;
  active: boolean;
}

interface ShoppingListItem {
  id: string;
  productId: string;
  quantity: number; // Quantidade pedida
  notes?: string;
  status: string; // PENDING, PURCHASED, RECEIVED
  purchased: boolean;
  purchasedAt?: string;
  receivedAt?: string;
  receivedQuantity: number; // Quantidade recebida
  defectiveQuantity: number; // Quantidade com defeito
  returnedQuantity: number; // Quantidade devolvida
  finalQuantity: number; // Quantidade final (recebida - defeito - devolvida)
  product: Product;
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  items?: any; // JSONB field (não usado no frontend)
  shoppingListItems?: ShoppingListItem[]; // Relação real
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export function ShoppingListsTab() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [quantityDetails, setQuantityDetails] = useState({
    ordered: 0,
    received: 0,
    defective: 0,
    returned: 0,
    final: 0,
  });
  const { setOpenNotification } = useNotification();

  const [newList, setNewList] = useState({
    name: "",
    description: "",
    items: [] as Array<{
      productId: string;
      quantity: number;
      notes?: string;
    }>,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listsResponse, productsResponse] = await Promise.all([
        api.get("/invoice/shopping-lists"),
        api.get("/invoice/product"),
      ]);

      setShoppingLists(listsResponse.data);
      setProducts(productsResponse.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao carregar listas de compras",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateList = async () => {
    if (!newList.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Nome da lista é obrigatório!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsCreating(true);
      await api.post("/invoice/shopping-lists", {
        ...newList,
        createdBy: "user-id", // TODO: Pegar do contexto de usuário
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Lista de compras criada com sucesso!",
      });

      setNewList({
        name: "",
        description: "",
        items: [],
      });

      await fetchData();
    } catch (error) {
      console.error("Erro ao criar lista:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao criar lista de compras",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    const result = await Swal.fire({
      title: "Confirmar Exclusão",
      text: "Tem certeza que deseja deletar esta lista de compras?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, deletar!",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
        cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
      },
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/invoice/shopping-lists/${listId}`);
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Lista deletada com sucesso!",
        });
        await fetchData();
      } catch (error) {
        console.error("Erro ao deletar lista:", error);
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: "Erro ao deletar lista",
        });
      }
    }
  };

  const handleMarkAsPurchased = async (itemId: string, purchased: boolean) => {
    try {
      await api.patch("/invoice/shopping-lists/mark-purchased", {
        itemId,
        purchased,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: purchased ? "Item marcado como comprado!" : "Item desmarcado!",
      });

      await fetchData();
    } catch (error) {
      console.error("Erro ao marcar item:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar item",
      });
    }
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: string, receivedQuantity?: number) => {
    try {
      await api.patch("/invoice/shopping-lists/update-status", {
        itemId,
        status: newStatus,
        receivedQuantity: receivedQuantity || 0,
      });

      const statusMessages = {
        PENDING: "Item marcado como aguardando",
        PURCHASED: "Item marcado como comprado",
        RECEIVED: "Item marcado como recebido",
      };

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: statusMessages[newStatus as keyof typeof statusMessages] || "Status atualizado!",
      });

      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar status do item",
      });
    }
  };

  const openQuantityModal = (item: ShoppingListItem) => {
    setSelectedItem(item);
    const received = item.receivedQuantity || 0;
    const defective = item.defectiveQuantity || 0;
    const returned = item.returnedQuantity || 0;
    const final = received - returned; // CORREÇÃO: Final = Recebido - Devolvido

    setQuantityDetails({
      ordered: item.quantity,
      received,
      defective,
      returned,
      final,
    });
    setShowQuantityModal(true);
  };

  const handleSaveQuantityDetails = async () => {
    if (!selectedItem) return;

    // VALIDAÇÕES FINAIS ANTES DE SALVAR
    if (quantityDetails.received < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade recebida não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.received > quantityDetails.ordered) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade recebida não pode ser maior que pedida (${quantityDetails.ordered})!`,
      });
      return;
    }

    if (quantityDetails.defective < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade com defeito não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.defective > quantityDetails.received) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade com defeito não pode ser maior que recebida (${quantityDetails.received})!`,
      });
      return;
    }

    if (quantityDetails.returned < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade devolvida não pode ser negativa!",
      });
      return;
    }

    if (quantityDetails.returned > quantityDetails.defective) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: `Quantidade devolvida não pode ser maior que com defeito (${quantityDetails.defective})!`,
      });
      return;
    }

    try {
      await api.patch("/invoice/shopping-lists/update-quantities", {
        itemId: selectedItem.id,
        receivedQuantity: quantityDetails.received,
        defectiveQuantity: quantityDetails.defective,
        returnedQuantity: quantityDetails.returned,
        finalQuantity: quantityDetails.final,
        status: quantityDetails.received > 0 ? "RECEIVED" : "PURCHASED",
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Quantidades atualizadas com sucesso!",
      });

      setShowQuantityModal(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar quantidades:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar quantidades",
      });
    }
  };

  const handleEditList = (list: ShoppingList) => {
    setEditingList(list);
    setIsEditing(list.id);
    setNewList({
      name: list.name,
      description: list.description || "",
      items:
        list.shoppingListItems?.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || "",
        })) || [],
    });
  };

  const handleSaveEdit = async () => {
    if (!editingList || !newList.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Nome da lista é obrigatório!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    try {
      setIsCreating(true);
      await api.put(`/invoice/shopping-lists/${editingList.id}`, {
        name: newList.name,
        description: newList.description,
        items: newList.items,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Lista atualizada com sucesso!",
      });

      setNewList({
        name: "",
        description: "",
        items: [],
      });
      setEditingList(null);
      setIsEditing(null);

      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar lista:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar lista de compras",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addProductToList = () => {
    setNewList((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, notes: "" }],
    }));
  };

  const removeProductFromList = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateProductInList = (index: number, field: string, value: any) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  // NOVO: Funções de Download
  const handleDownloadPDF = async (listId: string, listName: string) => {
    try {
      const response = await api.get(`/invoice/shopping-lists/${listId}/download/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${listName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "PDF baixado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao baixar PDF",
      });
    }
  };

  const handleDownloadExcel = async (listId: string, listName: string) => {
    try {
      const response = await api.get(`/invoice/shopping-lists/${listId}/download/excel`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${listName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "CSV baixado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao baixar CSV:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao baixar CSV",
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: "⏳",
          label: "Aguardando",
        };
      case "PURCHASED":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: "🛒",
          label: "Comprado",
        };
      case "RECEIVED":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: "✅",
          label: "Recebido",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: "❓",
          label: "Desconhecido",
        };
    }
  };

  // Componente de Tooltip Melhorado
  const Tooltip = ({
    children,
    content,
    position = "top",
    maxWidth = "200px",
  }: {
    children: React.ReactNode;
    content: string;
    position?: "top" | "bottom" | "left" | "right";
    maxWidth?: string;
  }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
      top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
      bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
      left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
      right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
      top: "top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900",
      bottom:
        "bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900",
      left: "left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900",
      right:
        "right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900",
    };

    return (
      <div
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div
            className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl ${positionClasses[position]}`}
            style={{ maxWidth, whiteSpace: "normal", wordWrap: "break-word" }}
          >
            <div className="text-center leading-relaxed">{content}</div>
            <div className={`absolute w-0 h-0 ${arrowClasses[position]}`}></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando listas de compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700 border-b pb-2">
          <ShoppingCart className="mr-2 inline" size={18} />
          Listas de Compras
          <Tooltip content="Sistema completo com controle de status e quantidades" position="bottom" maxWidth="180px">
            <HelpCircle className="ml-2 inline cursor-help text-blue-500 hover:text-blue-700" size={16} />
          </Tooltip>
        </h2>
        <Tooltip content="Criar nova lista de compras" position="bottom" maxWidth="150px">
          <button
            onClick={() => setIsEditing("new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          >
            <Plus className="mr-2" size={16} />
            Nova Lista
          </button>
        </Tooltip>
      </div>

      {/* Formulário de Nova Lista / Edição */}
      {(isEditing === "new" || isEditing) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">
            {isEditing === "new" ? "Criar Nova Lista de Compras" : "Editar Lista de Compras"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Lista *</label>
              <input
                type="text"
                value={newList.name}
                onChange={(e) => setNewList((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Ex: Compras Janeiro 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={newList.description}
                onChange={(e) => setNewList((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          {/* Produtos */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Produtos</label>
              <button
                onClick={addProductToList}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
              >
                <Plus size={14} className="mr-1" />
                Adicionar Produto
              </button>
            </div>

            {newList.items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2 p-2 bg-white rounded border">
                <select
                  value={item.productId}
                  onChange={(e) => updateProductInList(index, "productId", e.target.value)}
                  className="flex-1 border border-gray-300 rounded p-2"
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateProductInList(index, "quantity", parseFloat(e.target.value) || 1)}
                  className="w-20 border border-gray-300 rounded p-2"
                  min="1"
                  step="0.1"
                />
                <input
                  type="text"
                  value={item.notes || ""}
                  onChange={(e) => updateProductInList(index, "notes", e.target.value)}
                  className="flex-1 border border-gray-300 rounded p-2"
                  placeholder="Observações"
                />
                <button
                  onClick={() => removeProductFromList(index)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={isEditing === "new" ? handleCreateList : handleSaveEdit}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
            >
              {isCreating
                ? isEditing === "new"
                  ? "Criando..."
                  : "Salvando..."
                : isEditing === "new"
                ? "Criar Lista"
                : "Salvar Alterações"}
            </button>
            <button
              onClick={() => {
                setIsEditing(null);
                setEditingList(null);
                setNewList({ name: "", description: "", items: [] });
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Listas */}
      <div className="space-y-4">
        {shoppingLists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto mb-4" size={48} />
            <p>Nenhuma lista de compras criada ainda.</p>
            <p className="text-sm">Clique em "Nova Lista" para começar!</p>
          </div>
        ) : (
          shoppingLists.map((list) => (
            <div key={list.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{list.name}</h3>
                  {list.description && <p className="text-gray-600 text-sm">{list.description}</p>}
                  <p className="text-xs text-gray-500">
                    Criada em: {new Date(list.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Tooltip content="Editar lista: adicionar/remover produtos" position="bottom" maxWidth="160px">
                    <button
                      onClick={() => handleEditList(list)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <Edit size={14} className="mr-1" />
                      Editar
                    </button>
                  </Tooltip>
                  <Tooltip content="Baixar lista em PDF" position="bottom" maxWidth="120px">
                    <button
                      onClick={() => handleDownloadPDF(list.id, list.name)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <FileText size={14} className="mr-1" />
                      PDF
                    </button>
                  </Tooltip>
                  <Tooltip content="Baixar lista em CSV" position="bottom" maxWidth="120px">
                    <button
                      onClick={() => handleDownloadExcel(list.id, list.name)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <FileSpreadsheet size={14} className="mr-1" />
                      CSV
                    </button>
                  </Tooltip>
                  <Tooltip content="Deletar lista permanentemente" position="bottom" maxWidth="140px">
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Deletar
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-2">
                {list.shoppingListItems?.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded border ${
                        item.status === "RECEIVED"
                          ? "bg-green-50 border-green-200"
                          : item.status === "PURCHASED"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {/* Status Badge */}
                      <Tooltip
                        content={`Status: ${statusInfo.label}. Use os botões para alterar`}
                        position="bottom"
                        maxWidth="140px"
                      >
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </div>
                      </Tooltip>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${item.status === "RECEIVED" ? "line-through text-gray-500" : ""}`}
                          >
                            {item.product.name}
                          </span>
                          <span className="text-sm text-gray-500">({item.product.code})</span>
                          <span className="text-sm font-semibold text-blue-600">
                            Pedido: {item.quantity}
                            {item.receivedQuantity > 0 && (
                              <span className="text-green-600"> / Recebido: {item.receivedQuantity}</span>
                            )}
                            {/* CORREÇÃO: A Receber = Pedido - Recebido (devolvido não conta) */}
                            {item.receivedQuantity < item.quantity && (
                              <span className="text-yellow-600">
                                {" "}
                                / A Receber: {item.quantity - item.receivedQuantity}
                              </span>
                            )}
                            {item.defectiveQuantity > 0 && (
                              <span className="text-red-600"> / Defeito: {item.defectiveQuantity}</span>
                            )}
                            {item.returnedQuantity > 0 && (
                              <span className="text-orange-600"> / Devolvido: {item.returnedQuantity}</span>
                            )}
                            {item.finalQuantity > 0 && (
                              <span className="text-purple-600"> / Final: {item.finalQuantity}</span>
                            )}
                          </span>
                        </div>
                        {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}

                        {/* Datas */}
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          {item.purchasedAt && (
                            <span>🛒 Comprado: {new Date(item.purchasedAt).toLocaleDateString("pt-BR")}</span>
                          )}
                          {item.receivedAt && (
                            <span>✅ Recebido: {new Date(item.receivedAt).toLocaleDateString("pt-BR")}</span>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-1">
                        {item.status === "PENDING" && (
                          <Tooltip content="Marcar como comprado" position="left" maxWidth="120px">
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, "PURCHASED")}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                            >
                              🛒 Comprar
                            </button>
                          </Tooltip>
                        )}
                        {(item.status === "PURCHASED" || item.status === "RECEIVED") && (
                          <Tooltip content="Gerenciar quantidades detalhadas" position="left" maxWidth="140px">
                            <button
                              onClick={() => openQuantityModal(item)}
                              className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs"
                            >
                              📊 Quantidades
                            </button>
                          </Tooltip>
                        )}
                        {item.status === "RECEIVED" && (
                          <Tooltip content="Reverter para aguardando" position="left" maxWidth="120px">
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, "PENDING")}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            >
                              🔄 Reverter
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total de itens: {list.shoppingListItems?.length || 0}</span>
                  <div className="flex gap-4">
                    <span className="text-yellow-600">
                      ⏳ Aguardando: {list.shoppingListItems?.filter((item) => item.status === "PENDING").length || 0}
                    </span>
                    <span className="text-blue-600">
                      🛒 Comprados: {list.shoppingListItems?.filter((item) => item.status === "PURCHASED").length || 0}
                    </span>
                    <span className="text-green-600">
                      ✅ Recebidos: {list.shoppingListItems?.filter((item) => item.status === "RECEIVED").length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Quantidades */}
      {showQuantityModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📊 Gerenciar Quantidades - {selectedItem.product.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📦 Quantidade Pedida</label>
                <input
                  type="number"
                  value={quantityDetails.ordered}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">✅ Quantidade Recebida</label>
                <input
                  type="number"
                  value={quantityDetails.received}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, ""); // Remove caracteres não numéricos
                    const received = parseFloat(value) || 0;
                    const final = received - quantityDetails.returned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      received,
                      final,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                  min="0"
                  max={quantityDetails.ordered}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">❌ Quantidade com Defeito</label>
                <input
                  type="number"
                  value={quantityDetails.defective}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const defective = parseFloat(value) || 0;

                    // VALIDAÇÃO: Defeito não pode ser maior que recebido
                    const maxDefective = quantityDetails.received;
                    const validDefective = defective > maxDefective ? maxDefective : defective;
                    const final = quantityDetails.received - quantityDetails.returned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      defective: validDefective,
                      final,
                    }));
                  }}
                  className={`w-full border rounded-md p-2 ${
                    quantityDetails.defective > quantityDetails.received
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  min="0"
                  max={quantityDetails.received}
                />
                <p
                  className={`text-xs mt-1 ${
                    quantityDetails.defective > quantityDetails.received
                      ? "text-red-500 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {quantityDetails.defective > quantityDetails.received
                    ? `❌ ERRO: Máximo permitido é ${quantityDetails.received}!`
                    : `Máximo: ${quantityDetails.received} (igual à quantidade recebida)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔄 Quantidade Devolvida</label>
                <input
                  type="number"
                  value={quantityDetails.returned}
                  onChange={(e) => {
                    // CORREÇÃO: Aceitar apenas números válidos
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const returned = parseFloat(value) || 0;

                    // VALIDAÇÃO: Não permitir mais que o defeito
                    const maxReturned = quantityDetails.defective;
                    const validReturned = returned > maxReturned ? maxReturned : returned;
                    const final = quantityDetails.received - validReturned;

                    setQuantityDetails((prev) => ({
                      ...prev,
                      returned: validReturned,
                      final,
                    }));
                  }}
                  className={`w-full border rounded-md p-2 ${
                    quantityDetails.returned > quantityDetails.defective
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300"
                  }`}
                  min="0"
                  max={quantityDetails.defective} // CORREÇÃO: Máximo = quantidade com defeito
                />
                <p
                  className={`text-xs mt-1 ${
                    quantityDetails.returned > quantityDetails.defective
                      ? "text-red-500 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {quantityDetails.returned > quantityDetails.defective
                    ? `❌ ERRO: Máximo permitido é ${quantityDetails.defective}!`
                    : `Máximo: ${quantityDetails.defective} (igual à quantidade com defeito)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Quantidade Final</label>
                <input
                  type="number"
                  value={quantityDetails.final}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-green-100 font-semibold"
                />
                <p className="text-xs text-gray-500 mt-1">Calculado automaticamente: Recebido - Devolvido</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveQuantityDetails}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1"
              >
                💾 Salvar Quantidades
              </button>
              <button
                onClick={() => setShowQuantityModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
