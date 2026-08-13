import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import ContactsClassic from "./ContactsClassic";
import PremiumUsers from "./PremiumUsers";

export default function Contacts() {
  const premium = usePremiumPage("users");
  return premium ? <PremiumUsers /> : <ContactsClassic />;
}
