import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import CommercialClientsListClassic from "./CommercialClientsListClassic";
import PremiumCommercialClientsList from "./PremiumCommercialClientsList";

export default function CommercialClientsList() {
  const premium = usePremiumPage("commercialClients");
  return premium ? <PremiumCommercialClientsList /> : <CommercialClientsListClassic />;
}
