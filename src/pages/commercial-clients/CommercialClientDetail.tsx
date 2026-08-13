import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import CommercialClientDetailClassic from "./CommercialClientDetailClassic";
import PremiumCommercialClientDetail from "./PremiumCommercialClientDetail";

export default function CommercialClientDetail() {
  const premium = usePremiumPage("commercialClients");
  return premium ? <PremiumCommercialClientDetail /> : <CommercialClientDetailClassic />;
}
