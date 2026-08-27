import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useClientAuth } from "../../../hooks/clientAuth";
import PdvShell, { PdvLoading } from "../dashboard/PdvShell";
import "./cadastros.css";

export default function CadastroShell({ children }: { children: ReactNode }) {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/lojista" replace />;

  return <PdvShell variant="form">{children}</PdvShell>;
}
