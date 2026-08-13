import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import StockOverviewClassic from "./StockOverviewClassic";
import PremiumStockOverview from "./PremiumStockOverview";

export default function StockOverview() {
  const premium = usePremiumPage("stock");
  return premium ? <PremiumStockOverview /> : <StockOverviewClassic />;
}
