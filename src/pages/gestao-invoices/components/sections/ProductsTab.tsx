import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Boxes, Loader2, Search } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";
import { useNotification } from "../../../../hooks/notification";
import { useActionLoading } from "../../context/ActionLoadingContext";

export interface Product {
  id: string;
  name: string;
  code: string;
  priceweightAverage: number;
  weightAverage: number;
  description: string;
  active?: boolean;
}

// Remove acentos e baixa caso para comparação.
const norm = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Match estrito por termos. Cada termo precisa bater em pelo menos um campo:
// - name/description: como palavra completa OU como início de palavra
// - code: como código exato (igualdade total), nunca substring
// Isso evita falsos positivos como "16" achar produtos com código 163, 164…
function productMatchesQuery(
  query: string,
  product: { name?: string; code?: string; description?: string },
): boolean {
  const q = norm(query).trim();
  if (!q) return true;

  const terms = q.split(/\s+/).filter(Boolean);
  const nameWords = norm(`${product.name || ""} ${product.description || ""}`)
    .split(/\s+/)
    .filter(Boolean);
  const codeNorm = norm(product.code || "");

  return terms.every((term) => {
    if (codeNorm && codeNorm === term) return true;
    return nameWords.some(
      (word) => word === term || word.startsWith(term),
    );
  });
}

