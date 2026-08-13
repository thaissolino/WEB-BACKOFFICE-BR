import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import StoreDetailClassic from "./StoreDetailClassic";
import PremiumStoreDetail from "./PremiumStoreDetail";

export default function StoreDetail() {
  const premium = usePremiumPage("stores");
  return premium ? <PremiumStoreDetail /> : <StoreDetailClassic />;
}
