# Gestão — Pedidos do Lucas (leva de 26/08/2026)

Escopo fechado com o usuário. Este doc registra **o que foi feito nesta leva**,
o que **ficou para decidir/fazer depois** e a regra de **separação Central vs Lojista**.

---

## O que foi feito nesta leva

### 1. Cadastro produtos (Gestão) agora usa a base oficial das invoices
- A tela `/cadastro-produtos` do painel gestor **deixou de listar produtos por loja**
  (`/backoffice/stores`) e passou a usar a **mesma base/API do Gerenciar Invoices**
  (`GET/POST/PUT/DELETE /invoice/product`), reutilizando a `ProductsTab` do módulo de invoices.
- **Não houve exclusão de dados** — o pedido de "remover o que tá lá" era um equívoco
  (confusão entre cadastro de lojista e cadastro de usuário). Nada destrutivo foi feito.
- Regra reforçada na tela: **só a Central cadastra produtos**. O lojista no PDV
  continua apenas consumindo/escolhendo produtos.

### 2. Cadastro fornecedores (Gestão) — novo item de menu
- Novo item **"Cadastro fornecedores"** no grupo Gestão, logo **abaixo de Cadastro produtos**
  (sidebar clássica e chrome premium). Rota: `/cadastro-fornecedores`.
- Puxa os fornecedores que **já existem** na base da Central/invoices
  (`/invoice/supplier`), reutilizando a `SuppliersTab` (inclui apelidos de PDF, moeda etc.).
- Esses fornecedores **não aparecem para lojistas**.
- **Fluxo das invoices não mudou**: invoices continuam usando **só** os fornecedores da
  Central — nada é misturado com fornecedores do PDV.

### 3. Aba Fornecedores no painel do lojista (PDV)
- A tela `/client/fornecedores` (que já existia) agora deixa a separação explícita:
  nota na tela informando que ali ficam **os fornecedores particulares do lojista**,
  e que os da Central não aparecem.
- **Backend**: `pdv_suppliers` ganhou coluna `clientId`. Cada lojista passa a ver
  **apenas os fornecedores dele** + os legados sem dono (seed antigo).
  Fornecedor criado pelo lojista fica vinculado à conta dele.
- Base totalmente separada da tabela de fornecedores da Central (invoices).

### 4. Cadastro freteiros (Gestão) — novo item de menu
- Novo item **"Cadastro freteiros"** abaixo de Cadastro fornecedores. Rota: `/cadastro-freteiros`.
- Usa a base existente das invoices (`/invoice/carriers`), reutilizando a `CarriersTab`:
  lista os que já existem por padrão e permite **adicionar novos**.

### 5. Layout das páginas de Gestão + modo "Alternativo"
- As telas novas/alteradas de Gestão (produtos, fornecedores, freteiros, lojistas)
  usam layout **claro no padrão invoice** (shell `GestaoShell` + `gestao-pages.css`).
- Novo toggle no popover de modos (engrenagem): **Clássico / Premium / Alternativo**.
  - `alternative` foi adicionado ao `GlobalUiMode` (`src/store/uiMode.ts` / `uiModeStore.ts`).
  - No modo **Alternativo**, as telas de Gestão aplicam a **paleta do PDV**
    (paper `#f4f1ea`, sheet `#fffdf8`, ink `#1a1511`, accent `#8b3d12`, accent-soft `#c4842a`,
    line `#ddd4c6` — mesmas variáveis do dashboard do lojista).
  - O `pdvLayoutMode` (toggle premium/classic do painel do lojista) não foi alterado;
    o modo Alternativo é do contexto do painel gestor, implementado de forma limpa
    por cima do store de modos já existente.

### 6. Cadastro de lojistas evoluído (NÃO é o "Criar Usuário" da mensageria)
- `/cadastro-lojistas` deixou de ser o formulário de criar *loja* e virou o
  **cadastro da conta do lojista** (login do PDV): **Nome, CPF/CNPJ, E-mail, Telefone**.
- **Senha gerada automaticamente** (10 caracteres sem ambíguos), **enviada por e-mail**
  (best-effort via SMTP `MAIL_*`; se falhar, a senha é exibida ao gestor para repasse).