export function ProductsTab() {
  // allProducts = lista bruta vinda do backend (apenas ativos).
  // products (computado) = lista filtrada client-side baseada em searchInput.
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "code">("name");
  const [searchInput, setSearchInput] = useState("");
  // searchTerm (debounced) é usado SOMENTE para otimizar a request ao backend.
  // O filtro visual usa searchInput diretamente (instantâneo).
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { setOpenNotification } = useNotification();
  const { isLoading: isActionLoading, executeAction } = useActionLoading();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const trimmedSearch = searchTerm.trim();
      const response = await api.get<any>("/invoice/product", {
        params: {
          search: trimmedSearch || undefined,
          limit: 1000,
          page: 1,
        },
      });
      const productsData: Product[] = Array.isArray(response.data)
        ? response.data
        : response.data.products || [];
      const activeProducts = productsData.filter((p: Product) => p.active !== false);
      setAllProducts(activeProducts);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  // Debounce da busca: 350ms após parar de digitar antes de enviar à API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // FILTRO + ORDENAÇÃO INSTANTÂNEOS (client-side, baseados em searchInput).
  // Cada palavra do termo precisa aparecer como palavra inteira (ou início de
  // palavra) no nome/descrição, ou como código exato. Evita "16" casar com 163.
  const products = useMemo(() => {
    const trimmed = searchInput.trim();
    let list = allProducts;
    if (trimmed) {
      list = allProducts.filter((p) => productMatchesQuery(trimmed, p));
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base", numeric: true });
      }
      const codeA = parseInt(a.code);
      const codeB = parseInt(b.code);
      if (!isNaN(codeA) && !isNaN(codeB)) return codeA - codeB;
      return a.code.localeCompare(b.code, "pt-BR", { sensitivity: "base", numeric: true });
    });
  }, [allProducts, searchInput, sortBy]);

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setShowModal(true);
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleDeleteMultiple = async () => {
    if (isActionLoading) return;
    if (selectedProducts.length === 0) return;

    const result = await Swal.fire({
      title: "Tem certeza?",
      text: `Você está prestes a excluir ${selectedProducts.length} produto(s). Esta ação não pode ser revertida!`,
      icon: "warning",
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold mr-2",
        cancelButton: "bg-gray-500 text-white hover:bg-gray-600 px-4 py-2 rounded font-semibold",
      },
      confirmButtonText: `Sim, excluir ${selectedProducts.length} produto(s)!`,
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      await executeAction(async () => {
        await Promise.all(selectedProducts.map((id) => api.delete(`/invoice/product/${id}`)));
        await fetchData();
        setSelectedProducts([]);
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: `${selectedProducts.length} produto(s) excluído(s) com sucesso!`,
        });
      }, "deleteMultipleProducts").catch((error) => {
        console.error("Erro ao excluir produtos:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Não foi possível excluir os produtos.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Tem certeza?",
      text: "Você não poderá reverter esta ação!",
      icon: "warning",
      showCancelButton: true,
      buttonsStyling: false, // desativa os estilos padrões do SweetAlert2
      customClass: {
        confirmButton: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded font-semibold mr-2",
        cancelButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
      },
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      await executeAction(async () => {
        await api.delete(`/invoice/product/${id}`);
        await fetchData();
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Produto excluído permanentemente.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto excluído permanentemente!",
        });
      }, `deleteProduct-${id}`).catch((error) => {
        console.error("Erro ao excluir produto:", error);
        Swal.fire({
          icon: "error",
          title: "Erro!",
          text: "Não foi possível excluir o produto.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
      });
    }
  };

  const handleSave = async () => {
    if (isActionLoading) return;
    if (!currentProduct) return;

    await executeAction(async () => {
      const trimmedName = currentProduct.name.trim();
      const trimmedCode = currentProduct.code.trim();
      if (trimmedName === "" || trimmedCode === "") {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Nome e código do produto são obrigatórios.",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }

      // Validar se já existe produto com o mesmo nome (case-insensitive) ou código
      const existingProduct = products.find(
        (p) =>
          p.id !== currentProduct.id && // Não verificar o próprio produto se estiver editando
          (p.name.toLowerCase() === trimmedName.toLowerCase() || p.code === trimmedCode)
      );

      if (existingProduct) {
        Swal.fire({
          icon: "error",
          title: "Produto duplicado!",
          text: `Já existe um produto com o nome "${existingProduct.name}" ou código "${existingProduct.code}".`,
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
          },
        });
        return;
      }

      try {
      if (currentProduct.id) {
        await api.patch(`/invoice/product/${currentProduct.id}`, currentProduct);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Produto atualizado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto atualizado com sucesso!",
        });
      } else {
        await api.post("/invoice/product", currentProduct);
        // Swal.fire({
        //   icon: "success",
        //   title: "Sucesso!",
        //   text: "Produto criado com sucesso.",
        //   confirmButtonText: "Ok",
        //   buttonsStyling: false,
        //   customClass: {
        //     confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
        //   },
        // });
        setOpenNotification({
          type: "success",
          title: "Sucesso!",
          notification: "Produto criado com sucesso!",
        });
      }
        await fetchData();
        setShowModal(false);
        setCurrentProduct(null);
      } catch (error: any) {
        console.error("Erro ao salvar produto:", error);
        const errorMessage = error?.response?.data?.message || error?.message || "Não foi possível salvar o produto.";

        // Se o erro for de produto duplicado, mostrar mensagem específica
        if (error?.response?.status === 409 || errorMessage.includes("já existe")) {
          Swal.fire({
            icon: "error",
            title: "Produto duplicado!",
            text: errorMessage || "Já existe um produto com este nome ou código.",
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
            },
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Erro!",
            text: errorMessage,
            buttonsStyling: false,
            customClass: {
              confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
            },
          });
        }
      }
    }, "saveProduct").catch((error: any) => {
      console.error("Erro no executeAction:", error);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      {/* Barra de busca – sempre visível no topo */}
      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <label className="block text-sm font-medium text-blue-800 mb-2">Buscar produto por nome ou código</label>
        <div className="flex items-center gap-3">
          <Search size={20} className="text-blue-600 flex-shrink-0" />
          <input
            type="text"
            placeholder="Digite nome ou código (ex: AIRPODS, 174)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 min-w-[220px] max-w-lg border border-blue-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
          />
          {searchInput.trim() && (
            <span className="text-sm font-medium text-blue-700 whitespace-nowrap">
              {products.length} resultado{products.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Boxes className="mr-2 inline" size={18} />
          Cadastro de Produtos
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {selectedProducts.length > 0 && (
            <button
              onClick={handleDeleteMultiple}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
              disabled={isActionLoading}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2" size={16} />
              )}
              Excluir Selecionados ({selectedProducts.length})
            </button>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "code")}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
            >
              <option value="name">Nome (Alfabético)</option>
              <option value="code">Código</option>
            </select>
          </div>
          <button
            onClick={async () => {
              // Sugestão local imediata (evita travar UI), substituída pelo backend em seguida
              let maiorCodigo = 0;
              products.forEach((p) => {
                const numero = parseInt(p.code);
                if (!isNaN(numero) && numero > maiorCodigo) {
                  maiorCodigo = numero;
                }
              });

              setCurrentProduct({
                id: "",
                name: "",
                code: String(maiorCodigo + 1),
                priceweightAverage: 0,
                weightAverage: 0,
                description: "",
              });
              setShowModal(true);

              // Buscar do backend o próximo código levando em conta TODOS os produtos
              // (inclusive inativos / fora da página atual). Isso evita colisão.
              try {
                const { data } = await api.get("/invoice/product/next-code");
                if (data?.code) {
                  setCurrentProduct((prev) =>
                    prev ? { ...prev, code: data.code } : prev
                  );
                }
              } catch (err) {
                console.warn(
                  "Falha ao consultar /invoice/product/next-code, usando sugestão local",
                  err
                );
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center shadow-sm"
            disabled={isLoading || isActionLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
            Novo Produto
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Médio ($)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso Médio (kg)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {isLoading ? "Carregando..." : searchInput.trim() ? "Nenhum produto encontrado para o filtro." : "Nenhum produto cadastrado"}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  // Renderizar todos os produtos, independente do active
                  // (o filtro active !== false estava escondendo produtos)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        R$ {product.priceweightAverage.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {product.weightAverage.toFixed(2)} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          disabled={isActionLoading}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isActionLoading}
                        >
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && currentProduct && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-100">
            <h3 className="text-lg font-medium mb-4">{currentProduct.id ? "Editar Produto" : "Novo Produto"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => {
                    const cursorPosition = e.target.selectionStart;
                    const newValue = e.target.value.toUpperCase();
                    setCurrentProduct({ ...currentProduct, name: newValue });
                    // Restaurar posição do cursor após atualização
                    setTimeout(() => {
                      const input = e.target as HTMLInputElement;
                      if (input) {
                        input.setSelectionRange(cursorPosition, cursorPosition);
                      }
                    }, 0);
                  }}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isActionLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={currentProduct.code}
                  disabled // <- campo agora é somente leitura
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço ($)</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={currentProduct.priceweightAverage === 0 ? "" : String(currentProduct.priceweightAverage)}
                    onChange={(e) => {
                      const value = e.target.value.replace(",", "."); // permite , ou .
                      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                        setCurrentProduct({
                          ...currentProduct,
                          priceweightAverage: value === "" ? 0 : parseFloat(value),
                        });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="text"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={currentProduct.weightAverage === 0 ? "" : String(currentProduct.weightAverage)}
                    onChange={(e) => {
                      const value = e.target.value.replace(",", ".");
                      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
                        setCurrentProduct({
                          ...currentProduct,
                          weightAverage: value === "" ? 0 : parseFloat(value),
                        });
                      }
                    }}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={currentProduct.description}
                  onChange={(e) => {
                    const cursorPosition = e.target.selectionStart;
                    const newValue = e.target.value.toUpperCase();
                    setCurrentProduct({ ...currentProduct, description: newValue });
                    // Restaurar posição do cursor após atualização
                    setTimeout(() => {
                      const textarea = e.target as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.setSelectionRange(cursorPosition, cursorPosition);
                      }
                    }, 0);
                  }}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-400 focus:border-blue-300"
                  disabled={isActionLoading}
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50"
                disabled={isActionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-600"
                disabled={isActionLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
