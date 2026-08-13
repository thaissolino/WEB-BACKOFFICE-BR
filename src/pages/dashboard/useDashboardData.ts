import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useAuthBackoffice } from "../../hooks/authBackoffice";

export type DashboardUser = {
  id: string;
  name: string;
  userName: string;
  role: string;
  status: string;
  created_at: string;
};

export function formatUserName(name: string) {
  if (!name) return "Usuário";
  const nameParts = name.split(" ");
  if (nameParts.length === 1) return nameParts[0];
  if (nameParts.length === 2) return `${nameParts[0]} ${nameParts[1]}`;
  const first = nameParts[0];
  const secondInitial = nameParts[1] ? `${nameParts[1][0]}.` : "";
  const last = nameParts[nameParts.length - 1];
  return `${first} ${secondInitial} ${last}`;
}

export function useDashboardData() {
  const { user } = useAuthBackoffice();
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalGrupos, setTotalGrupos] = useState(0);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("@backoffice:token");
        if (!token) {
          setError("Sessão não encontrada.");
          return;
        }

        const response = await api.get("/graphic", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const responseGroups = await api.get("/group/list-all", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(response.data);
        setTotalGrupos(responseGroups.data.length);
        setTotalUsuarios(response.data.length);
      } catch (_err) {
        setError("Não foi possível carregar os números do backoffice.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return {
    user,
    users,
    totalUsuarios,
    totalGrupos,
    totalChamadas: "431,225",
    totalMensagens: "1,325,134",
    loading,
    error,
  };
}
