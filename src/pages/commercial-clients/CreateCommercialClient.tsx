import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import CreateCommercialClientClassic from "./CreateCommercialClientClassic";
import PremiumCreateCommercialClient from "./PremiumCreateCommercialClient";

export default function CreateCommercialClient() {
  const premium = usePremiumPage("commercialClientCreate");
  return premium ? <PremiumCreateCommercialClient /> : <CreateCommercialClientClassic />;
}
