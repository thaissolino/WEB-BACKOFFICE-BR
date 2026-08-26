import GestaoShell from "../gestor/GestaoShell";
import { ProductsTab } from "../gestao-invoices/components/sections/ProductsTab";

/**
 * Cadastro produtos (Gestão) — usa a base OFICIAL de produtos das invoices
 * (mesma tabela/API do Gerenciar Invoices: /invoice/product).
 * Somente a Central cadastra produtos; o lojista apenas consome no PDV.
 */
export default function GestorCadastroProdutos() {
  return (
    <GestaoShell
      title="Cadastro produtos"
      subtitle="Base oficial de produtos das invoices. Tudo que é cadastrado aqui vale para as invoices e para o PDV."
      badge="Somente a Central cadastra produtos — lojistas apenas consomem no PDV"
    >
      <ProductsTab />
    </GestaoShell>
  );
}
