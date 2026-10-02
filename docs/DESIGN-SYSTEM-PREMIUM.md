# Premium Dark Admin + Soft UI

Padrão visual oficial do backoffice (gestor) a partir de agora. A referência de proporção, cor, raio, espaçamento, densidade e hierarquia é a home: título, quatro cartões (Grupos, Usuários, Chamadas, Mensagens) e a tabela Novos usuários.

A vitrine do lojista permanece na superfície cream. Este documento cobre o operador: Home, Cadastro, Compras, Gestão de caixas, Gerenciar lojistas, Vendas concluídas, Etiquetas da entrada, Backup BD, listagens e telas novas do backoffice.

Modernizar o visual não autoriza mudar rota, API, banco, permissão ou regra de negócio.

## Tokens

Declarar uma vez. Componente usa a variável, não o hexadecimal.

```css
--background: #4A351F;
--sidebar: #30261D;
--surface: #211C17;
--surface-2: #2A2119;
--primary: #C7862E;
--primary-deep: #9A6830;
--text: #F5F1EA;
--muted: #B8AA9B;
--border: rgba(255, 255, 255, 0.07);
--success: #35C98B;
--error: #E05C5C;
```

O dourado é acento. O fundo é marrom em profundidades diferentes, nunca preto puro. Header um tom acima do miolo, para não virar uma faixa preta solta.

## Forma

- Cards e painéis: raio 12–16px (`rounded-xl` / `rounded-2xl`).
- Botão menor: `rounded-lg`.
- Espaço em múltiplos de 4: 4, 8, 12, 16, 24, 32.
- Borda só com `--border`. Sombra suave. Sem gradiente forte e sem vidro exagerado.
- O miolo ocupa a largura depois da sidebar: `main` com `px-8 py-6` e filho `w-full`. Sem `max-width` que deixe o painel estreito no centro.
- Quatro stat cards na mesma fileira: mesma altura, mesma largura, mesmo padding, mesma estrutura. `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` com `gap-4`.

## Peças

AppShell = Sidebar + Header + Main.

| Peça | Regra |
| --- | --- |
| Sidebar | Fixa, 230–250px, fundo `--sidebar`, ícone Lucide antes do texto, item ativo em dourado discreto, grupos, sair embaixo |
| Header | Mesmo marrom do app. À direita, juntos: Exportar resumo, tema, notificações, configurações |
| PageHeader | Título 24–28px, peso 600–700, apoio em `--muted` |
| StatCard | Ícone 22px num bloco `primary` translúcido + rótulo 11–12px + valor 22–26px peso 700 |
| ContentCard | `--surface`, raio 12–16px, borda `--border`, padding 16–24 |
| DataTable | Título à esquerda, busca à direita, header discreto, linha com divisor `--border`, 13–14px |
| StatusBadge | Ponto `--success` + texto. Ativo não usa verde neon |
| Button | primary, secondary, ghost, danger, icon. Um só desenho para o sistema |
| SearchInput | Ícone Search, fundo `--surface-2`, foco em anel dourado discreto |
| Modal / menu | Mesma paleta, mesmo raio, sombra curta |

Ícones somente Lucide. Menu 18px, botão 16–18px, card 22–24px, stroke 1,75–2. Sem emoji, sem ícone 3D, sem outra família misturada.

Fonte: Inter.

## Tabela de usuários

```
Novos usuários                         [ buscar ]

USUÁRIO       NOME COMPLETO        DATA DE CRIAÇÃO       STATUS
importshop    IMPORT SHOP          16/04/2026            ● Ativo
```

Avatar circular com `UserRound`. Status ativo: ponto verde e a palavra Ativo.

## Comportamento de tela

Toda lista que busca dado mostra loading (skeleton), vazio, erro e sucesso, sem a página pular. Foco visível, `aria-label` em botão que só tem ícone, teclado nos controles.

Animação curta só em sidebar, menu, acordeão, modal e hover. Nada saltando.

Desktop: sidebar fixa. Tablet: sidebar estreita ou gaveta. Mobile: gaveta; cards 4 → 2 → 1.

## O que não fazer

Não duplicar o mesmo card, tabela ou botão em cada página. Se o StatCard mudar, todos os cartões mudam com ele. Não espalhar hex no JSX. Não criar um botão com cara nova por tela. Não reescrever a regra de negócio para acompanhar o layout.
