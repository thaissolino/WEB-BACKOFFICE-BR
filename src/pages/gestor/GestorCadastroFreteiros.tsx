import GestaoShell from "./GestaoShell";
import { CarriersTab } from "../gestao-invoices/components/sections/CarriersTab";

/**
 * Cadastro freteiros (Gestão) — mesma base/API do Gerenciar Invoices
 * (/invoice/carriers). Lista os existentes por padrão e permite adicionar novos.
 */
export default function GestorCadastroFreteiros() {
  return (
    <GestaoShell
      title="Cadastro freteiros"
      subtitle="Freteiros da base das invoices. Os que já existem aparecem listados; use Novo Freteiro para adicionar."
    >
      <CarriersTab />
    </GestaoShell>
  );
}
