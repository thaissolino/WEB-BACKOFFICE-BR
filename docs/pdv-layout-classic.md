# PDV lojista — Sistema de layout Clássico / Premium

> Status: **toggle temporário** para avaliação de design. Quando um dos layouts
> for escolhido em definitivo, o toggle e o modo perdedor devem ser removidos.
> Escopo atual: painel **lojista** (`/client/...`). O painel gestor não é afetado.

## 1. Visão geral

O painel lojista (PDV) possui dois modos visuais alternáveis em runtime:

- **Premium** — o layout atual/original do PDV (default). Nada nele foi alterado;
  quando este modo está ativo, o DOM e o CSS renderizados são exatamente os de antes.
- **Clássico** — um layout novo, com sensação "iOS premium", inspirado na
  estrutura visual do módulo `gestao-invoices` (títulos fortes + subtítulos,
  cards limpos, cantos generosos, bordas sutis, mais whitespace), porém
  **mantendo a paleta de cores do Premium** (creme/marrom do PDV — variáveis
  `--paper`, `--sheet`, `--ink`, `--ink-soft`, `--accent`, `--accent-soft`,
  `--line` definidas em `.pdv-root` no `dashboard.css`).

O usuário alterna entre os modos por um switch segmentado no header
(**Clássico / Premium**), posicionado antes do ícone da casinha (HOME).
A escolha persiste em `localStorage`.

No modo Clássico, muda:

- O **chrome inteiro** do shell (`PdvShell`): header em **uma linha só**,
  menubar substituída por um **drawer sanduíche**, toolbar reduzida a uma
  faixa mínima que só aparece no dashboard quando há controles visíveis.
- O **conteúdo do dashboard** (`/client/dashboard`): boas-vindas + acesso rápido
  no estilo invoices-like. As demais telas do lojista ainda usam o conteúdo
  antigo (ver seção 6).

## 2. Arquivos principais

| Arquivo | Papel |
|---|---|
| `src/store/pdvLayoutMode.ts` | Store zustand do modo de layout (`premium` \| `classic`), persistido em `localStorage`. |
| `src/pages/client/dashboard/PdvShell.tsx` | Shell do PDV (header, menubar, toolbar, modais). Contém o toggle (`LayoutModeToggle`), aplica `data-layout` no root e faz o branch premium/clássico do chrome. |
| `src/pages/client/dashboard/ClassicDrawer.tsx` | Drawer lateral do modo Clássico: menus completos + ações secundárias com rótulo. |
| `src/pages/client/dashboard/dashboard-classic.css` | Todo o CSS do modo Clássico: toggle, dashboard clássico (`.pdvc-*`), overrides do chrome (escopados em `.pdv-root[data-layout="classic"]`) e drawer (`.pdvd-*`). |
| `src/pages/client/Dashboard.tsx` | Dashboard do lojista. `DashboardBoard` lê o modo e renderiza a variante clássica ou a premium. |
| `src/pages/client/dashboard/dashboard.css` | CSS original do PDV (paleta premium em `.pdv-root`). **Não foi alterado** pelo sistema de layout. |
| `src/pages/client/dashboard/menuData.ts` | Fonte de dados dos menus (`PDV_MENUS`) e atalhos do dashboard (`DASHBOARD_SHORTCUTS`). Compartilhado pelos dois modos. |
| `src/pages/client/dashboard/pdvUiConfig.ts` | Flags de visibilidade vindas do gestor (`isNavVisible`, `filterMenuItems`, `isDashboardVisible`). Respeitadas nos dois modos. |
| `src/pages/client/dashboard/MenuBar.tsx` | Menubar horizontal antiga. Renderizada **apenas** no modo Premium. |

## 3. Como funciona

### Store + persistência

`src/store/pdvLayoutMode.ts`:

```ts
export type PdvLayoutMode = "premium" | "classic";

export const usePdvLayoutMode = create<PdvLayoutModeState>()(
  persist(
    (set) => ({
      mode: "premium",
      setMode: (mode) => set({ mode }),
    }),
    { name: "@client:pdv-layout-mode" },
  ),
);
```

- Default: `premium`.
- Persistência: middleware `persist` do zustand, chave
  `@client:pdv-layout-mode` no `localStorage`.

### `data-layout` no root

O `PdvShell` (e o `PdvLoading`) lê o modo e marca a raiz:

```tsx
<div className="pdv-root" data-surface="cream" data-layout={layoutMode} lang="pt-BR">
```

