import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Boxes, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { api } from "../../../../services/api";

export interface Product {
  id: string;
  name: string;
  code: string;
  priceweightAverage: number;
  weightAverage: number;
  description: string;
  active?: boolean;
}

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Product[]>("/invoice/product");
      setProducts(response.data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setShowModal(true);
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
      setIsSubmitting(true);
      try {
        await api.delete(`/invoice/product/${id}`);
        await fetchData();
        Swal.fire({
          icon: "success",
          title: "Sucesso!",
          text: "Produto excluído permanentemente.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
          },
        });
      } catch (error) {
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
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSave = async () => {
    if (!currentProduct) return;

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

    setIsSubmitting(true);
    try {
      if (currentProduct.id) {
        await api.patch(`/invoice/product/${currentProduct.id}`, currentProduct);
        Swal.fire({
          icon: "success",
          title: "Sucesso!",
          text: "Produto atualizado com sucesso.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
          },
        });
      } else {
        await api.post("/invoice/product", currentProduct);
        Swal.fire({
          icon: "success",
          title: "Sucesso!",
          text: "Produto criado com sucesso.",
          confirmButtonText: "Ok",
          buttonsStyling: false,
          customClass: {
            confirmButton: "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded font-semibold",
          },
        });
      }
      await fetchData();
      setShowModal(false);
      setCurrentProduct(null);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      Swal.fire({
        icon: "error",
        title: "Erro!",
        text: "Não foi possível salvar o produto.",
        buttonsStyling: false,
        customClass: {
          confirmButton: "bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded font-semibold",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Boxes className="mr-2 inline" size={18} />
          Cadastro de Produtos
        </h2>
        <button
          onClick={() => {
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
              code: String(maiorCodigo + 1), // código seguro e automático
              priceweightAverage: 0,
              weightAverage: 0,
              description: "",
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
          disabled={isLoading || isSubmitting}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" size={16} />}
          Novo Produto
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {isLoading ? "Carregando..." : "Nenhum produto cadastrado"}
                  </td>
                </tr>
              ) : (
                products.map(
                  (product) =>
                    product.active !== false && (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.name}
                        </td>
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
                            disabled={isSubmitting}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </td>
                      </tr>
                    )
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && currentProduct && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">{currentProduct.id ? "Editar Produto" : "Novo Produto"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={currentProduct.code}
                  disabled // <- campo agora é somente leitura
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 cursor-not-allowed"
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
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={currentProduct.description}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center"
                disabled={isSubmitting}
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
