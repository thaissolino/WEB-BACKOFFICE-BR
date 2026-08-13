import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { PremiumStage } from "../../components/premium/PremiumStage"
import { api } from "../../services/api"
import StoreLojaForm from "./loja/StoreLojaForm"
import type { StoreOption } from "./loja/types"

export default function PremiumStoreLoja() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stores, setStores] = useState<StoreOption[]>([])

  useEffect(() => {
    api
      .get("/backoffice/stores")
      .then(({ data }) => setStores(data.stores || []))
      .catch(() => setStores([]))
  }, [])

  if (!id) return null

  return (
    <PremiumStage title="LOJA" hint="Parâmetros da loja">
      <StoreLojaForm
        storeId={id}
        apiBase="/backoffice/stores"
        stores={stores}
        onStoreChange={(nextId) => navigate(`/lojas/${nextId}`)}
        extraActions={
          <button className="loja-btn" type="button" onClick={() => navigate(`/lojas/${id}/estoque`)}>
            Estoque desta loja
          </button>
        }
      />
    </PremiumStage>
  )
}
