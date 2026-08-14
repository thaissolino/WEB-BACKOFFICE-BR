import { ReactNode, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Activity,
  BadgeCheck,
  Banknote,
  Cake,
  ChevronDown,
  Clock,
  CreditCard,
  MapPin,
  Newspaper,
  Package,
  PackageMinus,
  Play,
  Share2,
  ShieldAlert,
  Star,
  Wallet,
} from "lucide-react";
import { useClientAuth, type ClientUser } from "../../hooks/clientAuth";
import {
  NEWS,
  PLAN,
  SOCIAL_VIDEOS,
  periodLabels,
} from "./dashboard/mockData";
import PdvShell, { PdvLoading, usePdvSession, usePdvUiConfig } from "./dashboard/PdvShell";
import { accordionWidgetId, isDashboardVisible } from "./dashboard/pdvUiConfig";

const MODULES = [
  "Novidades do Sistema",
  "Meu Plano",
  "Aniversariante do Dia",
  "Estoque mínimo",
  "Clientes que mais compraram nos últimos 30 dias",
  "Consignado Vencidos",
  "Todos os Consignado(s)",
  "Crediários em Aberto",
  "$ Total de Contas a Receber",
  "$ Total de Contas a Pagar",
  "Faturamento",
  "Localização de Todos os Clientes",
  "Atividades",
  "MÍDIAS SOCIAIS",
] as const;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function calendarCells(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { day: number; muted?: boolean; today?: boolean }[] = [];
  for (let i = startPad - 1; i >= 0; i -= 1) {
    cells.push({ day: prevDays - i, muted: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, today: day === now.getDate() });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - (startPad + daysInMonth) + 1, muted: true });
  }
  return cells;
}

const ZERO_MONEY = { total: "R$ 0,00", today: "0,00", week: "0,00", month: "0,00" };

function matches(query: string, title: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return title.toLowerCase().includes(q);
}

function Module({
  id,
  icon,
  title,
  visible,
  tone,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  visible: boolean;
  tone?: "warn" | "ok";
  children: ReactNode;
}) {
  if (!visible) return null;

  return (
    <details className="pdv-module" data-tone={tone} id={id}>
      <summary className="pdv-module-head">
        <span className="pdv-icon" aria-hidden="true">
          {icon}
        </span>
        <h3>{title}</h3>
        <ChevronDown className="pdv-caret" size={22} aria-hidden="true" />
      </summary>
      <div className="pdv-module-body">{children}</div>
    </details>
  );
}

function MoreLink({ label }: { label: string }) {
  return (
    <button className="pdv-more" type="button">
      ▶ {label}
    </button>
  );
}

function Ring({ color, label }: { color: string; label: string }) {
  return (
    <div className="pdv-ring">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="30" fill="none" stroke="#e8e0d4" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1c1814">
          ∞
        </text>
      </svg>
      <span>
        <i className="pdv-dot" style={{ background: color }} />
        {label}
      </span>
    </div>
  );
}

function MoneyPeriods({
  total,
  today,
  week,
  month,
}: {
  total: string;
  today: string;
  week: string;
  month: string;
}) {
  const labels = periodLabels();
  return (
    <>
      <div className="pdv-money-head">
        <span>Total</span>
        <b>{total}</b>
      </div>
      <div className="pdv-periods">
        <div className="pdv-period-col">
          <small>{labels.today}</small>
          <strong>{today}</strong>
        </div>
        <div className="pdv-period-col">
          <small>{labels.week}</small>
          <strong>{week}</strong>
        </div>
        <div className="pdv-period-col">
          <small>{labels.month}</small>
          <strong>{month}</strong>
        </div>
      </div>
    </>
  );
}

