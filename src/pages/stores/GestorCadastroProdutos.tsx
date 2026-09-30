import GestaoShell from "../gestor/GestaoShell";
import { ProductsTab } from "../gestao-invoices/components/sections/ProductsTab";

/**
 * Cadastro produtos (Gestão) — mesma lista das invoices, com foto.
 */
export default function GestorCadastroProdutos() {
  return (
    <GestaoShell
      title="Cadastro produtos"
      subtitle="Lista do catálogo. Dá para adicionar, alterar e apagar a foto, e inativar o produto."
    >
      <ProductsTab />
    </GestaoShell>
  );
}
