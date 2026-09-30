import GestaoShell from "../gestor/GestaoShell";
import CatalogoProdutos from "./CatalogoProdutos";

/**
 * Cadastro produtos (Gestão) — catálogo com foto da mesma base das invoices.
 */
export default function GestorCadastroProdutos() {
  return (
    <GestaoShell
      title="Catálogo de produtos"
      subtitle="Lista com foto. Dá para adicionar, alterar e apagar a imagem de cada produto."
    >
      <CatalogoProdutos />
    </GestaoShell>
  );
}
