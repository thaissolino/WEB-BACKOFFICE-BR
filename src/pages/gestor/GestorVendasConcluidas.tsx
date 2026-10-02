import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, Truck, X } from "lucide-react";
import { api, parseError } from "../../services/api";
import { printNotinha } from "../../lib/notinhaZebra";
import GestaoShell from "./GestaoShell";

type Line = {
  id: string;
  name: string;
  code: string;
  price: number;
  qty: number;
  imeis?: string[];
};

type Address = {
  titulo?: string;
  nome?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  obs?: string;
};

type Buyer = {
  id: string;
  name: string;
  email: string;
  username: string;
  document: string;
};

type ConferenceRead = {
  code: string;
  name: string;
  at: string;
};

type ImeiSuggestion = {
  imei: string;
  productName: string;
  invoiceNumber: string;
  code: string;
};

type ClosedSale = {
  id: string;
  lines: Line[];
  address: Address;
  total: number;
  observacao: string;
  createdAt: string;
  closedAt: string | null;
  client: Buyer | null;
  dispatchStatus: "A ENVIAR" | "EM SEPARAÇÃO" | "ENVIADO";
  conference: {
    reads: ConferenceRead[];
    imeis: string[];
  };
  blockers: string[];
  devices?: { imei: string; code: string; name: string }[];
  estornada?: boolean;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

function orderCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function readsOf(order: ClosedSale, line: Line) {
  const code = (line.code || "").trim().toUpperCase();
  return (order.conference?.reads || []).filter((read) => (read.code || "").trim().toUpperCase() === code).length;
}

function serialsOf(order: ClosedSale, line: Line) {
  const code = (line.code || "").trim().toUpperCase();
  const linked = (order.devices || [])
    .filter((device) => (device.code || "").trim().toUpperCase() === code)
    .map((device) => device.imei)
    .filter(Boolean);
  if (linked.length) return linked;
  return (line.imeis || []).filter(Boolean);
}

function serialList(serials: string[]) {
  return serials.join(" | ");
}

function shown(value?: string | null) {
  const text = (value || "").trim();
  return text || "—";
}

function beep(ok: boolean) {
  try {
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.08);
    window.setTimeout(() => context.close(), 200);
  } catch {
    /* o bip é só um aviso; a mensagem na tela é o que vale */
  }
}

