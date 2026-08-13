import { usePremiumPage } from "../../components/premium/PremiumPageShell"
import StoreLojaClassic from "./StoreLojaClassic"
import PremiumStoreLoja from "./PremiumStoreLoja"

export default function StoreLoja() {
  const premium = usePremiumPage("stores")
  return premium ? <PremiumStoreLoja /> : <StoreLojaClassic />
}
