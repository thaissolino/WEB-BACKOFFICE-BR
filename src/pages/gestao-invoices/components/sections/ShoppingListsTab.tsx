import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Minus,
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
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../../../../services/api";
import Swal from "sweetalert2";
import { useNotification } from "../../../../hooks/notification";
import { ProductSearchSelect } from "./SupplierSearchSelect";

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
  completed?: boolean; // Calculado: true se todos os itens estão comprados
  completedAt?: string | null;
  status?: "pendente" | "comprando" | "concluida"; // Status calculado
}

export function ShoppingListsTab() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<"all" | "pendente" | "comprando" | "concluida">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Valor do input (sem debounce)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set()); // IDs das listas expandidas
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [purchasedQuantity, setPurchasedQuantity] = useState(0);
  const [additionalQuantity, setAdditionalQuantity] = useState(0);
  const [quantityDetails, setQuantityDetails] = useState({
    ordered: 0,
    received: 0,
    defective: 0,
    returned: 0,
    final: 0,
  });
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<{ productId: string; quantity: number } | null>(
    null
  );
  const [quantityInputValue, setQuantityInputValue] = useState<string>("0");
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

  const fetchData = async (showLoading: boolean = false) => {
    try {
      // Só mostra loading se for carregamento inicial
      if (showLoading) {
        setLoading(true);
      }
      // Para buscas, não mostra loading - atualização silenciosa

      const [listsResponse, productsResponse] = await Promise.all([
        api.get("/invoice/shopping-lists", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            status: filterStatus,
            search: searchTerm || undefined,
          },
        }),
        api.get("/invoice/product"),
      ]);

      // Backend retorna { data: [...], pagination: {...} }
      if (listsResponse.data?.data) {
        setShoppingLists(listsResponse.data.data);
        setTotalPages(listsResponse.data.pagination?.totalPages || 1);
        setTotalItems(listsResponse.data.pagination?.total || 0);
      } else {
        // Fallback para formato antigo
        setShoppingLists(listsResponse.data);
      }
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

  // Carregamento inicial com loading
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca e filtros sem loading (atualização silenciosa)
  // Usa useRef para evitar loop infinito
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Só busca se já carregou inicialmente (não é o primeiro render)
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterStatus, searchTerm]);

  // Debounce para busca: aguarda 500ms após parar de digitar antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1); // Reset para primeira página ao buscar
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timer); // Limpa o timer se o usuário continuar digitando
  }, [searchInput]);

  useEffect(() => {
    // Restaurar lista em construção do localStorage
    const savedList = localStorage.getItem("shopping-list-draft");
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        setNewList(parsed);
      } catch (error) {
        console.error("Erro ao restaurar lista do localStorage:", error);
      }
    }
  }, []);

  // Salvar lista em construção no localStorage sempre que mudar
  useEffect(() => {
    if (newList.name || newList.items.length > 0) {
      localStorage.setItem("shopping-list-draft", JSON.stringify(newList));
    } else {
      localStorage.removeItem("shopping-list-draft");
    }
  }, [newList]);

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

    // Validar que tenha pelo menos um produto
    if (newList.items.length === 0 || newList.items.every((item) => !item.productId)) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "A lista deve conter pelo menos um produto!",
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
      localStorage.removeItem("shopping-list-draft");

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

  const handleOpenPurchaseModal = async (item: ShoppingListItem, listId?: string) => {
    try {
      // Encontrar a lista que contém este item
      const foundListId =
        listId || shoppingLists.find((l) => l.shoppingListItems?.some((i) => i.id === item.id))?.id || editingList?.id;

      if (foundListId) {
        // Buscar o item atualizado da lista para garantir que temos o ID correto
        const listResponse = await api.get(`/invoice/shopping-lists/${foundListId}`);
        const updatedList = listResponse.data;

        // Encontrar o item atualizado pelo productId (mais confiável que ID)
        const updatedItem = updatedList.shoppingListItems?.find(
          (i: ShoppingListItem) => i.productId === item.productId
        );

        if (updatedItem) {
          console.log("Item atualizado encontrado:", updatedItem.id, "ID original:", item.id);
          setSelectedItem(updatedItem);
          setPurchasedQuantity(updatedItem.receivedQuantity || 0);
          setAdditionalQuantity(0); // Reset quantidade adicional
          setShowPurchaseModal(true);
          return;
        }
      }

      // Se não encontrou ou não tem listId, usar o item original
      console.log("Usando item original:", item.id);
      setSelectedItem(item);
      setPurchasedQuantity(item.receivedQuantity || 0);
      setAdditionalQuantity(0); // Reset quantidade adicional
      setShowPurchaseModal(true);
    } catch (error) {
      console.error("Erro ao buscar item atualizado:", error);
      // Em caso de erro, usar o item original
      setSelectedItem(item);
      setPurchasedQuantity(item.receivedQuantity || 0);
      setAdditionalQuantity(0); // Reset quantidade adicional
      setShowPurchaseModal(true);
    }
  };

  const handleSavePurchasedQuantity = async (allowLess: boolean = false) => {
    if (!selectedItem) return;

    // Calcular quantidade total (já comprada + adicional)
    const totalQuantity = purchasedQuantity + additionalQuantity;

    if (additionalQuantity < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade adicional não pode ser negativa!",
      });
      return;
    }

    if (totalQuantity < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade total não pode ser negativa!",
      });
      return;
    }

    // Aviso se quantidade total maior que pedida
    if (totalQuantity > selectedItem.quantity) {
      const result = await Swal.fire({
        title: "Quantidade Maior que Pedida",
        text: `Você pediu ${selectedItem.quantity} mas o total comprado será ${totalQuantity}. Deseja confirmar mesmo assim?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sim, confirmar",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    // Só mostrar confirmação se quantidade total ainda ficar menor que pedida
    // E só mostrar se realmente está comprando menos (não quando já tem mais comprado)
    // E só mostrar ocasionalmente (quando a diferença for significativa, ex: mais de 20% menor)
    const difference = selectedItem.quantity - totalQuantity;
    const percentageDifference = (difference / selectedItem.quantity) * 100;

    if (!allowLess && totalQuantity < selectedItem.quantity && additionalQuantity > 0 && percentageDifference > 20) {
      const result = await Swal.fire({
        title: "Quantidade Menor que Pedida",
        text: `Você pediu ${selectedItem.quantity} mas o total comprado será ${totalQuantity} (${difference} unidades a menos). Deseja continuar mesmo assim?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sim, confirmar",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    try {
      // Garantir que totalQuantity seja um número
      const quantityToSend = Number(totalQuantity);

      if (isNaN(quantityToSend)) {
        setOpenNotification({
          type: "error",
          title: "Erro!",
          notification: "Quantidade inválida!",
        });
        return;
      }

      console.log("Enviando para API:", {
        itemId: selectedItem.id,
        purchasedQuantity: quantityToSend,
        currentPurchased: purchasedQuantity,
        additional: additionalQuantity,
        selectedItem: selectedItem,
      });

      await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
        itemId: selectedItem.id,
        purchasedQuantity: quantityToSend,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification:
          quantityToSend > selectedItem.quantity
            ? `Quantidade atualizada! Comprado ${quantityToSend} (maior que pedido de ${selectedItem.quantity})`
            : `Quantidade atualizada! Total comprado: ${quantityToSend}`,
      });

      setShowPurchaseModal(false);
      setPurchasedQuantity(0);
      setAdditionalQuantity(0);
      await fetchData();
    } catch (error: any) {
      console.error("Erro ao atualizar quantidade comprada:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao atualizar quantidade comprada";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    }
  };

  const handleUndoPurchase = async (item: ShoppingListItem, listId?: string) => {
    try {
      const result = await Swal.fire({
        title: "Desfazer Compra",
        text: `Deseja desfazer a compra deste item? Ele voltará para o status "Pendente".`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sim, desfazer",
        cancelButtonText: "Cancelar",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-semibold mx-2",
          cancelButton: "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
        },
      });

      if (!result.isConfirmed) {
        return;
      }

      // Encontrar a lista que contém este item
      const foundListId =
        listId || shoppingLists.find((l) => l.shoppingListItems?.some((i) => i.id === item.id))?.id || editingList?.id;

      if (foundListId) {
        // Buscar o item atualizado da lista para garantir que temos o ID correto
        const listResponse = await api.get(`/invoice/shopping-lists/${foundListId}`);
        const updatedList = listResponse.data;

        // Encontrar o item atualizado pelo productId
        const updatedItem = updatedList.shoppingListItems?.find(
          (i: ShoppingListItem) => i.productId === item.productId
        );

        if (updatedItem) {
          await api.patch("/invoice/shopping-lists/undo-purchase", {
            itemId: updatedItem.id,
          });

          setOpenNotification({
            type: "success",
            title: "Sucesso!",
            notification: "Compra desfeita! O item voltou para pendente.",
          });

          await fetchData();
        } else {
          throw new Error("Item não encontrado na lista");
        }
      } else {
        throw new Error("Lista não encontrada");
      }
    } catch (error: any) {
      console.error("Erro ao desfazer compra:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao desfazer compra";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
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
    // Manter apenas itens pendentes (não comprados) ao editar
    const pendingItems = list.shoppingListItems?.filter((item) => item.status === "PENDING") || [];

    setNewList({
      name: list.name,
      description: list.description || "",
      items: pendingItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || "",
      })),
    });
  };

  const handleTransferItem = async (item: ShoppingListItem, targetListId: string) => {
    try {
      // Buscar lista destino
      const targetListResponse = await api.get(`/invoice/shopping-lists/${targetListId}`);
      const targetList = targetListResponse.data;

      // Adicionar item à lista destino
      const currentItems =
        targetList.shoppingListItems?.map((i: ShoppingListItem) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes || "",
        })) || [];

      currentItems.push({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || "",
      });

      await api.put(`/invoice/shopping-lists/${targetListId}`, {
        name: targetList.name,
        description: targetList.description,
        items: currentItems,
      });

      // Remover da lista origem - buscar lista atualizada
      const allListsResponse = await api.get("/invoice/shopping-lists");
      const allLists = allListsResponse.data;
      const sourceList = allLists.find((l: ShoppingList) => l.shoppingListItems?.some((i) => i.id === item.id));

      if (sourceList) {
        // Manter itens comprados e remover apenas o item transferido
        const remainingItems =
          sourceList.shoppingListItems
            ?.filter((i: ShoppingListItem) => i.id !== item.id)
            .map((i: ShoppingListItem) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes || "",
            })) || [];

        await api.put(`/invoice/shopping-lists/${sourceList.id}`, {
          name: sourceList.name,
          description: sourceList.description,
          items: remainingItems,
        });
      }

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification: "Item transferido com sucesso!",
      });

      setShowTransferModal(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao transferir item:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao transferir item",
      });
    }
  };

  const handleViewPDF = async (listId: string, listName: string, onlyPending: boolean = false) => {
    try {
      const response = await api.get(`/invoice/shopping-lists/${listId}`);
      const shoppingList = response.data;

      let itemsToInclude = shoppingList.shoppingListItems || [];
      if (onlyPending) {
        itemsToInclude = itemsToInclude.filter((item: any) => item.status === "PENDING");
      }

      // Gerar HTML do PDF
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text(`Lista de Compras - ${shoppingList.name}${onlyPending ? " (Pendentes)" : ""}`, 105, 15, {
        align: "center",
        maxWidth: 180,
      });

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Data emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);
      doc.text(`Criada em: ${new Date(shoppingList.createdAt).toLocaleDateString("pt-BR")}`, 15, 30);

      const statusCounts = {
        PENDING: itemsToInclude.filter((item: any) => item.status === "PENDING").length,
        PURCHASED: itemsToInclude.filter((item: any) => item.status === "PURCHASED").length,
        RECEIVED: itemsToInclude.filter((item: any) => item.status === "RECEIVED").length,
      };

      const statusText = `Pendentes: ${statusCounts.PENDING} | Comprados: ${
        statusCounts.PURCHASED + statusCounts.RECEIVED
      }`;
      doc.text(statusText, 195, 25, { align: "right" });

      if (shoppingList.description) {
        doc.text(`Descrição: ${shoppingList.description}`, 105, 35, { align: "center" });
      }

      const statusMap = {
        PENDING: "Pendente",
        PURCHASED: "Comprado",
        RECEIVED: "Comprado",
      };

      const truncateText = (text: string, maxLength: number) => {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + "...";
        }
        return text;
      };

      const tableData = itemsToInclude.map((item: any) => [
        truncateText(`${item.product.name} (${item.product.code})`, 35),
        item.quantity.toString(),
        item.receivedQuantity.toString(),
        truncateText(statusMap[item.status as keyof typeof statusMap] || item.status, 12),
      ]);

      const { autoTable } = await import("jspdf-autotable");
      autoTable(doc, {
        head: [["PRODUTO", "PEDIDO", "COMPRADO", "STATUS"]],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 60, fontStyle: "bold" },
          1: { halign: "center", cellWidth: 30 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 30 },
        },
        margin: { left: 10, right: 10 },
      });

      // Converter para base64 para visualizar
      const pdfBlob = doc.output("blob");
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPdfContent(base64data);
        setShowPdfModal(true);
        setShowOnlyPending(onlyPending);
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao gerar PDF",
      });
    }
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

      // Buscar lista atualizada para pegar itens comprados
      const currentListResponse = await api.get(`/invoice/shopping-lists/${editingList.id}`);
      const currentList = currentListResponse.data;

      // Manter itens comprados (PURCHASED e RECEIVED)
      const purchasedItems =
        currentList.shoppingListItems
          ?.filter((item: ShoppingListItem) => item.status === "PURCHASED" || item.status === "RECEIVED")
          .map((item: ShoppingListItem) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 0,
            notes: item.notes || "",
          })) || [];

      // Garantir que todos os itens tenham quantity como número
      const validatedNewItems = newList.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 0,
        notes: item.notes || "",
      }));

      // Mesclar produtos duplicados nos novos itens, SOMANDO as quantidades
      const mergedNewItemsMap = new Map<string, { productId: string; quantity: number; notes: string }>();
      validatedNewItems.forEach((item) => {
        const existing = mergedNewItemsMap.get(item.productId);
        if (existing) {
          // Se já existe, SOMAR as quantidades
          mergedNewItemsMap.set(item.productId, {
            productId: item.productId,
            quantity: existing.quantity + item.quantity,
            notes: existing.notes || item.notes || "",
          });
        } else {
          mergedNewItemsMap.set(item.productId, {
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes || "",
          });
        }
      });
      const mergedNewItems = Array.from(mergedNewItemsMap.values());

      // Remover produtos dos novos itens que já estão comprados (mesclar)
      // Se um produto já foi comprado, mantemos apenas o comprado e removemos o pendente
      const purchasedProductIds = purchasedItems.map(
        (item: { productId: string; quantity: number; notes?: string }) => item.productId
      );

      // Filtrar novos itens removendo os que já estão comprados
      const newItemsWithoutPurchased = mergedNewItems.filter(
        (item: { productId: string; quantity: number; notes?: string }) => !purchasedProductIds.includes(item.productId)
      );

      // Combinar itens pendentes editados (sem os já comprados) com itens comprados mantidos
      const allItems = [...newItemsWithoutPurchased, ...purchasedItems];

      // Validar que há pelo menos um item
      if (allItems.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Atenção",
          text: "A lista deve conter pelo menos um produto!",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
          },
        });
        setIsCreating(false);
        return;
      }

      console.log("Enviando atualização da lista:", {
        id: editingList.id,
        name: newList.name,
        description: newList.description,
        itemsCount: allItems.length,
        items: allItems,
      });

      await api.put(`/invoice/shopping-lists/${editingList.id}`, {
        name: newList.name,
        description: newList.description || "",
        items: allItems,
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
    } catch (error: any) {
      console.error("Erro ao atualizar lista:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Erro ao atualizar lista de compras";
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addProductToList = () => {
    if (!selectedProductForAdd || !selectedProductForAdd.productId) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "Selecione um produto primeiro!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    const quantityToAdd = selectedProductForAdd.quantity || 0;

    if (quantityToAdd <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Atenção",
        text: "A quantidade deve ser maior que zero!",
        confirmButtonText: "Ok",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold",
        },
      });
      return;
    }

    // Adicionar no início da lista (unshift)
    setNewList((prev) => ({
      ...prev,
      items: [{ productId: selectedProductForAdd.productId, quantity: quantityToAdd, notes: "" }, ...prev.items],
    }));

    // Limpar seleção
    setSelectedProductForAdd(null);
    setQuantityInputValue("0");
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

  const increaseQuantity = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, quantity: (item.quantity || 0) + 1 } : item)),
    }));
  };

  const decreaseQuantity = (index: number) => {
    setNewList((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const newQuantity = Math.max(0, (item.quantity || 0) - 1);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    }));
  };

  // NOVO: Funções de Download - USANDO JSPDF COMO OS OUTROS
  const handleDownloadPDF = async (listId: string, listName: string, selectedItems?: any[]) => {
    try {
      // Buscar dados da lista
      const response = await api.get(`/invoice/shopping-lists/${listId}`);
      const shoppingList = response.data;

      // Filtrar itens se seleção específica foi fornecida
      const itemsToInclude = selectedItems
        ? shoppingList.shoppingListItems.filter((item: any) =>
            selectedItems.some((selected) => selected.id === item.id)
          )
        : shoppingList.shoppingListItems;

      // Criar PDF usando jsPDF (igual aos outros)
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Título PRINCIPAL melhor centralizado
      doc.setFontSize(16);
      doc.setTextColor(40, 100, 40);
      doc.text(`Lista de Compras - ${shoppingList.name}`, 105, 15, {
        align: "center",
        maxWidth: 180,
      });

      // Informações organizadas
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      // Coluna esquerda
      doc.text(`Data emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);
      doc.text(`Criada em: ${new Date(shoppingList.createdAt).toLocaleDateString("pt-BR")}`, 15, 30);

      // Status à direita
      const statusCounts = {
        PENDING: itemsToInclude.filter((item: any) => item.status === "PENDING").length,
        PURCHASED: itemsToInclude.filter((item: any) => item.status === "PURCHASED").length,
        RECEIVED: itemsToInclude.filter((item: any) => item.status === "RECEIVED").length,
      };

      const statusText = `Pendentes: ${statusCounts.PENDING} | Comprados: ${
        statusCounts.PURCHASED + statusCounts.RECEIVED
      }`;
      doc.text(statusText, 195, 25, { align: "right" });

      // Descrição centralizada
      if (shoppingList.description) {
        doc.text(`Descrição: ${shoppingList.description}`, 105, 35, { align: "center" });
      }

      // Seleção parcial centralizada
      if (selectedItems && selectedItems.length < shoppingList.shoppingListItems.length) {
        doc.text(`Itens selecionados: ${selectedItems.length} de ${shoppingList.shoppingListItems.length}`, 105, 40, {
          align: "center",
        });
      }

      // Mapear status
      const statusMap = {
        PENDING: "Pendente",
        PURCHASED: "Comprado",
        RECEIVED: "Comprado",
      };

      // Função para truncar textos
      const truncateText = (text: string, maxLength: number) => {
        if (text.length > maxLength) {
          return text.substring(0, maxLength - 3) + "...";
        }
        return text;
      };

      // Preparar dados com truncagem
      const tableData = itemsToInclude.map((item: any) => [
        truncateText(`${item.product.name} (${item.product.code})`, 35),
        item.quantity.toString(),
        item.receivedQuantity.toString(),
        item.defectiveQuantity.toString(),
        item.finalQuantity.toString(),
        (item.quantity - item.receivedQuantity).toString(),
        truncateText(statusMap[item.status as keyof typeof statusMap] || item.status, 12),
      ]);

      // Tabela com cabeçalho em UMA LINHA
      const { autoTable } = await import("jspdf-autotable");
      autoTable(doc, {
        head: [["PRODUTO", "PEDIDO", "RECEBIDO", "DEFEITO", "FINAL", "A RECEBER", "STATUS"]],
        body: tableData,
        startY: 45,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: "center",
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 4,
          halign: "center",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: {
            halign: "left",
            cellWidth: 40,
            fontStyle: "bold",
          },
          1: { halign: "center", cellWidth: 25 },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "center", cellWidth: 18 },
          5: { halign: "center", cellWidth: 28 },
          6: { halign: "center", cellWidth: 25 },
        },
        margin: { left: 10, right: 10 },

        tableWidth: "auto",
        showHead: "everyPage",
      });

      // Salvar PDF
      const fileName = `${listName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

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
          label: "Pendente",
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

  // Filtrar produtos para busca

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Produto</label>

            {/* Campo de seleção de produto usando ProductSearchSelect - Tudo na mesma linha */}
            <div className="mb-3 p-3 bg-white rounded border">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <ProductSearchSelect
                      products={products}
                      value={selectedProductForAdd?.productId || ""}
                      onChange={(productId: string) => {
                        if (productId) {
                          setSelectedProductForAdd({ productId, quantity: 0 });
                          setQuantityInputValue("0");
                        } else {
                          setSelectedProductForAdd(null);
                          setQuantityInputValue("0");
                        }
                      }}
                      inline={true}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
                  <input
                    type="text"
                    value={quantityInputValue}
                    onChange={(e) => {
                      // Permite apenas números e ponto decimal
                      const value = e.target.value.replace(/[^0-9.]/g, "");
                      setQuantityInputValue(value);

                      if (selectedProductForAdd) {
                        const numValue = parseFloat(value) || 0;
                        setSelectedProductForAdd({
                          ...selectedProductForAdd,
                          quantity: numValue,
                        });
                      }
                    }}
                    onFocus={(e) => {
                      // Seleciona todo o texto ao focar para facilitar substituição
                      e.target.select();
                    }}
                    className="w-24 border border-gray-300 rounded p-2"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">A</label>
                  <button
                    onClick={addProductToList}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar
                  </button>
                </div>
                {selectedProductForAdd && (
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1 opacity-0">A</label>
                    <button
                      onClick={() => {
                        setSelectedProductForAdd(null);
                        setQuantityInputValue("0");
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center"
                    >
                      <X size={14} className="mr-1" />
                      Limpar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de produtos adicionados */}
            {newList.items.length > 0 && (
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Produtos na Lista</label>
                {newList.items.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <div key={index} className="flex gap-2 mb-2 p-2 bg-white rounded border items-center">
                      <div className="flex-1">
                        <span className="font-medium">{product?.name || "Produto não encontrado"}</span>
                        {product && <span className="text-sm text-gray-500 ml-2">({product.code})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQuantity(index)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-semibold text-blue-600 min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(index)}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => removeProductFromList(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center justify-center"
                          title="Remover produto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                setSelectedProductForAdd(null);
                setQuantityInputValue("0");
                localStorage.removeItem("shopping-list-draft");
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="mb-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Buscar</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value); // Atualiza apenas o input, sem buscar imediatamente
              }}
              placeholder="Buscar por nome ou descrição..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as "all" | "pendente" | "comprando" | "concluida");
                setCurrentPage(1); // Reset para primeira página ao filtrar
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
                paddingRight: "2.5rem",
              }}
            >
              <option value="all">Todas</option>
              <option value="pendente">Pendente</option>
              <option value="comprando">Comprando</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Listas */}
      <div className="space-y-4">
        {shoppingLists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto mb-4" size={48} />
            <p>Nenhuma lista de compras encontrada.</p>
            <p className="text-sm">
              {searchTerm || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca."
                : 'Clique em "Nova Lista" para começar!'}
            </p>
          </div>
        ) : (
          shoppingLists.map((list) => {
            const isExpanded = expandedLists.has(list.id);
            const toggleExpand = () => {
              setExpandedLists((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(list.id)) {
                  newSet.delete(list.id);
                } else {
                  newSet.add(list.id);
                }
                return newSet;
              });
            };

            return (
              <div
                key={list.id}
                className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                  list.status === "concluida"
                    ? "bg-green-50 border-green-200"
                    : list.status === "comprando"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Header clicável */}
                <div
                  onClick={toggleExpand}
                  className={`p-4 cursor-pointer transition-all duration-200 flex justify-between items-start ${
                    isExpanded ? "bg-opacity-100" : "hover:bg-opacity-90"
                  }`}
                  style={{
                    backgroundColor:
                      list.status === "concluida"
                        ? "rgba(34, 197, 94, 0.1)"
                        : list.status === "comprando"
                        ? "rgba(234, 179, 8, 0.1)"
                        : "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  <div className="flex-1 flex items-start gap-3">
                    <div className={`mt-1 transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`}>
                      <ChevronDown className="text-gray-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-800">{list.name}</h3>
                        {list.status === "concluida" && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                            ✅ Concluída
                          </span>
                        )}
                        {list.status === "comprando" && (
                          <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                            🛒 Comprando
                          </span>
                        )}
                        {list.status === "pendente" && (
                          <span className="px-2 py-1 bg-gray-400 text-white text-xs font-semibold rounded-full">
                            ⏳ Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Criada em: {new Date(list.createdAt).toLocaleDateString("pt-BR")}
                        {list.description && (
                          <span className="ml-2 text-gray-600">• Descrição: {list.description}</span>
                        )}
                        {list.completedAt && (
                          <span className="ml-2 text-green-600">
                            • Concluída em: {new Date(list.completedAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Tooltip content="Editar lista: adicionar/remover produtos" position="bottom" maxWidth="160px">
                      <button
                        onClick={() => handleEditList(list)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </button>
                    </Tooltip>
                    <Tooltip content="Visualizar PDF na tela" position="bottom" maxWidth="140px">
                      <button
                        onClick={() => handleViewPDF(list.id, list.name, false)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm flex items-center"
                      >
                        <FileText size={14} className="mr-1" />
                        Ver PDF
                      </button>
                    </Tooltip>
                    <Tooltip content="Visualizar apenas pendentes" position="bottom" maxWidth="160px">
                      <button
                        onClick={() => handleViewPDF(list.id, list.name, true)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center"
                      >
                        <FileText size={14} className="mr-1" />
                        Ver Pendentes
                      </button>
                    </Tooltip>
                    <Tooltip content="Baixar lista em PDF" position="bottom" maxWidth="120px">
                      <button
                        onClick={() => handleDownloadPDF(list.id, list.name)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center"
                      >
                        <Download size={14} className="mr-1" />
                        Baixar
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

                {/* Conteúdo colapsável */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4 pt-0 space-y-2">
                    {/* Itens Pendentes (em cima) */}
                    {list.shoppingListItems
                      ?.filter((item) => item.status === "PENDING")
                      .map((item) => {
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
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm text-gray-500">({item.product.code})</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  Pedido: {item.quantity}
                                  {item.receivedQuantity > 0 && (
                                    <span className="text-green-600"> / Comprado: {item.receivedQuantity}</span>
                                  )}
                                </span>
                              </div>
                              {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-1">
                              {item.status === "PENDING" && (
                                <>
                                  <Tooltip content="Informar quantidade comprada" position="left" maxWidth="140px">
                                    <button
                                      onClick={() => handleOpenPurchaseModal(item, list.id)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                    >
                                      🛒 Comprar
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Transferir para outra lista" position="left" maxWidth="140px">
                                    <button
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowTransferModal(true);
                                      }}
                                      className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      📦 Transferir
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                    <button
                                      onClick={async () => {
                                        const result = await Swal.fire({
                                          title: "Confirmar Exclusão",
                                          text: "Tem certeza que deseja excluir este item da lista?",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonColor: "#dc2626",
                                          cancelButtonColor: "#6b7280",
                                          confirmButtonText: "Sim, excluir!",
                                          cancelButtonText: "Cancelar",
                                          buttonsStyling: false,
                                          customClass: {
                                            confirmButton:
                                              "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                            cancelButton:
                                              "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                          },
                                        });

                                        if (result.isConfirmed) {
                                          try {
                                            // Remover item da lista editando a lista
                                            const currentItems =
                                              list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                            await api.put(`/invoice/shopping-lists/${list.id}`, {
                                              name: list.name,
                                              description: list.description,
                                              items: currentItems.map((i) => ({
                                                productId: i.productId,
                                                quantity: i.quantity,
                                                notes: i.notes,
                                              })),
                                            });
                                            setOpenNotification({
                                              type: "success",
                                              title: "Sucesso!",
                                              notification: "Item excluído da lista!",
                                            });
                                            await fetchData();
                                          } catch (error) {
                                            console.error("Erro ao excluir item:", error);
                                            setOpenNotification({
                                              type: "error",
                                              title: "Erro!",
                                              notification: "Erro ao excluir item",
                                            });
                                          }
                                        }
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                              {(item.status === "PURCHASED" || item.status === "RECEIVED") && (
                                <>
                                  <Tooltip content="Atualizar quantidade comprada" position="left" maxWidth="160px">
                                    <button
                                      onClick={() => handleOpenPurchaseModal(item, list.id)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                    >
                                      🛒 Comprar
                                    </button>
                                  </Tooltip>
                                  <Tooltip
                                    content="Desfazer compra e voltar para pendente"
                                    position="left"
                                    maxWidth="180px"
                                  >
                                    <button
                                      onClick={() => handleUndoPurchase(item, list.id)}
                                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                    >
                                      <RotateCcw size={14} className="mr-1" />
                                      Desfazer
                                    </button>
                                  </Tooltip>
                                  <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                    <button
                                      onClick={async () => {
                                        const result = await Swal.fire({
                                          title: "Confirmar Exclusão",
                                          text: "Tem certeza que deseja excluir este item da lista?",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonColor: "#dc2626",
                                          cancelButtonColor: "#6b7280",
                                          confirmButtonText: "Sim, excluir!",
                                          cancelButtonText: "Cancelar",
                                          buttonsStyling: false,
                                          customClass: {
                                            confirmButton:
                                              "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                            cancelButton:
                                              "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                          },
                                        });

                                        if (result.isConfirmed) {
                                          try {
                                            // Remover item da lista editando a lista
                                            const currentItems =
                                              list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                            await api.put(`/invoice/shopping-lists/${list.id}`, {
                                              name: list.name,
                                              description: list.description,
                                              items: currentItems.map((i) => ({
                                                productId: i.productId,
                                                quantity: i.quantity,
                                                notes: i.notes,
                                              })),
                                            });
                                            setOpenNotification({
                                              type: "success",
                                              title: "Sucesso!",
                                              notification: "Item excluído da lista!",
                                            });
                                            await fetchData();
                                          } catch (error) {
                                            console.error("Erro ao excluir item:", error);
                                            setOpenNotification({
                                              type: "error",
                                              title: "Erro!",
                                              notification: "Erro ao excluir item",
                                            });
                                          }
                                        }
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Itens Comprados (embaixo) */}
                    {list.shoppingListItems
                      ?.filter((item) => item.status === "PURCHASED" || item.status === "RECEIVED")
                      .map((item) => {
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
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm text-gray-500">({item.product.code})</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  Pedido: {item.quantity}
                                  {item.receivedQuantity > 0 && (
                                    <span className="text-green-600"> / Comprado: {item.receivedQuantity}</span>
                                  )}
                                  {item.receivedQuantity > item.quantity && (
                                    <span className="text-purple-600"> ⚠️ (maior que pedido)</span>
                                  )}
                                </span>
                              </div>
                              {item.notes && <p className="text-sm text-gray-600 mt-1">{item.notes}</p>}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-1">
                              <Tooltip content="Atualizar quantidade comprada" position="left" maxWidth="160px">
                                <button
                                  onClick={() => handleOpenPurchaseModal(item, list.id)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                >
                                  🛒 Comprar
                                </button>
                              </Tooltip>
                              <Tooltip
                                content="Desfazer compra e voltar para pendente"
                                position="left"
                                maxWidth="180px"
                              >
                                <button
                                  onClick={() => handleUndoPurchase(item, list.id)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                >
                                  <RotateCcw size={14} className="mr-1" />
                                  Desfazer
                                </button>
                              </Tooltip>
                              <Tooltip content="Excluir item da lista" position="left" maxWidth="120px">
                                <button
                                  onClick={async () => {
                                    const result = await Swal.fire({
                                      title: "Confirmar Exclusão",
                                      text: "Tem certeza que deseja excluir este item da lista?",
                                      icon: "warning",
                                      showCancelButton: true,
                                      confirmButtonColor: "#dc2626",
                                      cancelButtonColor: "#6b7280",
                                      confirmButtonText: "Sim, excluir!",
                                      cancelButtonText: "Cancelar",
                                      buttonsStyling: false,
                                      customClass: {
                                        confirmButton:
                                          "bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold mx-2",
                                        cancelButton:
                                          "bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-semibold mx-2",
                                      },
                                    });

                                    if (result.isConfirmed) {
                                      try {
                                        const currentItems =
                                          list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
                                        await api.put(`/invoice/shopping-lists/${list.id}`, {
                                          name: list.name,
                                          description: list.description,
                                          items: currentItems.map((i) => ({
                                            productId: i.productId,
                                            quantity: i.quantity,
                                            notes: i.notes,
                                          })),
                                        });
                                        setOpenNotification({
                                          type: "success",
                                          title: "Sucesso!",
                                          notification: "Item excluído da lista!",
                                        });
                                        await fetchData();
                                      } catch (error) {
                                        console.error("Erro ao excluir item:", error);
                                        setOpenNotification({
                                          type: "error",
                                          title: "Erro!",
                                          notification: "Erro ao excluir item",
                                        });
                                      }
                                    }
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}

                    {/* Resumo */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Total de itens: {list.shoppingListItems?.length || 0}</span>
                        <div className="flex gap-4">
                          <span className="text-yellow-600">
                            ⏳ Pendentes:{" "}
                            {list.shoppingListItems?.filter((item) => item.status === "PENDING").length || 0}
                          </span>
                          <span className="text-blue-600">
                            🛒 Comprados:{" "}
                            {list.shoppingListItems?.filter(
                              (item) => item.status === "PURCHASED" || item.status === "RECEIVED"
                            ).length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de{" "}
              {totalItems} listas
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Anterior
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Simplificado de Quantidade Comprada */}
      {showPurchaseModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              🛒 Informar Quantidade Comprada - {selectedItem.product.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📦 Quantidade Pedida</label>
                <input
                  type="number"
                  value={selectedItem.quantity}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">✅ Quantidade Já Comprada</label>
                <input
                  type="number"
                  value={purchasedQuantity}
                  disabled
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ➕ Quantidade Adicional a Comprar
                </label>
                <input
                  type="number"
                  value={additionalQuantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const qty = parseFloat(value) || 0;
                    setAdditionalQuantity(qty);
                  }}
                  onKeyDown={(e) => {
                    // Prevenir backspace e delete quando o campo está vazio ou tem apenas um caractere
                    const currentValue = additionalQuantity.toString();
                    if (
                      (e.key === "Backspace" || e.key === "Delete") &&
                      (currentValue === "0" || currentValue === "" || currentValue.length <= 1)
                    ) {
                      // Permitir apenas se o usuário selecionou todo o texto
                      const input = e.target as HTMLInputElement;
                      if (input.selectionStart !== 0 || input.selectionEnd !== currentValue.length) {
                        e.preventDefault();
                      }
                    }
                  }}
                  onFocus={(e) => {
                    // Selecionar todo o texto ao focar para facilitar substituição
                    e.target.select();
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                  min="0"
                  placeholder="Digite a quantidade adicional"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">📊 Total que será comprado:</span>
                  <span className="text-lg font-bold text-blue-600">{purchasedQuantity + additionalQuantity}</span>
                </div>
                {purchasedQuantity + additionalQuantity < selectedItem.quantity && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Ainda faltam {selectedItem.quantity - (purchasedQuantity + additionalQuantity)} unidades
                  </p>
                )}
                {purchasedQuantity + additionalQuantity > selectedItem.quantity && (
                  <p className="text-xs text-purple-600 mt-1">
                    ⚠️ Será comprado {purchasedQuantity + additionalQuantity - selectedItem.quantity} a mais que o
                    pedido
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSavePurchasedQuantity(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1"
              >
                💾 Salvar
              </button>
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setPurchasedQuantity(0);
                  setAdditionalQuantity(0);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">📦 Transferir Item - {selectedItem.product.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a lista destino</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTransferItem(selectedItem, e.target.value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Selecione uma lista...</option>
                  {shoppingLists
                    .filter((list) => list.id !== editingList?.id && !list.completed)
                    .map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedItem(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex-1"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                📄 Visualização de PDF {showOnlyPending && "(Apenas Pendentes)"}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = pdfContent;
                    link.download = `lista_${Date.now()}.pdf`;
                    link.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  <Download size={14} className="inline mr-1" />
                  Baixar
                </button>
                <button
                  onClick={() => {
                    setShowPdfModal(false);
                    setPdfContent("");
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                >
                  ❌ Fechar
                </button>
              </div>
            </div>
            <iframe src={pdfContent} className="w-full h-[70vh] border border-gray-300 rounded" title="PDF Viewer" />
          </div>
        </div>
      )}

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