- **Primeiro acesso exige troca de senha**: flag `mustChangePassword` na tabela `clients`;
  o login do PDV redireciona para `/client/trocar-senha` (novo endpoint
  `POST /clients/change-password`).
- **Fluxo 1 lojista → várias lojas**: `stores.clientId` aponta para o lojista;
  a tela permite vincular lojas existentes no cadastro e depois ("+ Vincular loja").
- Criar *loja* continua existindo em `/lojas/cadastrar` (inalterado).
- **Nada foi mexido no "Criar Usuário" Black/Mensageria** (`/create-form-user`).

#### Novos endpoints (backend)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/backoffice/lojistas` | Lista lojistas + lojas vinculadas + lojas disponíveis |
| POST | `/backoffice/lojistas` | Cria lojista (senha gerada, e-mail, 1º acesso troca senha) |
| PUT | `/backoffice/lojistas/:id/stores` | Vincula lojas a um lojista |
| POST | `/clients/change-password` | Troca de senha do lojista (limpa flag de 1º acesso) |

---

## Separação Central vs Lojista (regra de ouro)

| Entidade | Central (gestor) | Lojista (PDV) |
| --- | --- | --- |
| **Produtos** | Cadastra/edita na base oficial (`/invoice/product`) via `/cadastro-produtos` e Gerenciar Invoices | Só consome/escolhe produtos; **não cadastra** |
| **Fornecedores** | Base das invoices (`/invoice/supplier`) via `/cadastro-fornecedores`; invoices usam **só** esta base | Base própria (`pdv_suppliers`, escopada por `clientId`) em `/client/fornecedores`; **não vê** os da Central |
| **Freteiros** | Base das invoices (`/invoice/carriers`) via `/cadastro-freteiros` | Não tem tela de freteiros |
| **Lojistas/Lojas** | Central cadastra o lojista e vincula N lojas | Lojista faz login e opera as lojas dele |

---

## Ficou pra decidir/fazer depois (NÃO feito nesta leva)

1. **Estoque** (itens 6–7 das dúvidas) — definição de como o estoque por loja
   conversa com a base oficial de produtos das invoices (hoje há `store_products`
   separado, usado pelas telas Gerenciar lojistas/Estoque).
2. **Esconder/reorganizar "Black Rabbit" no menu** — apenas planejado; nenhuma
   mudança de visibilidade foi feita.
3. **"Criar Usuário" Black/Mensageria** — não mexido, por decisão de escopo.
4. **Bug de exclusão de usuário da mensageria** — não investigado nesta leva.
5. **Qualquer limpeza/apagamento de base** — descartado; o pedido original era equívoco.
6. **Migrar os fornecedores legados (seed) do PDV** para donos específicos, ou
   decidi-los como "compartilhados" permanentes (`clientId IS NULL`).
7. **E-mail transacional dedicado** — hoje o envio da senha usa SMTP genérico
   (`MAIL_HOST/USER/PASS`); avaliar template e remetente próprios.
8. **Tela "Meu perfil / trocar senha" dentro do PDV** — hoje a troca acontece na
   rota `/client/trocar-senha` (forçada no 1º acesso); avaliar entrada pelo menu.

---

## Como testar (resumo)

1. **Gestor** (`MASTER`/`ADMIN`): grupo **Gestão** no menu deve mostrar, na ordem:
   Cadastro lojistas → Cadastro produtos → **Cadastro fornecedores** → **Cadastro freteiros** → Gerenciar lojistas.
2. `/cadastro-produtos`: deve listar os mesmos produtos da aba Produtos do Gerenciar Invoices.
3. `/cadastro-fornecedores` e `/cadastro-freteiros`: mesmas bases das abas do Gerenciar Invoices.
4. Engrenagem (modos): alternar **Alternativo** → telas de Gestão ficam claras com paleta PDV.
5. `/cadastro-lojistas`: criar lojista → modal com senha provisória (+ e-mail se SMTP configurado);
   vincular lojas; login no PDV com a senha provisória → redireciona para troca de senha.
6. **PDV** `/client/fornecedores`: nota de separação; fornecedor criado por um lojista
   não aparece para outro lojista.
