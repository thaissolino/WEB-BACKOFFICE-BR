import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Boxes } from "lucide-react";
import Swal from "sweetalert2";

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  weight: number;
  description: string;
}

export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('registeredProducts');
    if (saved) {
      setProducts(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('registeredProducts', JSON.stringify(products));
  }, [products]);

  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Excluir produto?",
      text: "Todos os dados deste produto serão perdidos!",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar exclusão",
    });

    if (result.isConfirmed) {
      try {
        const updated = products.filter((product) => product.id !== id);
        setProducts(updated);
        await Swal.fire("Sucesso!", "Produto excluído permanentemente.", "success");
      } catch (error) {
        Swal.fire("Erro!", "Não foi possível excluir o produto.", "error");
      }
    }
  };

  const handleSave = () => {
    if (!currentProduct) return;

    const trimmedName = currentProduct.name.trim();
    if (trimmedName === "") {
      Swal.fire("Erro", "O nome do produto é obrigatório.", "error");
      return;
    }

    if (currentProduct.id) {
      setProducts(products.map((p) => (p.id === currentProduct.id ? currentProduct : p)));
    } else {
      const newProduct = {
        ...currentProduct,
        id: Date.now().toString(),
        code: `P${Date.now().toString().slice(-4)}`,
      };
      setProducts([...products, newProduct]);
    }

    setShowModal(false);
    setCurrentProduct(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          <Boxes className="mr-2 inline" size={18} /> Cadastro de Produtos
        </h2>
        <button
          onClick={() => {
            setCurrentProduct({
              id: "",
              name: "",
              code: `P${Date.now().toString().slice(-4)}`,
              price: 0,
              weight: 0,
              description: "",
            });
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <Plus className="mr-2 inline" size={16} /> Novo Produto
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Médio ($)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Médio (kg)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Nenhum produto cadastrado
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {product.weight.toFixed(2)} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && currentProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {currentProduct.id ? "Editar Produto" : "Novo Produto"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço ($)</label>
                  <input
                    type="number"
                    value={currentProduct.price}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={currentProduct.weight}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={currentProduct.description}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
