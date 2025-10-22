import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Check, X, ShoppingCart, Package } from "lucide-react";
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
  quantity: number;
  notes?: string;
  purchased: boolean;
  purchasedAt?: string;
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
        </h2>
        <button
          onClick={() => setIsEditing("new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
        >
          <Plus className="mr-2" size={16} />
          Nova Lista
        </button>
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
                  <button
                    onClick={() => handleEditList(list)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <Edit size={14} className="mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Deletar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {list.shoppingListItems?.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded border ${
                      item.purchased ? "bg-green-50 border-green-200" : "bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => handleMarkAsPurchased(item.id, !item.purchased)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        item.purchased
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-green-500"
                      }`}
                    >
                      {item.purchased && <Check size={14} />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${item.purchased ? "line-through text-gray-500" : ""}`}>
                          {item.product.name}
                        </span>
                        <span className="text-sm text-gray-500">({item.product.code})</span>
                        <span className="text-sm font-semibold text-blue-600">Qtd: {item.quantity}</span>
                      </div>
                      {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                      {item.purchased && item.purchasedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Comprado em: {new Date(item.purchasedAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total de itens: {list.shoppingListItems?.length || 0}</span>
                  <span>
                    Comprados: {list.shoppingListItems?.filter((item) => item.purchased).length || 0} /{" "}
                    {list.shoppingListItems?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
