import { useEffect, useState } from "react";
import { BrToast, PremiumStage } from "../../components/premium/PremiumStage";
import { api } from "../../services/api";

type StatusFilter = "ALL" | "PENDING" | "ACTIVE" | "INACTIVE";
type RowData = {
  idGraphic: string;
  userName: string;
  id: number;
  name: string;
  status: string;
  created_at: string;
  role: string;
  blocked: boolean;
  counter: number;
  connectedDevices: number;
  devices: { type: string; browser: string; lastActive: string }[];
};

export default function PremiumUsers() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [toast, setToast] = useState({ open: false, message: "" });
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RowData | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const normalizeStatus = (status?: string) => String(status || "").trim().toUpperCase();

  const handleRemoveDevice = (userName: string, deviceType: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.userName !== userName) return row;
        const devices = row.devices.filter((d) => d.type !== deviceType);
        return { ...row, devices, connectedDevices: devices.length };
      }),
    );
    if (selectedUser) {
      const devices = selectedUser.devices.filter((d) => d.type !== deviceType);
      setSelectedUser({ ...selectedUser, devices, connectedDevices: devices.length });
    }
  };

  const handleResetDevices = async (userName: string) => {
    try {
      const token = localStorage.getItem("@backoffice:token");
      if (!token) return;
      await api.delete(`/userDevices/userGraphicDevice/${userName}`, { headers: { Authorization: `Bearer ${token}` } });
      setRows((prevRows) => prevRows.map((row) => (row.userName !== userName ? row : { ...row, devices: [], connectedDevices: 0 })));
      setToast({ open: true, message: `Dispositivos do usuário ${userName} resetados com sucesso.` });
    } catch {
      setToast({ open: true, message: `Erro ao resetar dispositivos do usuário ${userName}.` });
    }
  };

  const handleToggleStatus = async (row: RowData) => {
    const nextStatus = row.status?.toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const token = localStorage.getItem("@backoffice:token");
      if (!token) return;
      const candidateRoutes = [`/graphic/status/${row.idGraphic}`, `/graphic/${row.idGraphic}/status`, `/status/${row.idGraphic}`];
      let updated = false;
      let lastError: any = null;
      for (const route of candidateRoutes) {
        try {
          await api.patch(route, { status: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
          updated = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (err?.response?.status !== 404) throw err;
        }
      }
      if (!updated) throw lastError || new Error("Nenhuma rota de atualização de status disponível.");
      setRows((prevRows) => prevRows.map((item) => (item.idGraphic === row.idGraphic ? { ...item, status: nextStatus } : item)));
      setToast({
        open: true,
        message: nextStatus === "ACTIVE" ? `Usuário ${row.userName} ativado com sucesso.` : `Usuário ${row.userName} desativado com sucesso.`,
      });
    } catch (error: any) {
      setToast({
        open: true,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.details ||
          (error?.response?.status === 404
            ? "Rota de atualização de status não encontrada no backend."
            : `Erro ao atualizar status do usuário ${row.userName}.`),
      });
    }
  };

  const handleDelete = async (userName: string) => {
    try {
      const token = localStorage.getItem("@backoffice:token");
      if (!token) return;
      await api.delete("/graphic/delete", { data: { userName }, headers: { Authorization: `Bearer ${token}` } });
      setRows((prevRows) => prevRows.filter((row) => row.userName !== userName));
      setToast({ open: true, message: `Usuário ${userName} excluído com sucesso.` });
    } catch {
      setToast({ open: true, message: `Erro ao excluir o usuário ${userName}.` });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");
        if (!token) return;
        const response = await api.get("/graphic", { headers: { Authorization: `Bearer ${token}` } });
        setRows(
          response.data.map((item: any, index: number) => ({
            idGraphic: item.id,
            id: index + 1,
            name: item.name,
            userName: item.userName,
            status: item.status,
            created_at: item.created_at,
            blocked: item.blocked,
            counter: item.counter,
            role: item.role === "MANAGER" ? "LÍDER DE GRUPOS" : "USUÁRIO",
            connectedDevices: item.devices.length,
            devices: item.devices || [],
          })),
        );
      } catch {
        setToast({ open: true, message: "Erro ao buscar usuários." });
      }
    };
    fetchData();
  }, []);

  const pendingCount = rows.filter((row) => normalizeStatus(row.status).startsWith("PENDING")).length;
  const activeCount = rows.filter((row) => normalizeStatus(row.status) === "ACTIVE").length;
  const inactiveCount = rows.filter((row) => normalizeStatus(row.status) === "INACTIVE").length;
  const rowsOrderedByPriority = [...rows].sort((a, b) => {
    const aPending = normalizeStatus(a.status).startsWith("PENDING") ? 0 : 1;
    const bPending = normalizeStatus(b.status).startsWith("PENDING") ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return a.id - b.id;
  });
  const filteredRows = rowsOrderedByPriority
    .filter((row) => row.userName.toLowerCase().includes(search.toLowerCase()))
    .filter((row) => {
      const normalizedStatus = normalizeStatus(row.status);
      if (statusFilter === "PENDING") return normalizedStatus.startsWith("PENDING");
      if (statusFilter === "ACTIVE") return normalizedStatus === "ACTIVE";
      if (statusFilter === "INACTIVE") return normalizedStatus === "INACTIVE";
      return true;
    });

  return (
    <PremiumStage title="Usuários" hint="Pendentes no topo. Ative, limpe dispositivos ou exclua na linha.">
      <section className="br-panel">
        <div className="br-toolbar">
          <label className="br-field">
            <span>Apelido</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
          </label>
          <div className="br-seg" role="tablist" aria-label="Filtro de status">
            <button type="button" role="tab" aria-pressed={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
              Todos {rows.length}
            </button>
            <button type="button" role="tab" aria-pressed={statusFilter === "PENDING"} onClick={() => setStatusFilter("PENDING")}>
              Pendentes {pendingCount}
            </button>
            <button type="button" role="tab" aria-pressed={statusFilter === "ACTIVE"} onClick={() => setStatusFilter("ACTIVE")}>
              Ativos {activeCount}
            </button>
            <button type="button" role="tab" aria-pressed={statusFilter === "INACTIVE"} onClick={() => setStatusFilter("INACTIVE")}>
              Inativos {inactiveCount}
            </button>
          </div>
        </div>
      </section>

      <section className="br-panel">
        {filteredRows.length === 0 ? <p className="br-empty">Nenhuma conta neste recorte.</p> : null}
        {filteredRows.length > 0 ? (
          <div className="br-list">
            {filteredRows.map((row) => (
              <div className="br-row" key={row.idGraphic}>
                <div className="br-row-main">
                  <strong>{row.userName}</strong>
                  <small>
                    <span className="br-pip" data-on={normalizeStatus(row.status) === "ACTIVE" ? "true" : "false"}>
                      {row.status}
                    </span>
                    {" · "}
                    {row.name} · {row.role} · {new Date(row.created_at).toLocaleDateString("pt-BR")} · {row.connectedDevices}/2 aparelhos
                  </small>
                </div>
                <div className="br-row-actions">
                  <button className="br-btn" type="button" onClick={() => handleToggleStatus(row)}>
                    {normalizeStatus(row.status) === "ACTIVE" ? "Desativar" : "Ativar"}
                  </button>
                  <button className="br-btn" type="button" onClick={() => handleResetDevices(row.userName)}>
                    Limpar
                  </button>
                  <button
                    className="br-btn"
                    type="button"
                    onClick={() => {
                      setSelectedUser(row);
                      setDeviceModalOpen(true);
                    }}
                  >
                    Ver
                  </button>
                  <button className="br-btn br-btn-danger" type="button" onClick={() => handleDelete(row.userName)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {deviceModalOpen && selectedUser ? (
        <div className="br-dialog" role="dialog" aria-modal="true" aria-labelledby="dispositivos-titulo">
          <div className="br-dialog-card">
            <h2 id="dispositivos-titulo">Dispositivos</h2>
            <p className="br-seg-hint">{selectedUser.devices.length}/2</p>
            {selectedUser.devices.length === 0 ? <p className="br-empty">Nenhum aparelho.</p> : null}
            {selectedUser.devices.map((device) => (
              <div className="br-switch" key={device.type}>
                <div>
                  <strong>{device.type === "PC" ? "Computador" : "Mobile"}</strong>
                  <p>
                    {device.browser} · {device.lastActive}
                  </p>
                </div>
                <button className="br-btn br-btn-danger" type="button" onClick={() => handleRemoveDevice(selectedUser.userName, device.type)}>
                  Remover
                </button>
              </div>
            ))}
            <div className="br-actions" style={{ marginTop: 12 }}>
              <button
                className="br-btn"
                type="button"
                onClick={() => {
                  setDeviceModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BrToast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: "" })} />
    </PremiumStage>
  );
}