Todo o CSS do modo Clássico é escopado em
`.pdv-root[data-layout="classic"] ...`. Como **nenhuma regra existente do
`dashboard.css` foi modificada**, o Premium não tem risco de regressão: com
`data-layout="premium"` nenhum override se aplica.

Observação importante sobre especificidade: o `dashboard.css` usa muitos
`!important` (cores de botões via `.pdv-root :where(button...)`, logo azul,
hovers azuis). Os overrides clássicos vencem por **especificidade maior**
(o atributo `[data-layout="classic"]` no seletor) combinada com `!important`
apenas onde a regra original também usa.

### Header clássico em uma linha

No Premium o topo tem três faixas (header, menubar, toolbar). No Clássico o
`PdvShell` renderiza condicionalmente (`isClassic`) uma única linha:

```text
[☰ menu] [logo da loja] [pill da loja ▾] [busca (F1) flex] [toggle] [🏠 home] [sair]
```

- **☰ (`.pdv-burger`)** — abre o `ClassicDrawer` (ver seção 4).
- **Logo da loja** — mesmo botão do Premium (abre o modal de logo), mais
  compacto e no marrom-tinta da paleta em vez do azul-marinho.
- **Pill da loja** — reutiliza o componente `StoreCluster`, que ganhou a prop
  `home?: boolean` (default `true`); no Clássico é renderizado com
  `home={false}` dentro do brand, sem o botão de casinha embutido. A troca de
  loja mantém o diálogo de confirmação.
- **Busca** — campo pill; o rótulo "Pesquisa de Menu" fica visualmente oculto
  (padrão sr-only) e vira o placeholder "Pesquisar no menu (F1)". O atalho F1
  continua funcionando.
- **Toggle** — `LayoutModeToggle` (em `PdvShell.tsx`), presente nos dois modos.
- **Casinha / Sair** — permanecem como ícones; carrinho, engrenagem e headset
  saem do header e vão para o drawer (só no Clássico; no Premium continuam).
- O botão decorativo "CATÁLOGO DE PRODUTOS" (sem ação) não aparece no Clássico.

A faixa `pdv-strip` (MenuBar + toolbar) **não é renderizada** no Clássico.
Em seu lugar, uma faixa mínima `.pdvc-tools` aparece **somente no dashboard**
e **somente se** "Fechar demonstrativo" ou "Período" estiverem visíveis pela
configuração do gestor. O markup desses dois controles foi extraído para as
variáveis `closeDemoButton` e `periodControl` dentro do `PdvShell`, usadas
tanto pela toolbar premium quanto pela faixa clássica (sem duplicação).

### Dashboard clássico

Em `Dashboard.tsx`, `DashboardBoard` lê o modo com
`usePdvLayoutMode((state) => state.mode)`:

- `classic` → renderiza a variante `.pdvc-board`: cabeçalho de boas-vindas
  (nome do cliente + loja atual + chip "Visualiza preço de compra"), e um card
  "Acesso rápido" com os 4 atalhos (`DASHBOARD_SHORTCUTS`: cadastro de
  clientes, fornecedores, usuários e listagem de produtos).
- `premium` → renderiza a UI original, intocada (incluindo os widgets
  demonstrativos desativados com `{false && ...}`, mantidos como estavam).

A busca F1 filtra os atalhos e os flags de visibilidade (`welcome`) são
respeitados nos dois modos — a lógica é computada uma vez e compartilhada.

## 4. Componente `ClassicDrawer`

`src/pages/client/dashboard/ClassicDrawer.tsx` — o painel lateral que
concentra a navegação e as ações secundárias no modo Clássico.

### Estrutura visual

- **Scrim** (`.pdvd-scrim`): overlay escuro translúcido com `backdrop-filter: blur(3px)`.
- **Painel** (`.pdvd-panel`): cartão creme fixado à esquerda,
  `width: min(21rem, 88vw)`, canto direito arredondado (1.25rem), sombra longa,
  animação de entrada (fade + deslize de 24px, 260ms na curva `--ease` do PDV).
- **Cabeçalho** (`.pdvd-head`): kicker "MENU" + nome da loja atual, e botão X circular.
- **Corpo** (`.pdvd-body`, com scroll próprio):
  - **Menus** — os grupos raiz (CADASTROS / MOVIMENTAÇÕES / RELATÓRIOS) como
    cartões colapsáveis (`<details class="pdvd-root">`), com itens e subníveis
    aninhados (`.pdvd-group` / `.pdvd-list`), indentação com linha-guia e
    estrela âmbar para itens favoritos.
  - **Separador** + seção **Ações** (`.pdvd-actions`), com rótulos:
    "Caixa / Carrinho", "Configurar sistema" e "Canais de atendimento" —
    disparam exatamente os mesmos handlers/modais dos ícones do header premium.