function writtenNote(value: string) {
  return (value || "")
    .replace(/\d{8,}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function statusLabel(status?: string, estornada?: boolean) {
  if (estornada) return "Estornada";
  if (status === "ENVIADO" || status === "CONFERIDO") return "Concluído";
  return "Em separação";
}

function isSent(status?: string) {
  return status === "ENVIADO" || status === "CONFERIDO";
}

function StatusBadge({ status, estornada }: { status: string; estornada?: boolean }) {
  const tone = estornada ? "bg-red-700 text-white" : isSent(status) ? "bg-green-700 text-white" : "bg-yellow-400 text-yellow-950";
  return <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold leading-none ${tone}`}>{statusLabel(status, estornada)}</span>;
}

function addressLine(address?: Address) {
  if (!address) return "—";
  const street = [address.rua, address.numero, address.bairro].filter(Boolean).join(", ");
  const city = [address.cidade, address.cep].filter(Boolean).join(" · ");
  return [address.titulo, address.nome, street, city].filter(Boolean).join(" — ") || "—";
}

export default function GestorVendasConcluidas() {
  const [orders, setOrders] = useState<ClosedSale[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [conferenceId, setConferenceId] = useState("");
  const [imeiCode, setImeiCode] = useState("");
  const [obsDraft, setObsDraft] = useState("");
  const [imeiSuggestions, setImeiSuggestions] = useState<ImeiSuggestion[]>([]);
  const [imeiMenuOpen, setImeiMenuOpen] = useState(false);
  const imeiBoxRef = useRef<HTMLDivElement>(null);
  const obsFocused = useRef(false);
  const [notice, setNotice] = useState("");
  const [concludedNotice, setConcludedNotice] = useState("");
  const [acting, setActing] = useState(false);
  const [openSerials, setOpenSerials] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [zebraNotice, setZebraNotice] = useState("");
  const imeiRef = useRef<HTMLInputElement>(null);

  async function load(term = search) {
    setIsLoading(true);
    try {
      const { data } = await api.get("/backoffice/vendas-concluidas", {
        params: term.trim() ? { search: term.trim() } : undefined,
      });
      const next = (data?.orders || []) as ClosedSale[];
      setOrders(next);
      setSelectedId((current) => (next.some((order) => order.id === current) ? current : ""));
      setConferenceId((current) => (next.some((order) => order.id === current) ? current : ""));
      setError("");
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível carregar as vendas concluídas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    load(search);
  }

  const conference = useMemo(
    () => orders.find((order) => order.id === conferenceId) || null,
    [orders, conferenceId],
  );

  useEffect(() => {
    if (conferenceId) imeiRef.current?.focus();
  }, [conferenceId]);

  useEffect(() => {
    if (!conferenceId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [conferenceId]);

  useEffect(() => {
    if (!conference || obsFocused.current) return;
    setObsDraft(writtenNote(conference.observacao || ""));
  }, [conference]);

  useEffect(() => {
    if (!conferenceId) return;
    const q = imeiCode.replace(/[^a-z0-9]/gi, "");
    const handle = window.setTimeout(() => {
      void loadImeiSuggestions(conferenceId, q.length >= 3 ? q : undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [conferenceId, imeiCode]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (imeiBoxRef.current && !imeiBoxRef.current.contains(event.target as Node)) {
        setImeiMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function openConference(id: string) {
    setSelectedId(id);
    setConferenceId(id);
    setNotice("");
    setConcludedNotice("");
    setImeiCode("");
    setImeiMenuOpen(false);
  }

  async function loadImeiSuggestions(id: string, q?: string) {
    try {
      const { data } = await api.get(`/backoffice/vendas-concluidas/${id}/imeis`, {
        params: q ? { q } : undefined,
      });
      setImeiSuggestions((data?.imeis || []) as ImeiSuggestion[]);
    } catch {
      setImeiSuggestions([]);
    }
  }

  function pickImei(imei: string) {
    setImeiCode(imei);
    setImeiMenuOpen(false);
    act("imei", imei);
  }

  function saveObs() {
    if (!conference) return;
    const note = writtenNote(obsDraft);
    if (writtenNote(conference.observacao || "") === note) return;
    act("obs", note);
  }

  async function act(
    action: "scan" | "imei" | "reset" | "conclude" | "obs" | "autofill",
    value?: string,
    orderId?: string,
  ) {
    const id = orderId || conferenceId;
    if (!id || acting) return;
    setActing(true);
    setNotice("");
    try {
      const { data } = await api.post(`/backoffice/vendas-concluidas/${id}/conferencia`, {
        action,
        value,
      });
      const order = data.order as ClosedSale;
      setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)));
      if (action === "scan" || action === "imei") setImeiCode("");
      if (action === "conclude") {
        setConferenceId("");
        setImeiMenuOpen(false);
        setConcludedNotice("Conferência concluída. O pedido voltou para Vendas concluídas.");
      } else if (typeof data.notice === "string" && data.notice) setNotice(data.notice);
      if (action === "imei" || action === "reset" || action === "autofill") void loadImeiSuggestions(id);
      if (action !== "reset" && action !== "obs" && action !== "autofill") beep(true);
    } catch (err) {
      const parsed = parseError(err);
      setNotice(parsed.friend || parsed.message || "Não foi possível atualizar a conferência.");
      beep(false);
    } finally {
      setActing(false);
      if (action === "scan" || action === "imei" || action === "reset") imeiRef.current?.focus();
    }
  }

  async function estornar(id: string) {
    if (!window.confirm("Estornar esta venda e devolver o crédito ao cliente?")) return;
    setActing(true);
    setError("");
    try {
      const { data } = await api.post(`/backoffice/vendas-concluidas/${id}/estornar`);
      const order = data.order as ClosedSale;
      if (order?.id) setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)));
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível estornar a venda.");
    } finally {
      setActing(false);
    }
  }

  function confirmLookup(raw: string) {
    const typed = raw.trim();
    if (!typed || !conference) return;
    const key = typed.toUpperCase();
    const byCode = conference.lines.some((line) => (line.code || "").trim().toUpperCase() === key);
    setImeiMenuOpen(false);
    if (byCode) act("scan", typed);
    else act("imei", typed);
  }

  const imeiQuery = imeiCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const takenImeis = new Set((conference?.conference.imeis || []).map((item) => item.trim().toUpperCase()));
  const imeiMatches = imeiQuery
    ? imeiSuggestions
        .filter((item) => {
          if (takenImeis.has(item.imei.trim().toUpperCase())) return false;
          const serial = item.imei.replace(/[^a-z0-9]/gi, "").toUpperCase();
          if (serial.includes(imeiQuery)) return true;
          return `${item.productName} ${item.invoiceNumber}`.toUpperCase().includes(imeiQuery);
        })
        .slice(0, 12)
    : [];
  const codeMatches = imeiQuery && conference
    ? conference.lines.filter((line) => {
        const code = (line.code || "").trim().toUpperCase();
        const name = (line.name || "").toUpperCase();
        return code.includes(imeiQuery) || name.includes(imeiQuery);
      })
    : [];

  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return (
    <GestaoShell
      title="Vendas concluídas"
      subtitle="Pedidos fechados pelos lojistas. Use o endereço e os produtos para despachar."
      badge="Despacho"
    >
      {concludedNotice ? (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-4 py-3 text-green-800" role="status">
          {concludedNotice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Pedidos fechados</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{orders.length}</p>
        </div>
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Valor desta lista</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{money(total)}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Buscar venda</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded border border-gray-300 py-2 pl-9 pr-3"
            placeholder="Lojista, documento, e-mail, pedido ou produto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            load("");
          }}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </button>
      </form>

      <div className="overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="flex items-center gap-2 p-6 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Carregando vendas...
          </p>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck size={32} className="mx-auto mb-2 opacity-50" />
            <p className="font-medium">Nenhuma venda concluída ainda.</p>
            <p className="mt-1 text-sm">Quando o lojista fechar um pedido, ele aparece aqui para despacho.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Pedido</th>
                  <th className="px-4 py-3 font-semibold">Fechado em</th>
                  <th className="px-4 py-3 font-semibold">Lojista</th>
                  <th className="px-4 py-3 font-semibold">Documento</th>
                  <th className="px-4 py-3 font-semibold text-right">Itens</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Conferência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const active = order.id === selectedId;
                  const units = order.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
                  return (
                    <tr
                      key={order.id}
                      className={active ? "cursor-pointer bg-blue-50" : "cursor-pointer hover:bg-gray-50"}
                      onClick={() => {
                        if (selectedId === order.id) {
                          setSelectedId("");
                          setConferenceId("");
                          return;
                        }
                        setSelectedId(order.id);
                        if (conferenceId !== order.id) setConferenceId("");
                      }}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">{orderCode(order.id)}</td>
                      <td className="px-4 py-3 text-gray-700">{when(order.closedAt || order.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{shown(order.client?.name)}</td>
                      <td className="px-4 py-3 text-gray-700">{shown(order.client?.document)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{units}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{money(order.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.dispatchStatus || "A ENVIAR"} estornada={order.estornada} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isSent(order.dispatchStatus) || order.estornada ? null : (
                            <button
                              type="button"
                              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              style={{ color: "#ffffff", backgroundColor: "#2563eb" }}
                              onClick={(event) => {
                                event.stopPropagation();
                                openConference(order.id);
                              }}
                            >
                              Conferência
                            </button>
                          )}
                          {order.estornada ? (
                            <span className="px-1 py-1.5 text-xs font-semibold text-red-700">Estornada</span>
                          ) : (
                            <button
                              type="button"
                              className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={acting}
                              onClick={(event) => {
                                event.stopPropagation();
                                void estornar(order.id);
                              }}
                            >
                              Estornar venda
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {conference ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <section className="max-h-[90vh] overflow-y-auto overscroll-contain p-6 [scrollbar-gutter:stable]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Conferência</h2>
              <p className="text-sm text-gray-600">
                Pedido {orderCode(conference.id)} · {shown(conference.client?.name)}
              </p>
              <p className="text-sm text-gray-600">Fechado {when(conference.closedAt || conference.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={conference.dispatchStatus || "A ENVIAR"} estornada={conference.estornada} />
              <button type="button" className="text-gray-500 hover:text-gray-800" aria-label="Fechar" onClick={() => setConferenceId("")}>
                <X size={22} />
              </button>
            </div>
          </div>
          <h3 className="mb-2 border-b pb-2 font-medium text-blue-700">Produtos a separar</h3>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md">
              <p className="text-sm text-gray-600">
                Cliente: <span className="font-semibold text-gray-900">{shown(conference.client?.name)}</span>
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Cód.</th>
                      <th className="px-3 py-2 font-semibold">Referência</th>
                      <th className="whitespace-nowrap px-3 py-2 font-semibold text-right">A separar</th>
                      <th className="px-3 py-2 font-semibold text-right">Itens</th>
                      <th className="px-3 py-2 font-semibold text-right">Restante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {conference.lines.map((line) => {
                      const qty = Math.max(0, Number(line.qty || 0));
                      const serials = serialsOf(conference, line).slice(0, qty);
                      const lidos = Math.min(qty, Math.max(readsOf(conference, line), serials.length));
                      const restante = Math.max(0, qty - lidos);
                      return (
                        <tr
                          key={line.id || `${line.code}-${line.name}`}
                          style={restante === 0 && lidos > 0 ? { backgroundColor: "#bbf7d0" } : undefined}
                        >
                          <td className="px-3 py-2 font-mono font-semibold">{shown(line.code)}</td>
                          <td className="px-3 py-2">
                            <div>{shown(line.name)}</div>
                            {serials.length ? (
                              <div className="mt-1 max-h-12 overflow-y-auto font-mono text-xs font-normal leading-4 text-gray-700">
                                {serials.map((serial) => (
                                  <div key={serial} className="truncate">
                                    {serial}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">{line.qty}</td>
                          <td className="px-3 py-2 text-right font-semibold">{lidos}</td>
                          <td className="px-3 py-2 text-right">{restante}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-800">
                Itens: {conference.lines.reduce((sum, line) => {
                  const qty = Math.max(0, Number(line.qty || 0));
                  const serials = serialsOf(conference, line).slice(0, qty);
                  return sum + Math.min(qty, Math.max(readsOf(conference, line), serials.length));
                }, 0)}/
                {conference.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                imeis/serial: {conference.lines.reduce((sum, line) => sum + Math.min(Number(line.qty || 0), serialsOf(conference, line).length), 0)}/
                {conference.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  confirmLookup(imeiCode);
                }}
              >
                <label className="block text-sm font-semibold text-gray-800" htmlFor="imei-code">
                  Pesquisar IMEI, serial ou código
                </label>
                <div className="relative mt-1" ref={imeiBoxRef}>
                  <div className="flex gap-2">
                    <input
                      id="imei-code"
                      ref={imeiRef}
                      className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 font-mono"
                      placeholder="IMEI, serial ou código do produto"
                      value={imeiCode}
                      disabled={acting || isSent(conference.dispatchStatus)}
                      onChange={(event) => {
                        setImeiCode(event.target.value);
                        setImeiMenuOpen(true);
                      }}
                      onFocus={() => {
                        if (imeiCode.trim()) setImeiMenuOpen(true);
                      }}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      disabled={acting || isSent(conference.dispatchStatus)}
                    >
                      Identificar
                    </button>
                  </div>
                  {imeiMenuOpen && imeiQuery ? (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                      {imeiMatches.length === 0 && codeMatches.length === 0 ? (
                        <p className="p-4 text-center text-sm text-gray-500">Nenhum IMEI, serial ou código encontrado</p>
                      ) : (
                        <ul>
                          {codeMatches.map((line) => (
                            <li key={`code-${line.id || line.code}`}>
                              <button
                                type="button"
                                className="flex h-16 w-full flex-col justify-center overflow-hidden border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-blue-50"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => confirmLookup(line.code)}
                              >
                                <div className="truncate font-mono text-sm font-semibold text-black">Código {line.code}</div>
                                <div className="mt-0.5 truncate text-xs text-gray-700">{line.name}</div>
                              </button>
                            </li>
                          ))}
                          {imeiMatches.map((item) => (
                            <li key={item.imei}>
                              <button
                                type="button"
                                className="flex h-16 w-full flex-col justify-center overflow-hidden border-b border-gray-100 px-4 text-left last:border-b-0 hover:bg-blue-50"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => pickImei(item.imei)}
                              >
                                <div className="truncate font-mono text-sm font-semibold text-black">{item.imei}</div>
                                <div className="mt-0.5 truncate text-xs text-gray-700">
                                  {item.productName}
                                  {item.invoiceNumber ? ` • Invoice #${item.invoiceNumber}` : ""}
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              </form>
              {notice ? <p className="mt-3 text-sm font-semibold text-gray-800">{notice}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={acting || isSent(conference.dispatchStatus)}
                  onClick={() => act("reset")}
                >
                  Reiniciar
                </button>
                <button
                  type="button"
                  className="rounded bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  disabled={acting || isSent(conference.dispatchStatus) || conference.blockers.length > 0 || !(conference.conference.imeis || []).length}
                  onClick={() => act("conclude")}
                >
                  Concluir conferência
                </button>
              </div>
              {conference.blockers.length ? (
                <ul className="mt-3 space-y-1 text-sm text-amber-800">
                  {conference.blockers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <label className="mt-4 block text-sm font-semibold text-gray-800" htmlFor="order-obs">
            Obs do pedido
          </label>
          <textarea
            id="order-obs"
            rows={3}
            className="mt-1 w-full resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Anote aqui. A mensagem fica salva neste pedido."
            value={writtenNote(obsDraft)}
            onChange={(event) => setObsDraft(event.target.value)}
            onFocus={() => {
              obsFocused.current = true;
            }}
            onBlur={() => {
              obsFocused.current = false;
              saveObs();
            }}
          />
        </section>
        </div>
        </div>
      ) : null}

      {orders.filter((order) => order.id === selectedId).map((order) => (
        <section key={order.id} className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Despacho</p>
              <h2 className="text-xl font-bold text-gray-900">Pedido {orderCode(order.id)}</h2>
              <p className="text-sm text-gray-500">
                Aberto {when(order.createdAt)} · Fechado {when(order.closedAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{money(order.total)}</p>
              <button
                type="button"
                className="mt-2 rounded px-3 py-1.5 text-xs font-semibold text-white"
                style={{ color: "#ffffff", backgroundColor: "#111111" }}
                onClick={() => {
                  setZebraNotice("");
                  printNotinha({
                    code: orderCode(order.id),
                    issuedAt: when(order.closedAt || order.createdAt),
                    seller: "Black Rabbit",
                    clientName: order.client?.name || "Cliente",
                    clientMeta: [order.client?.username, order.address?.cidade].filter(Boolean).join(" · "),
                    lines: order.lines.map((line) => ({
                      code: line.code || "",
                      name: line.name || "",
                      qty: `${line.qty} un`,
                      amount: money(Number(line.price || 0) * Number(line.qty || 0)),
                    })),
                    total: "",
                    printedAt: "",
                  }).catch((err: Error) => setZebraNotice(err.message || "Não foi para a impressora."));
                }}
              >
                Imprimir notinha
              </button>
              {zebraNotice ? <p className="mt-1 text-xs text-gray-600">{zebraNotice}</p> : null}
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lojista</p>
              <p className="mt-1 font-semibold text-gray-900">{shown(order.client?.name)}</p>
              <p className="text-sm text-gray-700">CPF/CNPJ: {shown(order.client?.document)}</p>
              <p className="text-sm text-gray-700">E-mail: {shown(order.client?.email)}</p>
              <p className="text-sm text-gray-700">Usuário: {shown(order.client?.username)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Endereço do pedido</p>
              <p className="mt-1 text-sm text-gray-800">{addressLine(order.address)}</p>
              {order.address?.obs ? (
                <p className="mt-2 text-sm text-gray-700">Obs. do endereço: {order.address.obs}</p>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Código</th>
                  <th className="px-3 py-2 font-semibold">Produto</th>
                  <th className="px-3 py-2 font-semibold text-right">Qtd</th>
                  <th className="px-3 py-2 font-semibold text-right">Valor unit.</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.lines.map((line) => {
                  const lineKey = `${order.id}:${line.id || `${line.code}-${line.name}`}`;
                  const serials = serialsOf(order, line);
                  const open = !!openSerials[lineKey];
                  return (
                  <tr
                    key={lineKey}
                    className={serials.length ? "cursor-pointer" : ""}
                    onClick={() => {
                      if (!serials.length) return;
                      setOpenSerials((current) => ({ ...current, [lineKey]: !current[lineKey] }));
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-gray-700">{shown(line.code)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      <div>{shown(line.name)}</div>
                      {open && serials.length ? (
                        <p className="mt-1 font-mono text-xs font-normal text-gray-600">{serialList(serials)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">{line.qty}</td>
                    <td className="px-3 py-2 text-right">{money(Number(line.price || 0))}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(Number(line.price || 0) * Number(line.qty || 0))}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {writtenNote(order.observacao || "") ? (
            <p className="mt-4 text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Obs: </span>
              {writtenNote(order.observacao || "")}
            </p>
          ) : null}
        </section>
      ))}

    </GestaoShell>
  );
}
