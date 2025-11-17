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
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>("");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingListItem | null>(null);
  const [purchasedQuantity, setPurchasedQuantity] = useState(0);
  const [quantityDetails, setQuantityDetails] = useState({
    ordered: 0,
    received: 0,
    defective: 0,
    returned: 0,
    final: 0,
  });
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<{ productId: string; quantity: number } | null>(
    null
  );
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

  const handleOpenPurchaseModal = (item: ShoppingListItem) => {
    setSelectedItem(item);
    setPurchasedQuantity(item.receivedQuantity || 0);
    setShowPurchaseModal(true);
  };

  const handleSavePurchasedQuantity = async (allowLess: boolean = false) => {
    if (!selectedItem) return;

    if (purchasedQuantity < 0) {
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Quantidade comprada não pode ser negativa!",
      });
      return;
    }

    // Permitir quantidade maior que pedida ou menor (se allowLess for true)
    if (!allowLess && purchasedQuantity < selectedItem.quantity) {
      const result = await Swal.fire({
        title: "Quantidade Menor que Pedida",
        text: `Você está comprando ${purchasedQuantity} mas pediu ${selectedItem.quantity}. Deseja continuar mesmo assim?`,
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
      await api.patch("/invoice/shopping-lists/update-purchased-quantity", {
        itemId: selectedItem.id,
        purchasedQuantity,
      });

      setOpenNotification({
        type: "success",
        title: "Sucesso!",
        notification:
          purchasedQuantity > selectedItem.quantity
            ? `Quantidade atualizada! Comprado ${purchasedQuantity} (maior que pedido de ${selectedItem.quantity})`
            : "Quantidade comprada atualizada com sucesso!",
      });

      setShowPurchaseModal(false);
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar quantidade comprada:", error);
      setOpenNotification({
        type: "error",
        title: "Erro!",
        notification: "Erro ao atualizar quantidade comprada",
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
            quantity: item.quantity,
            notes: item.notes || "",
          })) || [];

      // Combinar itens pendentes editados com itens comprados mantidos
      const allItems = [...newList.items, ...purchasedItems];

      await api.put(`/invoice/shopping-lists/${editingList.id}`, {
        name: newList.name,
        description: newList.description,
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

    // Adicionar no início da lista (unshift)
    setNewList((prev) => ({
      ...prev,
      items: [
        { productId: selectedProductForAdd.productId, quantity: selectedProductForAdd.quantity || 1, notes: "" },
        ...prev.items,
      ],
    }));

    // Limpar seleção
    setSelectedProductForAdd(null);
    setProductSearchTerm("");
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
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

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

            {/* Campo de busca e seleção de produto */}
            <div className="mb-3 p-3 bg-white rounded border">
              <div className="mb-2">
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2"
                  placeholder="Buscar produto por nome ou código..."
                />
              </div>
              <div className="mb-2">
                <select
                  value={selectedProductForAdd?.productId || ""}
                  onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    if (product) {
                      setSelectedProductForAdd({ productId: product.id, quantity: 1 });
                    } else {
                      setSelectedProductForAdd(null);
                    }
                  }}
                  className="w-full border border-gray-300 rounded p-2"
                >
                  <option value="">Selecione um produto</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={selectedProductForAdd?.quantity || 1}
                  onChange={(e) => {
                    if (selectedProductForAdd) {
                      setSelectedProductForAdd({ ...selectedProductForAdd, quantity: parseFloat(e.target.value) || 1 });
                    }
                  }}
                  className="w-24 border border-gray-300 rounded p-2"
                  min="1"
                  step="0.1"
                  placeholder="Qtd"
                />
                <button
                  onClick={addProductToList}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center"
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </button>
                {selectedProductForAdd && (
                  <button
                    onClick={() => {
                      setSelectedProductForAdd(null);
                      setProductSearchTerm("");
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center"
                  >
                    <X size={14} className="mr-1" />
                    Limpar
                  </button>
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
                        <span className="text-sm text-blue-600 ml-2">Qtd: {item.quantity}</span>
                        {item.notes && <span className="text-sm text-gray-600 ml-2">- {item.notes}</span>}
                      </div>
                      <button
                        onClick={() => removeProductFromList(index)}
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                      >
                        <X size={14} />
                      </button>
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
                localStorage.removeItem("shopping-list-draft");
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

              <div className="space-y-2">
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
                                  onClick={() => handleOpenPurchaseModal(item)}
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
                                  onClick={() => handleOpenPurchaseModal(item)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                                >
                                  🛒 Comprar
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
                              onClick={() => handleOpenPurchaseModal(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center"
                            >
                              🛒 Comprar
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
                                    const currentItems = list.shoppingListItems?.filter((i) => i.id !== item.id) || [];
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
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total de itens: {list.shoppingListItems?.length || 0}</span>
                  <div className="flex gap-4">
                    <span className="text-yellow-600">
                      ⏳ Pendentes: {list.shoppingListItems?.filter((item) => item.status === "PENDING").length || 0}
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
          ))
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ✅ Quantidade que Conseguimos Comprar
                </label>
                <input
                  type="number"
                  value={purchasedQuantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, "");
                    const qty = parseFloat(value) || 0;
                    setPurchasedQuantity(qty);
                  }}
                  onKeyDown={(e) => {
                    // Prevenir backspace e delete quando o campo está vazio ou tem apenas um caractere
                    const currentValue = purchasedQuantity.toString();
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
                  placeholder="Digite a quantidade comprada"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pedido: {selectedItem.quantity} | Você pode comprar mais ou menos que o pedido
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleSavePurchasedQuantity(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1"
              >
                💾 Salvar
              </button>
              {purchasedQuantity < selectedItem.quantity && (
                <button
                  onClick={() => handleSavePurchasedQuantity(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
                  title="Confirmar mesmo com quantidade menor"
                >
                  ✅ OK Menor
                </button>
              )}
              <button
                onClick={() => {
                  setShowPurchaseModal(false);
                  setPurchasedQuantity(0);
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
                    .filter((list) => list.id !== editingList?.id)
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