function BillingChart() {
  const now = new Date();
  const days = Array.from({ length: 12 }, (_, i) => i + 1);
  const x0 = 56;
  const x1 = 628;
  const y0 = 18;
  const y1 = 198;
  const max = 600000;
  const xs = days.map((_, i) => x0 + (i / 11) * (x1 - x0));
  const ys = days.map(() => y1);
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L ${x1} ${y1} L ${x0} ${y1} Z`;
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return (
    <figure>
      <svg
        className="pdv-chart"
        viewBox="0 0 640 240"
        role="img"
        aria-label="Faturamento zerado: ainda não há vendas persistidas."
      >
        <rect width="640" height="240" fill="#fffdf8" />
        {[0, 200000, 400000, 600000].map((tick) => {
          const y = y1 - (tick / max) * (y1 - y0);
          return (
            <g key={tick}>
              <line x1={x0} x2={x1} y1={y} y2={y} stroke="#e8e0d4" />
              <text x={x0 - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#4a433c">
                {tick === 0 ? "R$ 0" : tick.toLocaleString("pt-BR")}
              </text>
            </g>
          );
        })}
        {xs.map((x, i) => (
          <text key={i} x={x} y={228} textAnchor="middle" fontSize="11" fill="#4a433c">
            {String(i + 1).padStart(2, "0")}/{month}
          </text>
        ))}
        <path d={area} fill="rgba(234, 88, 12, 0.08)" />
        <path d={line} fill="none" stroke="#ea580c" strokeWidth="2.5" />
      </svg>
      <ul className="pdv-legend">
        <li>
          <i style={{ background: "#ea580c" }} />
          Faturamento (sem vendas gravadas)
        </li>
      </ul>
    </figure>
  );
}

function ActivitiesCalendar() {
  const now = new Date();
  const [view, setView] = useState<"mes" | "semana" | "dia">("mes");
  const cells = calendarCells(now);
  const visible =
    view === "dia"
      ? cells.filter((cell) => cell.today)
      : view === "semana"
        ? cells.slice(0, 7)
        : cells;
  const monthTitle = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="pdv-cal-toolbar">
        <p className="pdv-cal-title">{monthTitle}</p>
        <button className="pdv-cal-hoje" type="button">
          Hoje
        </button>
        <div className="pdv-cal-views" role="group" aria-label="Visualização">
          <button type="button" aria-pressed={view === "mes"} onClick={() => setView("mes")}>
            Mês
          </button>
          <button type="button" aria-pressed={view === "semana"} onClick={() => setView("semana")}>
            Semana
          </button>
          <button type="button" aria-pressed={view === "dia"} onClick={() => setView("dia")}>
            Dia
          </button>
        </div>
      </div>
      <div className="pdv-cal-grid">
        {WEEKDAYS.map((day) => (
          <b key={day}>{day}</b>
        ))}
        {visible.map((cell, index) => (
          <span
            key={`${cell.day}-${index}`}
            className={cell.today ? "pdv-cal-today" : cell.muted ? "pdv-cal-muted" : undefined}
          >
            {cell.day}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardBoard({ client }: { client: ClientUser }) {
  const navigate = useNavigate();
  const { query, storeName } = usePdvSession();
  const uiConfig = usePdvUiConfig();
  const boardRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    return Object.fromEntries(
      MODULES.map((title) => {
        const widgetId = accordionWidgetId(title);
        const allowed = !widgetId || isDashboardVisible(uiConfig, widgetId);
        return [title, allowed && matches(query, title)];
      }),
    ) as Record<(typeof MODULES)[number], boolean>;
  }, [query, uiConfig]);

  const visibleCount = Object.values(visible).filter(Boolean).length;
  const showWelcome = isDashboardVisible(uiConfig, "welcome");
  const showCertificate = isDashboardVisible(uiConfig, "certificate-alert");

  return (
    <>
        {showCertificate ? (
        <section className="pdv-notice" role="alert" aria-labelledby="pdv-cert-title">
          <ShieldAlert size={22} aria-hidden="true" />
          <p>
            <strong id="pdv-cert-title">ATENÇÃO!</strong> Certificado Digital A1 / NFS-e não está
            conectado à autoridade certificadora. Upload real e validade ficam estáticos até haver
            integração.{" "}
            <button className="pdv-renew" type="button">
              Clique aqui e renove...
            </button>
          </p>
        </section>
        ) : null}

        {showWelcome ? (
        <div className="pdv-welcome-block">
          <p className="pdv-welcome">Seja bem vindo, {client.name}</p>
          <div className="pdv-shop-bar">
            <span>
              Loja Atual: <strong>{storeName}</strong>
            </span>
            <span>Visualiza preço de compra: Sim</span>
          </div>
        </div>
        ) : null}

        {visibleCount === 0 ? (
          <p className="pdv-empty">Nada encontrado.</p>
        ) : (
          <div className="pdv-modules" ref={boardRef}>
            <Module
              id="pdv-news"
              icon={<Newspaper size={20} />}
              title="Novidades do Sistema"
              visible={visible["Novidades do Sistema"]}
            >
              <ul className="pdv-zebra">
                {NEWS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <MoreLink label="Ver todas" />
            </Module>

            <Module
              id="pdv-plan"
              icon={<BadgeCheck size={20} />}
              title="Meu Plano"
              visible={visible["Meu Plano"]}
              tone="ok"
            >
              <div className="pdv-plan">
                <div className="pdv-rings">
                  <Ring color="#ea7a2f" label="Produto" />
                  <Ring color="#7dd3fc" label="Usuário" />
                  <Ring color="#a3e635" label="PDV" />
                </div>
                <ul className="pdv-facts">
                  <li>
                    <span>Código da loja para suporte</span>
                    <strong>{PLAN.storeCode}</strong>
                  </li>
                  <li>
                    <span>Plano</span>
                    <strong>{PLAN.name}</strong>
                  </li>
                  <li>
                    <span>Produto</span>
                    <strong>{PLAN.product}</strong>
                  </li>
                  <li>
                    <span>Usuário</span>
                    <strong>{PLAN.user}</strong>
                  </li>
                  <li>
                    <span>PDV</span>
                    <strong>{PLAN.pdv}</strong>
                  </li>
                  <li>
                    <span>Armazenamento</span>
                    <strong>{PLAN.storage}</strong>
                  </li>
                  <li>
                    <span>Arquivos</span>
                    <strong>{PLAN.files}</strong>
                  </li>
                  <li>
                    <span>Ultimo Pagto</span>
                    <strong>{PLAN.lastPayment}</strong>
                  </li>
                  <li>
                    <span>Mensalidade</span>
                    <strong>{PLAN.monthly}</strong>
                  </li>
                </ul>
                <MoreLink label="Saiba Mais" />
              </div>
            </Module>

            <Module
              id="pdv-birthdays"
              icon={<Cake size={20} />}
              title="Aniversariante do Dia"
              visible={visible["Aniversariante do Dia"]}
            >
              <div className="pdv-vacant">
                <p>Nenhum aniversariante hoje.</p>
              </div>
            </Module>

            <Module
              id="pdv-stock"
              icon={<PackageMinus size={20} />}
              title="Estoque mínimo"
              visible={visible["Estoque mínimo"]}
              tone="warn"
            >
              <div className="pdv-table-wrap">
                <table className="pdv-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Estoque mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={3}>Nenhum produto com estoque mínimo configurado.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <MoreLink label="Ver tudo" />
            </Module>

            <Module
              id="pdv-buyers"
              icon={<CreditCard size={20} />}
              title="Clientes que mais compraram nos últimos 30 dias"
              visible={visible["Clientes que mais compraram nos últimos 30 dias"]}
            >
              <ul className="pdv-zebra pdv-buyers">
                <li>
                  <span className="pdv-buyer-name">Nenhuma venda nos últimos 30 dias.</span>
                  <strong className="pdv-buyer-val">R$ 0,00</strong>
                </li>
              </ul>
            </Module>

            <Module
              id="pdv-overdue"
              icon={<Clock size={20} />}
              title="Consignado Vencidos"
              visible={visible["Consignado Vencidos"]}
              tone="warn"
            >
              <div className="pdv-vacant">
                <p>Nenhum cliente em Consignado</p>
              </div>
              <MoreLink label="Ver Todos" />
            </Module>

            <Module
              id="pdv-consignments"
              icon={<Package size={20} />}
              title="Todos os Consignado(s)"
              visible={visible["Todos os Consignado(s)"]}
            >
              <div className="pdv-vacant">
                <p>Nenhum cliente em Consignado</p>
              </div>
              <MoreLink label="Ver Todos" />
            </Module>

            <Module
              id="pdv-credit"
              icon={<Wallet size={20} />}
              title="Crediários em Aberto"
              visible={visible["Crediários em Aberto"]}
            >
              <div className="pdv-vacant">
                <p>Nenhum cliente</p>
              </div>
              <MoreLink label="Ver Todos" />
            </Module>

            <Module
              id="pdv-receive"
              icon={<Banknote size={20} />}
              title="$ Total de Contas a Receber"
              visible={visible["$ Total de Contas a Receber"]}
            >
              <MoneyPeriods
                total={ZERO_MONEY.total}
                today={ZERO_MONEY.today}
                week={ZERO_MONEY.week}
                month={ZERO_MONEY.month}
              />
            </Module>

            <Module
              id="pdv-pay"
              icon={<Banknote size={20} />}
              title="$ Total de Contas a Pagar"
              visible={visible["$ Total de Contas a Pagar"]}
            >
              <MoneyPeriods
                total={ZERO_MONEY.total}
                today={ZERO_MONEY.today}
                week={ZERO_MONEY.week}
                month={ZERO_MONEY.month}
              />
            </Module>

            <Module
              id="pdv-billing"
              icon={<Banknote size={20} />}
              title="Faturamento"
              visible={visible.Faturamento}
            >
              <BillingChart />
            </Module>

            <Module
              id="pdv-map"
              icon={<MapPin size={20} />}
              title="Localização de Todos os Clientes"
              visible={visible["Localização de Todos os Clientes"]}
            >
              <div className="pdv-map-empty">
                <MapPin className="pdv-pin" size={72} strokeWidth={1.6} aria-hidden="true" />
                <p>Configure sua API Key do Google Maps para exibir a localização dos clientes.</p>
                <div className="pdv-map-actions">
                  <button type="button" onClick={() => navigate("/client/loja?tab=integracoes")}>
                    Configurar API Key
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        "https://developers.google.com/maps/documentation/javascript/get-api-key",
                        "_blank",
                        "noreferrer",
                      )
                    }
                  >
                    Como obter a API Key
                  </button>
                </div>
              </div>
            </Module>

            <Module
              id="pdv-activities"
              icon={<Activity size={20} />}
              title="Atividades"
              visible={visible.Atividades}
            >
              <ActivitiesCalendar />
            </Module>

            <Module
              id="pdv-social"
              icon={<Share2 size={20} />}
              title="MÍDIAS SOCIAIS"
              visible={visible["MÍDIAS SOCIAIS"]}
            >
              <div className="pdv-social-grid">
                <section className="pdv-social-block">
                  <h4>
                    <Star size={16} aria-hidden="true" />
                    Vídeo Destaque do nosso Canal
                  </h4>
                  <div className="pdv-video">
                    <div className="pdv-thumb">
                      <span className="pdv-play" aria-hidden="true">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </div>
                    <p>{SOCIAL_VIDEOS.featured}</p>
                  </div>
                </section>
                <section className="pdv-social-block">
                  <h4>Últimos vídeos do nosso Canal</h4>
                  <div className="pdv-video">
                    <div className="pdv-thumb">
                      <span className="pdv-play" aria-hidden="true">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </div>
                    <p>{SOCIAL_VIDEOS.latest}</p>
                  </div>
                </section>
              </div>
            </Module>
          </div>
        )}
    </>
  );
}

export default function ClientDashboard() {
  const { client, loadingClient } = useClientAuth();

  if (loadingClient) return <PdvLoading />;
  if (!client) return <Navigate to="/signin/client" replace />;

  return (
    <PdvShell>
      <DashboardBoard client={client} />
    </PdvShell>
  );
}
