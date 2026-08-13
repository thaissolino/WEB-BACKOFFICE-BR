import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import CreateStoreClassic from "./CreateStoreClassic";
import PremiumCreateStore from "./PremiumCreateStore";

export default function CreateStore() {
  const premium = usePremiumPage("storeCreate");
  return premium ? <PremiumCreateStore /> : <CreateStoreClassic />;
}
