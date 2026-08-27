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

## Leva 2 (26/08/2026 — noite): pendências implementadas + deploy

Status dos 8 itens que estavam "pra depois":

1. **Estoque ligado ao catálogo oficial — FEITO.** `store_products` ganhou coluna
   **aditiva e nullable** `catalogProductId` (criada com `ADD COLUMN IF NOT EXISTS`,
   sem FK para não travar boot; **nenhum dado existente foi alterado**). No detalhe
   da loja (clássico e premium) há um seletor **"Catálogo oficial (opcional)"** que
   busca `GET /invoice/product`, pré-preenche nome/SKU e grava o vínculo; a lista
   mostra a coluna "Catálogo oficial". Produtos antigos continuam sem vínculo, tudo
   funciona como antes.
2. **Menu Black/Mensageria agrupado — FEITO.** Criar Usuário, Gerenciar Grupos,
   Gerenciar Usuários, Gerenciar Operadores e Gerenciar Tokens agora ficam num grupo
   **colapsado e menos destacado "Black / Mensageria (legado)"** (submenu na sidebar
   clássica; bloco `<details>` no chrome premium). **Nada foi apagado**, só reorganizado.
   Gerenciar Invoices continua em destaque no menu principal.
3. **"Criar Usuário" Black/Mensageria** — mantido como está (decisão: não investir).
   Só mudou de lugar no menu (item 2 acima).
4. **Exclusão de usuário da mensageria — FEITO (soft delete).** O bug era um hard
   delete em cascata manual (`DELETE /graphic/delete`) que apagava grupos, mensagens,
   contatos etc. e quebrava com erro de FK a cada tabela nova (erro `P2025`/FK visto
   nos logs de prod). Agora a conta é apenas marcada `status = DELETED` + `blocked`,
   some das listagens e não loga mais (QR login exige `ACTIVE`). **Nenhuma mensagem/
   grupo é apagado**; reversível voltando o status para `ACTIVE` no banco.
5. **Limpeza/apagamento de base** — continua descartado. Nenhum DELETE/UPDATE em
   massa foi executado em produção (regra de segurança do usuário).
6. **Fornecedores legados do PDV — FEITO (caminho seguro).** O seed automático foi
   **desativado por padrão** (só roda com `PDV_SUPPLIERS_SEED=true`; bases novas não
   recebem mais os fictícios). Em produção **nada foi alterado**: os legados
   (`clientId IS NULL`) continuam visíveis para não quebrar lojistas. Para desativar
   depois, há o script `backend/scripts/deactivate-legacy-pdv-suppliers.ts`
   (preview por padrão; `--apply` marca `active = FALSE`, reversível) — **não foi
   executado em produção**, fica a decisão para o usuário.
7. **E-mail remetente dedicado — FEITO (mínimo).** O envio de senha do lojista agora
   respeita `MAIL_FROM_NAME` / `MAIL_FROM` (fallback: nome "GestorVix" + conta SMTP
   autenticada). Sem troca de provedor, sem projeto grande.
8. **Meu perfil / trocar senha no PDV — FEITO.** Novo botão (ícone de pessoa) no
   cabeçalho do PDV, ao lado de "Sair", nos modos clássico e premium, apontando para
   `/client/trocar-senha` (a tela já suportava troca voluntária).

### Deploy de 26/08 (noite) — o que foi para produção

- **Backend** (`api-black-rabbit`): build local `tsup` → `tar`/`scp` →
  swap de `/root/Black-Rabbit-API/build` (backup em
  `/root/Black-Rabbit-API/build-backup-20260826-224306`) → `pm2 restart api-black-rabbit`
  (path absoluto nvm, **nenhum outro app PM2 tocado**).
  Validação: `GET https://api.vilablackrabbit.com.br/backoffice/lojistas` respondia
  **404** antes e responde **401** depois (rota existe, exige token). Porta 4444 ok,
  boot limpo nos logs.
- **Backoffice front** (`backoffice.vilablackrabbit.com.br`): build local `vite` →
  dist publicado em `/root/backoffice-black-rabbit/dist` (o `serve` do PM2 na 4173 é
  quem atende o domínio via Nginx) e também em `/var/www/backoffice-black-rabbit`.
  Backups em `/root/office-dist-backup-20260826-224657` e
  `/root/office-www-backup-20260826-224657`. Sem reload de Nginx (só arquivos estáticos).
- **Banco de produção: intocado.** Zero DELETE/UPDATE manual. As únicas mudanças de
  schema acontecem no boot do app e são todas `ADD COLUMN IF NOT EXISTS` /
  `CREATE TABLE IF NOT EXISTS` (aditivas, sem backfill destrutivo).
- **Atenção**: o restart do backend regenera o secret JWT em runtime (comportamento
  já existente do app) — sessões abertas do backoffice precisaram relogar.

### Como desfazer (rollback)

- Backend: `mv /root/Black-Rabbit-API/build /root/Black-Rabbit-API/build-new-20260826 &&
  cp -a /root/Black-Rabbit-API/build-backup-20260826-224306 /root/Black-Rabbit-API/build &&
  pm2 restart api-black-rabbit` (pm2 do nvm).
- Front: restaurar `/root/backoffice-black-rabbit/dist` a partir de
  `/root/office-dist-backup-20260826-224657` (e `/var/www` do backup correspondente).
- Soft delete: usuários marcados como excluídos podem ser reativados com
  `UPDATE graphic_accounts SET status = 'ACTIVE', blocked = FALSE WHERE ...`.

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

### Testes da leva 2

7. **Menu gestor**: itens da mensageria agora dentro de "Black / Mensageria (legado)"
   (colapsado); Gerenciar Invoices continua fora, em destaque.
8. **Estoque**: `/lojas/:id/estoque` → formulário tem "Catálogo oficial (opcional)";
   escolher um produto pré-preenche nome/SKU e a lista mostra a coluna Catálogo.
9. **Exclusão mensageria**: em Gerenciar Usuários, excluir um usuário de teste →
   deve sumir da lista **sem erro 500**; mensagens/grupos permanecem no banco.
10. **PDV**: ícone de pessoa no topo (ao lado de Sair) → abre `/client/trocar-senha`.
11. **E-mail**: definir `MAIL_FROM_NAME`/`MAIL_FROM` no `.env` do backend para
    personalizar o remetente da senha do lojista (opcional; tem fallback).
