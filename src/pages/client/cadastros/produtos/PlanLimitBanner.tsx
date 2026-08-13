import { AlertTriangle } from "lucide-react";

export default function PlanLimitBanner({
  entity = "Produto",
  planName,
  contractedQty,
  usedQty,
}: {
  entity?: string;
  planName: string;
  contractedQty: string;
  usedQty: string;
}) {
  return (
    <aside className="pdv-prod-banner" role="status">
      <AlertTriangle size={28} strokeWidth={2.2} aria-hidden="true" />
      <div>
        <p>
          <strong>Seu plano atingiu o limite disponível para cadastro de {entity}.</strong>
        </p>
        <p>Plano Contratado: {planName}</p>
        <p>Quantidade contratada: {contractedQty}</p>
        <p>Quantidade utilizado: {usedQty}</p>
      </div>
    </aside>
  );
}
