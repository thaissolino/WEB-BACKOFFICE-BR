import { useEffect, useState } from "react";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api } from "../../services/api";

type GroupRow = {
  id: number;
  owner: string;
  createdAt: string;
  name: string;
  description: string;
  users: number;
  id_group: string;
};

export default function PremiumTeam() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [toast, setToast] = useState({ open: false, message: "" });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");
        const response = await api.get("/group/list-all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const formattedData = response.data.map((group: any, index: number) => ({
          id: index + 1,
          owner: group.ownerUserName,
          createdAt: group.created_at,
          name: group.name,
          description: group.description,
          users: group.members.length,
          id_group: group.id,
        }));
        setRows(formattedData);
      } catch {
        setToast({ open: true, message: "Erro ao buscar os grupos." });
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  return (
    <PremiumStage title="Grupos" hint={`${rows.length} núcleos na rede.`}>
      <section className="br-panel">
        {loading ? <p className="br-empty">Carregando grupos…</p> : null}
        {!loading && rows.length === 0 ? <p className="br-empty">Nenhum grupo na rede.</p> : null}
        {!loading && rows.length > 0 ? (
          <div className="br-list">
            {rows.map((group) => (
              <div className="br-row" key={group.id_group}>
                <div className="br-row-main">
                  <strong>{group.name}</strong>
                  <small>
                    {group.description || "Sem descrição"} · {group.owner || "—"} · {group.users} contas
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}
