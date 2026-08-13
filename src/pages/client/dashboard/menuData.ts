export type PdvMenuItem = {
  id: string;
  label: string;
  starred?: boolean;
  href?: string;
  /** Seta à direita mesmo sem filhos conhecidos (submenu ainda não enviado). */
  hasSubmenu?: boolean;
  /** MVP: oculto no PDV. Remover este flag para reexibir. */
  mvpHidden?: boolean;
  children?: PdvMenuItem[];
};

export type PdvMenuRoot = {
  id: string;
  label: string;
  items: PdvMenuItem[];
};

export function hasKnownChildren(item: PdvMenuItem) {
  return Boolean(item.children && item.children.length > 0);
}

export function showsSubmenuArrow(item: PdvMenuItem) {
  return Boolean(item.hasSubmenu || hasKnownChildren(item));
}

export const PDV_MENUS: PdvMenuRoot[] = [
  {
    id: "cadastros",
    label: "CADASTROS",
    items: [
      {
        id: "clientes",
        label: "Clientes",
        hasSubmenu: true,
        children: [
          { id: "clientes-listar", label: "Listar", href: "/client/clientes" },
          { id: "clientes-cadastrar", label: "Cadastrar", href: "/client/clientes/cadastrar" },
          { id: "clientes-inativos", label: "Inativos", href: "/client/clientes/inativos" },
          { id: "clientes-atividade", label: "Atividade", starred: true, href: "/client/atividades" },
          { id: "clientes-classificacao", label: "Classificação", href: "/client/clientes/classificacao" },
          { id: "clientes-carteira", label: "Carteira de Clientes", href: "/client/clientes/carteira" },
        ],
      },
      {
        id: "fornecedores",
        label: "Fornecedores",
        hasSubmenu: true,
        children: [
          { id: "fornecedores-listar", label: "Listar", href: "/client/fornecedores" },
          { id: "fornecedores-cadastrar", label: "Cadastrar", href: "/client/fornecedores/cadastrar" },
          { id: "fornecedores-inativos", label: "Inativos", href: "/client/fornecedores/inativos" },
          { id: "fornecedores-atividade", label: "Atividade", starred: true, href: "/client/atividades" },
        ],
      },
      {
        id: "produtos",
        label: "Produtos",
        hasSubmenu: true,
        children: [
          { id: "produtos-listar", label: "Listar Produtos", href: "/client/produtos" },
          { id: "produtos-cadastrar", label: "Cadastrar Produtos", href: "/client/produtos/cadastrar" },
          { id: "produtos-alterar-estoque", label: "Alterar Estoque", href: "/client/produtos/estoque" },
          {
            id: "produtos-categoria",
            label: "Categoria",
            hasSubmenu: true,
            children: [
              { id: "produtos-categoria-listar", label: "Listar", href: "/client/produtos/categorias" },
              { id: "produtos-categoria-cadastrar", label: "Cadastrar", href: "/client/produtos/categorias/cadastrar" },
              { id: "produtos-categoria-inativas", label: "Inativas", href: "/client/produtos/categorias/inativas" },
              { id: "produtos-categoria-reajuste", label: "Reajuste por Categoria", href: "/client/produtos/categorias/reajuste" },
            ],
          },
          {
            id: "produtos-variacoes",
            label: "Variações",
            hasSubmenu: true,
            children: [
              {
                id: "produtos-variacoes-tamanho",
                label: "Tamanho",
                hasSubmenu: true,
                children: [
                  { id: "produtos-variacoes-tamanho-listar", label: "Listar" },
                  { id: "produtos-variacoes-tamanho-cadastrar", label: "Cadastrar" },
                  { id: "produtos-variacoes-tamanho-inativas", label: "Inativas" },
                ],
              },
              {
                id: "produtos-variacoes-cor",
                label: "Cor",
                hasSubmenu: true,
                children: [
                  { id: "produtos-variacoes-cor-listar", label: "Listar" },
                  { id: "produtos-variacoes-cor-cadastrar", label: "Cadastrar" },
                  { id: "produtos-variacoes-cor-inativas", label: "Inativas" },
                ],
              },
            ],
          },
          {
            id: "produtos-ncm",
            label: "NCM",
            hasSubmenu: true,
            children: [
              { id: "produtos-ncm-listar", label: "Listar" },
              { id: "produtos-ncm-desatualizados", label: "Desatualizados" },
            ],
          },
          {
            id: "produtos-marca",
            label: "Marca",
            hasSubmenu: true,
            children: [
              { id: "produtos-marca-listar", label: "Listar" },
              { id: "produtos-marca-cadastrar", label: "Cadastrar" },
              { id: "produtos-marca-inativas", label: "Inativas" },
            ],
          },
          {
            id: "produtos-promocao",
            label: "Promoção",
            hasSubmenu: true,
            children: [
              { id: "produtos-promocao-listar", label: "Listar" },
              { id: "produtos-promocao-cadastrar", label: "Cadastrar", starred: true },
              { id: "produtos-promocao-aplicar", label: "Aplicar" },
              { id: "produtos-promocao-produtos", label: "Produtos c/Promoção" },
            ],
          },
          {
            id: "produtos-localizacao",
            label: "Localização",
            hasSubmenu: true,
            children: [
              { id: "produtos-localizacao-gerenciar", label: "Gerenciar Localização" },
              { id: "produtos-localizacao-produto", label: "Gerenciar Produto na Localização" },
              { id: "produtos-localizacao-setor", label: "Gerenciar Setor" },
            ],
          },
          { id: "produtos-colecao", label: "Coleção" },
          { id: "produtos-genero", label: "Gênero" },
          { id: "produtos-tabela-preco", label: "Tabela de Preço" },
          { id: "produtos-unidade", label: "Unidade de Medida" },
          { id: "produtos-lote", label: "Gerenciar Lote" },
          { id: "produtos-tray", label: "Tray Download em Lote" },
          { id: "produtos-etiquetas", label: "Editor de Etiquetas", starred: true },
        ],
      },
      {
        id: "usuarios",
        label: "Usuários",
        hasSubmenu: true,
        children: [
          { id: "usuarios-listar", label: "Listar" },
          { id: "usuarios-cadastrar", label: "Cadastrar" },
          { id: "usuarios-inativos", label: "Inativos" },
          {
            id: "usuarios-grupos",
            label: "Grupos",
            hasSubmenu: true,
            children: [
              { id: "usuarios-grupos-listar", label: "Listar" },
              { id: "usuarios-grupos-cadastrar", label: "Cadastrar" },
            ],
          },
          {
            id: "usuarios-representantes",
            label: "Representantes",
            hasSubmenu: true,
            children: [
              { id: "usuarios-representantes-listar", label: "Listar" },
              { id: "usuarios-representantes-cadastrar", label: "Cadastrar" },
              { id: "usuarios-representantes-inativos", label: "Inativos" },
              {
                id: "usuarios-representantes-identificadores",
                label: "Identificadores",
                hasSubmenu: true,
                children: [
                  { id: "usuarios-representantes-identificadores-listar", label: "Listar" },
                  { id: "usuarios-representantes-identificadores-cadastrar", label: "Cadastrar" },
                  { id: "usuarios-representantes-identificadores-inativos", label: "Inativos" },
                  { id: "usuarios-representantes-identificadores-vincular", label: "Vincular a Representante" },
                ],
              },
            ],
          },
          { id: "usuarios-comissoes", label: "Comissões" },
          { id: "usuarios-atividade", label: "Atividade", starred: true },
        ],
      },
      {
        id: "financeiro",
        label: "Financeiro",
        hasSubmenu: true,
        children: [
          {
            id: "financeiro-forma",
            label: "Forma de Pagamento",
            hasSubmenu: true,
            children: [
              { id: "financeiro-forma-listar", label: "Listar" },
              { id: "financeiro-forma-cadastrar", label: "Cadastrar" },
              { id: "financeiro-forma-inativos", label: "Inativos" },
            ],
          },
          {
            id: "financeiro-plano",
            label: "Plano de Conta",
            hasSubmenu: true,
            children: [
              { id: "financeiro-plano-listar", label: "Listar" },
              { id: "financeiro-plano-cadastrar", label: "Cadastrar" },
              { id: "financeiro-plano-inativos", label: "Inativos" },
            ],
          },
          { id: "financeiro-caixa", label: "Caixa" },
        ],
      },
      {
        id: "documentos-fiscais",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "docs-parametros", label: "Parâmetros de Documentos Fiscais" },
          { id: "docs-certificado", label: "Certificado Digital" },
        ],
      },
    ],
  },
  {
    id: "movimentacoes",
    label: "MOVIMENTAÇÕES",
    items: [
      {
        id: "mov-vendas",
        label: "Vendas",
        hasSubmenu: true,
        children: [
          { id: "mov-vendas-pdv", label: "PDV" },
          { id: "mov-vendas-pre", label: "Pré Vendas" },
          { id: "mov-vendas-entregas", label: "Painel de Entregas", starred: true },
          { id: "mov-vendas-abertas", label: "Abertas" },
          { id: "mov-vendas-concluidas", label: "Concluídas" },
        ],
      },
      {
        id: "mov-consignado",
        label: "Consignado",
        mvpHidden: true,
        hasSubmenu: true,
        children: [
          { id: "mov-consignado-abertas", label: "Abertas" },
          { id: "mov-consignado-concluidas", label: "Concluídas" },
          { id: "mov-consignado-concluidas-todas", label: "Concluídas [Todas]" },
          { id: "mov-consignado-estornadas", label: "Estornadas" },
          { id: "mov-consignado-canceladas", label: "Canceladas" },
          { id: "mov-consignado-busca", label: "Busca" },
        ],
      },
      {
        id: "mov-orcamento",
        label: "Orçamento",
        mvpHidden: true,
        hasSubmenu: true,
        children: [
          { id: "mov-orcamento-abertas", label: "Abertas" },
          { id: "mov-orcamento-concluidas", label: "Concluídas" },
          { id: "mov-orcamento-concluidas-todas", label: "Concluídas [Todas]" },
          { id: "mov-orcamento-estornadas", label: "Estornadas" },
          { id: "mov-orcamento-canceladas", label: "Canceladas" },
          { id: "mov-orcamento-busca", label: "Busca" },
        ],
      },
      {
        id: "mov-ordem-servico",
        label: "Ordem Serviço",
        mvpHidden: true,
        hasSubmenu: true,
        children: [
          { id: "mov-os-abertas", label: "Abertas" },
          { id: "mov-os-concluidas", label: "Concluídas" },
          { id: "mov-os-estornadas", label: "Estornadas" },
          { id: "mov-os-canceladas", label: "Canceladas" },
          { id: "mov-os-busca", label: "Busca" },
        ],
      },
      { id: "mov-kanban", label: "Kanban Movimentação", starred: true, mvpHidden: true },
      {
        id: "mov-caixa",
        label: "Caixa",
        hasSubmenu: true,
        children: [
          { id: "mov-caixa-selecionar", label: "Selecionar Caixa" },
          { id: "mov-caixa-relatorio", label: "Relatório de Caixa" },
          { id: "mov-caixa-conta-corrente", label: "Relatório de Conta Corrente" },
          { id: "mov-caixa-detalhado", label: "Relatório de caixa detalhado" },
          { id: "mov-caixa-conciliacao", label: "Conciliação Bancária" },
        ],
      },
      { id: "mov-compra", label: "Compra", hasSubmenu: true, mvpHidden: true },
      {
        id: "mov-solicitacao",
        label: "Solicitação de Compra",
        starred: true,
        mvpHidden: true,
        hasSubmenu: true,
        children: [
          { id: "mov-solicitacao-listar", label: "Listar" },
          { id: "mov-solicitacao-cadastrar", label: "Cadastrar" },
        ],
      },
      {
        id: "mov-financeiro",
        label: "Financeiro",
        hasSubmenu: true,
        children: [
          { id: "mov-fin-plano", label: "Plano de Conta" },
          { id: "mov-fin-receber", label: "Contas a Receber" },
          { id: "mov-fin-pagar", label: "Contas a Pagar" },
          { id: "mov-fin-fluxo", label: "Fluxo de Caixa" },
          { id: "mov-fin-previsao", label: "Previsão de Fluxo de Caixa" },
          {
            id: "mov-fin-despesas",
            label: "Despesas / Receitas",
            hasSubmenu: true,
            children: [
              { id: "mov-fin-despesas-cadastrar-despesa", label: "Cadastrar Despesa" },
              { id: "mov-fin-despesas-cadastrar-receita", label: "Cadastrar Receita" },
              { id: "mov-fin-despesas-listar", label: "Listar Receitas / Despesas" },
            ],
          },
          { id: "mov-fin-caixa-clientes", label: "Relatório Caixa de Clientes" },
          {
            id: "mov-fin-boletos",
            label: "Boletos",
            hasSubmenu: true,
            children: [
              { id: "mov-fin-boletos-recorrentes", label: "Boletos Recorrentes" },
              { id: "mov-fin-boletos-contas", label: "Contas Bancárias" },
              { id: "mov-fin-boletos-gerenciar", label: "Gerenciar Boletos" },
              { id: "mov-fin-boletos-arquivos", label: "Gerenciar Arquivos" },
            ],
          },
        ],
      },
      {
        id: "mov-transferencias",
        label: "Transferências",
        hasSubmenu: true,
        children: [
          { id: "mov-transf-lojas", label: "Listar Lojas" },
          {
            id: "mov-transf-enviadas",
            label: "Enviadas",
            hasSubmenu: true,
            children: [
              { id: "mov-transf-enviadas-abertas", label: "Abertas" },
              { id: "mov-transf-enviadas-concluidas", label: "Concluídas" },
              { id: "mov-transf-enviadas-estornadas", label: "Estornadas" },
              { id: "mov-transf-enviadas-excluidas", label: "Excluídas" },
            ],
          },
          {
            id: "mov-transf-recebidas",
            label: "Recebidas",
            hasSubmenu: true,
            children: [
              { id: "mov-transf-recebidas-abertas", label: "Abertas" },
              { id: "mov-transf-recebidas-concluidas", label: "Concluídas" },
              { id: "mov-transf-recebidas-estornadas", label: "Estornadas" },
              { id: "mov-transf-recebidas-excluidas", label: "Excluídas" },
            ],
          },
          { id: "mov-transf-buscar", label: "Buscar" },
        ],
      },
      { id: "mov-contagem", label: "Contagem de Estoque" },
      {
        id: "mov-docs",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "mov-docs-nfe", label: "NF-e / NFC-e" },
          { id: "mov-docs-nfse", label: "NFS-e(Serviços)" },
          { id: "mov-docs-manifestacao", label: "Manifestação do Destinatário" },
          { id: "mov-docs-param-nfe", label: "Parâmetros de NF-e / NFC-e" },
          { id: "mov-docs-param-nfse", label: "Parâmetros NFS-e" },
          { id: "mov-docs-arquivos-contador", label: "Arquivos Fiscais Contador" },
          { id: "mov-docs-gerenciador", label: "Gerenciador Arquivos Fiscais" },
        ],
      },
    ],
  },
  {
    id: "relatorios",
    label: "RELATÓRIOS",
    items: [
      {
        id: "rel-auditoria",
        label: "Auditoria",
        hasSubmenu: true,
        children: [
          { id: "rel-auditoria-autorizacao-venda", label: "Autorização de Venda" },
          { id: "rel-auditoria-estoque", label: "Estoque" },
          { id: "rel-auditoria-geral-log", label: "Geral de Log" },
          { id: "rel-auditoria-itens-excluido", label: "Itens Excluído da Venda" },
          { id: "rel-auditoria-preco-venda", label: "Preço de Venda" },
          { id: "rel-auditoria-preco-compra", label: "Preço de Compra" },
        ],
      },
      {
        id: "rel-clientes",
        label: "Clientes",
        hasSubmenu: true,
        children: [
          { id: "rel-clientes-marketing", label: "Marketing" },
          { id: "rel-clientes-sem-movimentacao", label: "Clientes sem Movimentação" },
          { id: "rel-clientes-impressao", label: "Impressão/Carta/E-mail" },
          { id: "rel-clientes-caixa", label: "Relatório Caixa de Clientes" },
          { id: "rel-clientes-movimentacao", label: "Movimentação", starred: true },
        ],
      },
      {
        id: "rel-compras",
        label: "Compras",
        hasSubmenu: true,
        children: [
          { id: "rel-compras-detalhada", label: "Compras Detalhada" },
          { id: "rel-compras-sugestao", label: "Sugestão de Compra" },
        ],
      },
      { id: "rel-despesa", label: "Despesa" },
      {
        id: "rel-docs",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "rel-docs-documentos-fiscais", label: "Documentos Fiscais" },
          { id: "rel-docs-totalizador", label: "Totalizador" },
          { id: "rel-docs-nfse", label: "NFS-e" },
          { id: "rel-docs-totalizador-nfse", label: "Totalizador (NFS-e)" },
        ],
      },
      { id: "rel-dre", label: "DRE Gerencial" },
      {
        id: "rel-estoque",
        label: "Estoque",
        hasSubmenu: true,
        children: [
          { id: "rel-estoque-estoque", label: "Estoque" },
          { id: "rel-estoque-detalhado", label: "Detalhado" },
          { id: "rel-estoque-por-grade", label: "por Grade" },
          { id: "rel-estoque-por-status", label: "por Status" },
          { id: "rel-estoque-sem-movimentacao", label: "Estoque sem Movimentação" },
          { id: "rel-estoque-minimo-maximo", label: "Mínimo e Máximo" },
          { id: "rel-estoque-retroativo", label: "Retroativo" },
          { id: "rel-estoque-contagem", label: "Contagem Estoque" },
          { id: "rel-estoque-fiscal", label: "Estoque Fiscal" },
          { id: "rel-estoque-livro-inventario", label: "Livro de Registro de Inventário" },
        ],
      },
      {
        id: "rel-etiquetas",
        label: "Etiquetas",
        hasSubmenu: true,
        children: [
          { id: "rel-etiquetas-produtos", label: "Produtos" },
          {
            id: "rel-etiquetas-sigep",
            label: "SIGEP",
            hasSubmenu: true,
            children: [
              { id: "rel-etiquetas-sigep-etiqueta", label: "Etiqueta" },
              { id: "rel-etiquetas-sigep-postagem", label: "Postagem" },
              { id: "rel-etiquetas-sigep-pacotes", label: "Pacotes" },
            ],
          },
          {
            id: "rel-etiquetas-de-envio",
            label: "De Envio",
            hasSubmenu: true,
            children: [
              { id: "rel-etiquetas-de-envio-cliente", label: "Cliente" },
              { id: "rel-etiquetas-de-envio-venda", label: "Venda" },
            ],
          },
        ],
      },
      {
        id: "rel-financeiro",
        label: "Financeiro",
        hasSubmenu: true,
        children: [
          { id: "rel-financeiro-caixa", label: "Caixa" },
          { id: "rel-financeiro-cheque", label: "Cheque" },
          { id: "rel-financeiro-cobranca", label: "Cobrança" },
          { id: "rel-financeiro-conferencia-cartao", label: "Conferência de Cartão" },
          { id: "rel-financeiro-recebimento", label: "Recebimento" },
        ],
      },
      {
        id: "rel-produto",
        label: "Produto",
        hasSubmenu: true,
        children: [
          { id: "rel-produto-tabela-preco", label: "Tabela de Preço" },
          { id: "rel-produto-lote", label: "Lote" },
          { id: "rel-produto-tabela-preco-cliente", label: "Tabela de Preço Cliente" },
        ],
      },
      {
        id: "rel-venda",
        label: "Venda",
        hasSubmenu: true,
        children: [
          { id: "rel-venda-cliente-loja", label: "Cliente/Loja" },
          { id: "rel-venda-comissao", label: "Comissão" },
          { id: "rel-venda-custos-vendas", label: "Custos e Vendas" },
          { id: "rel-venda-custo-x-preco", label: "Custo X Preço de Venda" },
          { id: "rel-venda-descontos", label: "Descontos em Vendas" },
          { id: "rel-venda-forma-pagamento", label: "Forma de Pagamento" },
          { id: "rel-venda-itens", label: "Itens das Vendas" },
          { id: "rel-venda-meta", label: "Meta" },
          { id: "rel-venda-vale-desconto", label: "Vale Desconto" },
          { id: "rel-venda-vale-presente", label: "Vale Presente" },
          { id: "rel-venda-resumida", label: "Venda Resumida" },
          { id: "rel-venda-vendedores-mes", label: "Vendedores / Mes" },
          { id: "rel-venda-cliente-mes", label: "Cliente / Mes" },
        ],
      },
      {
        id: "rel-venda-gerencial",
        label: "Venda Gerencial",
        hasSubmenu: true,
        children: [
          { id: "rel-venda-gerencial-giro", label: "Giro de Mercadorias" },
          { id: "rel-venda-gerencial-giro-transferencia", label: "Giro de Mercadorias por Transferência" },
          { id: "rel-venda-gerencial-faturamento", label: "Faturamento" },
          { id: "rel-venda-gerencial-faturamento-totalizador", label: "Faturamento Totalizador", starred: true },
          { id: "rel-venda-gerencial-lucratividade", label: "Lucratividade" },
          { id: "rel-venda-gerencial-produto-mais-vendido", label: "Produto mais Vendido" },
          { id: "rel-venda-gerencial-giro-grade", label: "Giro por Grade" },
          { id: "rel-venda-gerencial-aproveitamento", label: "Aproveitamento de Venda", starred: true },
        ],
      },
    ],
  },
];
