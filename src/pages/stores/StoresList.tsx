import { useLocation } from "react-router-dom";
import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import StoresListClassic from "./StoresListClassic";
import PremiumStoresList from "./PremiumStoresList";

export default function StoresList() {
  const { pathname } = useLocation();
  const pageKey = pathname.startsWith("/gerenciar-lojistas") ? "gestorGerenciarLojistas" : "stores";
  const premium = usePremiumPage(pageKey);
  return premium ? <PremiumStoresList /> : <StoresListClassic />;
}