### Acordeão exclusivo (`useExclusiveOpen`)

Os `<details>` são **controlados por estado React** — o clique no `summary`
faz `preventDefault()` (cancela o toggle nativo) e o estado decide o atributo
`open`:

```ts
function useExclusiveOpen() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleProps(id: string) {
    return {
      open: openId === id,
      onSummaryClick(event: MouseEvent<HTMLElement>) {
        event.preventDefault();
        setOpenId((current) => (current === id ? null : id));
      },
    };
  }

  return toggleProps;
}
```

- Cada **nível** tem sua própria instância do hook (o `ClassicDrawer` para os
  grupos raiz; cada `DrawerItems` para seu nível de itens). Resultado: abrir um
  painel **fecha os irmãos do mesmo nível**, em qualquer profundidade.
- Os níveis internos preservam seu estado: abrir CADASTROS → Produtos, ir a
  RELATÓRIOS e voltar a CADASTROS reencontra Produtos expandido.
- Teclado funciona: Enter/Espaço no `summary` disparam o mesmo handler de clique.
- Animação de expansão: `.pdvd-root[open] > .pdvd-list` (e `.pdvd-group[open]`)
  animam com `pdvd-expand` (fade + deslize de 4px, 200ms). O colapso é imediato.

### Como fecha

- **Esc** (listener de teclado ativo enquanto aberto);
- clique no **scrim** (o clique no painel usa `stopPropagation`);
- botão **X** (recebe `autoFocus` ao abrir);
- **navegação**: clicar em item folha chama `onClose()` e navega; as ações
  também fecham antes de executar.

### Props e dados reutilizados

```ts
{
  open: boolean;            // isClassic && drawerOpen (estado do PdvShell)
  storeName: string;        // loja atual, exibida no cabeçalho
  uiConfig: PdvUiConfig;    // flags de visibilidade do gestor
  onClose: () => void;
  onCart: () => void;       // goCaixa do PdvShell
  onConfig: () => void;     // abre ConfigModal
  onSupport: () => void;    // abre SupportModal
}
```

O drawer **não duplica dados de menu**: consome `PDV_MENUS` e
`hasKnownChildren` de `menuData.ts`, e aplica `isNavVisible` +
`filterMenuItems` de `pdvUiConfig.ts` — os mesmos usados pela `MenuBar`
premium. Se o gestor ocultar um menu, ele some dos dois modos.

## 5. Como testar

1. `npm run dev` na pasta `backoffice`; login como lojista; abrir `/client/dashboard`.
2. Alternar o toggle **Clássico / Premium** no header; recarregar a página e
   confirmar que a escolha persiste (`localStorage`, chave `@client:pdv-layout-mode`).
3. No Clássico:
   - Header em uma linha; sem menubar nem toolbar fixas.
   - ☰ abre o drawer; acordeões exclusivos por nível; Esc/scrim/X fecham;
     navegar por um item fecha o drawer.
   - Ações do drawer: Caixa/Carrinho navega; Configurar sistema e Canais de
     atendimento abrem os modais.
   - Pill da loja: troca de loja com confirmação.
   - F1 foca a busca e filtra os atalhos do dashboard.
   - Os 4 atalhos do "Acesso rápido" navegam corretamente.
4. No Premium: visual idêntico ao original (duas faixas no topo, ícones
   coloridos, menubar horizontal) — qualquer diferença é regressão.
5. Painel **gestor**: não deve ter sido afetado em nenhum dos modos.

## 6. Próximos passos

- **Conteúdo das demais telas** — no Clássico, apenas o chrome (header/drawer)
  e o conteúdo de `/client/dashboard` estão no estilo novo. As outras telas do
  lojista (caixa, PDV, cadastros, listagens etc.) ainda renderizam o conteúdo
  antigo dentro do chrome clássico; a migração é tela a tela.
- **Widgets do dashboard** — os módulos demonstrativos continuam desativados
  (`{false && ...}` em `Dashboard.tsx`); quando forem reativados, precisarão de
  uma variante clássica.
- **Decisão final** — quando um layout for escolhido: remover o toggle
  (`LayoutModeToggle`), o store `pdvLayoutMode.ts` e o caminho perdedor;
  se o Clássico vencer, promover os overrides a estilo padrão e apagar o CSS
  morto do Premium.
