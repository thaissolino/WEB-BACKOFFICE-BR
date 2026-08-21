import { useLocation } from "react-router-dom";
import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import CreateStoreClassic from "./CreateStoreClassic";
import PremiumCreateStore from "./PremiumCreateStore";

export default function CreateStore() {
  const { pathname } = useLocation();
  const pageKey = pathname.startsWith("/cadastro-lojistas") ? "gestorCadastroLojistas" : "storeCreate";
  const premium = usePremiumPage(pageKey);
  return premium ? <PremiumCreateStore /> : <CreateStoreClassic />;
}
