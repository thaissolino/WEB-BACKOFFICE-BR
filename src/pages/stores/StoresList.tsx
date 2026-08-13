import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import StoresListClassic from "./StoresListClassic";
import PremiumStoresList from "./PremiumStoresList";

export default function StoresList() {
  const premium = usePremiumPage("stores");
  return premium ? <PremiumStoresList /> : <StoresListClassic />;
}
