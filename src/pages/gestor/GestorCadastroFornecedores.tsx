import GestaoShell from "./GestaoShell";
import { SuppliersTab } from "../gestao-invoices/components/sections/SuppliersTab";

/**
 * Cadastro fornecedores (Gestão) — fornecedores da CENTRAL, base das invoices
 * (mesma API do Gerenciar Invoices: /invoice/supplier).
 * Estes fornecedores NÃO aparecem para lojistas; o lojista tem os fornecedores
 * particulares dele no PDV (/client/fornecedores). As invoices continuam usando
 * somente os fornecedores desta base — nada é misturado com os do PDV.
 */
export default function GestorCadastroFornecedores() {
  return (
    <GestaoShell
      title="Cadastro fornecedores"
      subtitle="Fornecedores da Central (base das invoices). As invoices usam somente esta base."
      badge="Exclusivo da Central — não aparece para lojistas no PDV"
    >
      <SuppliersTab />
    </GestaoShell>
  );
}
