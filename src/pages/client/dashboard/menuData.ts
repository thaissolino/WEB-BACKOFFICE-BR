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

/**
 * Atalhos MVP na home/dashboard do lojista (não na menubar).
 * Menubar continua com PDV_MENUS completo.
 */
export const DASHBOARD_SHORTCUTS: { id: string; label: string; href: string }[] = [
  { id: "cadastro-clientes", label: "Cadastro clientes", href: "/client/clientes" },
  { id: "cadastro-fornecedores", label: "Cadastro fornecedores", href: "/client/fornecedores" },
  { id: "cadastro-usuarios", label: "Cadastro usuários", href: "/client/usuarios" },
  { id: "produtos-listar", label: "Produtos listar", href: "/client/produtos" },
];

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
                  { id: "produtos-variacoes-tamanho-listar", label: "Listar", href: "/client/produtos/variacoes/tamanho" },
                  { id: "produtos-variacoes-tamanho-cadastrar", label: "Cadastrar", href: "/client/produtos/variacoes/tamanho/cadastrar" },
                  { id: "produtos-variacoes-tamanho-inativas", label: "Inativas", href: "/client/produtos/variacoes/tamanho/inativas" },
                ],
              },
              {
                id: "produtos-variacoes-cor",
                label: "Cor",
                hasSubmenu: true,
                children: [
                  { id: "produtos-variacoes-cor-listar", label: "Listar", href: "/client/produtos/variacoes/cor" },
                  { id: "produtos-variacoes-cor-cadastrar", label: "Cadastrar", href: "/client/produtos/variacoes/cor/cadastrar" },
                  { id: "produtos-variacoes-cor-inativas", label: "Inativas", href: "/client/produtos/variacoes/cor/inativas" },
                ],
              },
            ],
          },
          {
            id: "produtos-ncm",
            label: "NCM",
            hasSubmenu: true,
            children: [
              { id: "produtos-ncm-listar", label: "Listar", href: "/client/produtos/ncm" },
              { id: "produtos-ncm-desatualizados", label: "Desatualizados", href: "/client/produtos/ncm/desatualizados" },
            ],
          },
          {
            id: "produtos-marca",
            label: "Marca",
            hasSubmenu: true,
            children: [
              { id: "produtos-marca-listar", label: "Listar", href: "/client/produtos/marcas" },
              { id: "produtos-marca-cadastrar", label: "Cadastrar", href: "/client/produtos/marcas/cadastrar" },
              { id: "produtos-marca-inativas", label: "Inativas", href: "/client/produtos/marcas/inativas" },
            ],
          },
          {
            id: "produtos-promocao",
            label: "Promoção",
            hasSubmenu: true,
            children: [
              { id: "produtos-promocao-listar", label: "Listar", href: "/client/produtos/promocoes" },
              { id: "produtos-promocao-cadastrar", label: "Cadastrar", starred: true, href: "/client/produtos/promocoes/cadastrar" },
              { id: "produtos-promocao-aplicar", label: "Aplicar", href: "/client/produtos/promocoes/aplicar" },
              { id: "produtos-promocao-produtos", label: "Produtos c/Promoção", href: "/client/produtos/promocoes/produtos" },
            ],
          },
          {
            id: "produtos-localizacao",
            label: "Localização",
            hasSubmenu: true,
            children: [
              { id: "produtos-localizacao-gerenciar", label: "Gerenciar Localização", href: "/client/produtos/localizacao" },
              { id: "produtos-localizacao-produto", label: "Gerenciar Produto na Localização", href: "/client/produtos/localizacao/produtos" },
              { id: "produtos-localizacao-setor", label: "Gerenciar Setor", href: "/client/produtos/localizacao/setores" },
            ],
          },
          { id: "produtos-colecao", label: "Coleção", href: "/client/produtos/colecoes" },
          { id: "produtos-genero", label: "Gênero", href: "/client/produtos/generos" },
          { id: "produtos-tabela-preco", label: "Tabela de Preço", href: "/client/produtos/tabela-preco" },
          { id: "produtos-unidade", label: "Unidade de Medida", href: "/client/produtos/unidades" },
          { id: "produtos-lote", label: "Gerenciar Lote", href: "/client/produtos/lotes" },
          { id: "produtos-tray", label: "Tray Download em Lote", href: "/client/produtos/tray" },
          { id: "produtos-etiquetas", label: "Editor de Etiquetas", starred: true, href: "/client/produtos/etiquetas" },
        ],
      },
      {
        id: "usuarios",
        label: "Usuários",
        hasSubmenu: true,
        children: [
          { id: "usuarios-listar", label: "Listar", href: "/client/usuarios" },
          { id: "usuarios-cadastrar", label: "Cadastrar", href: "/client/usuarios/cadastrar" },
          { id: "usuarios-inativos", label: "Inativos", href: "/client/usuarios/inativos" },
          {
            id: "usuarios-grupos",
            label: "Grupos",
            hasSubmenu: true,
            children: [
              { id: "usuarios-grupos-listar", label: "Listar", href: "/client/usuarios/grupos" },
              { id: "usuarios-grupos-cadastrar", label: "Cadastrar", href: "/client/usuarios/grupos/cadastrar" },
            ],
          },
          {
            id: "usuarios-representantes",
            label: "Representantes",
            hasSubmenu: true,
            children: [
              { id: "usuarios-representantes-listar", label: "Listar", href: "/client/usuarios/representantes" },
              { id: "usuarios-representantes-cadastrar", label: "Cadastrar", href: "/client/usuarios/representantes/cadastrar" },
              { id: "usuarios-representantes-inativos", label: "Inativos", href: "/client/usuarios/representantes/inativos" },
              {
                id: "usuarios-representantes-identificadores",
                label: "Identificadores",
                hasSubmenu: true,
                children: [
                  { id: "usuarios-representantes-identificadores-listar", label: "Listar", href: "/client/usuarios/representantes/identificadores" },
                  { id: "usuarios-representantes-identificadores-cadastrar", label: "Cadastrar", href: "/client/usuarios/representantes/identificadores/cadastrar" },
                  { id: "usuarios-representantes-identificadores-inativos", label: "Inativos", href: "/client/usuarios/representantes/identificadores/inativos" },
                  { id: "usuarios-representantes-identificadores-vincular", label: "Vincular a Representante", href: "/client/usuarios/representantes/identificadores/vincular" },
                ],
              },
            ],
          },
          { id: "usuarios-comissoes", label: "Comissões", href: "/client/usuarios/comissoes" },
          { id: "usuarios-atividade", label: "Atividade", starred: true, href: "/client/usuarios/atividade" },
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
              { id: "financeiro-forma-listar", label: "Listar", href: "/client/financeiro/formas-pagamento" },
              { id: "financeiro-forma-cadastrar", label: "Cadastrar", href: "/client/financeiro/formas-pagamento/cadastrar" },
              { id: "financeiro-forma-inativos", label: "Inativos", href: "/client/financeiro/formas-pagamento/inativos" },
            ],
          },
          {
            id: "financeiro-plano",
            label: "Plano de Conta",
            hasSubmenu: true,
            children: [
              { id: "financeiro-plano-listar", label: "Listar", href: "/client/financeiro/plano-conta" },
              { id: "financeiro-plano-cadastrar", label: "Cadastrar", href: "/client/financeiro/plano-conta/cadastrar" },
              { id: "financeiro-plano-inativos", label: "Inativos", href: "/client/financeiro/plano-conta/inativos" },
            ],
          },
          { id: "financeiro-caixa", label: "Caixa", href: "/client/financeiro/caixa" },
        ],
      },
      {
        id: "documentos-fiscais",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "docs-parametros", label: "Parâmetros de Documentos Fiscais", href: "/client/documentos-fiscais/parametros" },
          { id: "docs-certificado", label: "Certificado Digital", href: "/client/documentos-fiscais/certificado" },
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
          { id: "mov-vendas-pdv", label: "PDV", href: "/client/pdv" },
          { id: "mov-vendas-pre", label: "Pré Vendas", href: "/client/movimentacoes/vendas/pre" },
          { id: "mov-vendas-entregas", label: "Painel de Entregas", starred: true, href: "/client/movimentacoes/vendas/entregas" },
          { id: "mov-vendas-abertas", label: "Abertas", href: "/client/movimentacoes/vendas/abertas" },
          { id: "mov-vendas-concluidas", label: "Concluídas", href: "/client/movimentacoes/vendas/concluidas" },
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
          { id: "mov-caixa-selecionar", label: "Selecionar Caixa", href: "/client/caixa" },
          { id: "mov-caixa-relatorio", label: "Relatório de Caixa", href: "/client/movimentacoes/caixa/relatorio" },
          { id: "mov-caixa-conta-corrente", label: "Relatório de Conta Corrente", href: "/client/movimentacoes/caixa/conta-corrente" },
          { id: "mov-caixa-detalhado", label: "Relatório de caixa detalhado", href: "/client/movimentacoes/caixa/detalhado" },
          { id: "mov-caixa-conciliacao", label: "Conciliação Bancária", href: "/client/movimentacoes/caixa/conciliacao" },
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
          { id: "mov-fin-plano", label: "Plano de Conta", href: "/client/financeiro/plano-conta" },
          { id: "mov-fin-receber", label: "Contas a Receber", href: "/client/movimentacoes/financeiro/receber" },
          { id: "mov-fin-pagar", label: "Contas a Pagar", href: "/client/movimentacoes/financeiro/pagar" },
          { id: "mov-fin-fluxo", label: "Fluxo de Caixa", href: "/client/movimentacoes/financeiro/fluxo" },
          { id: "mov-fin-previsao", label: "Previsão de Fluxo de Caixa", href: "/client/movimentacoes/financeiro/previsao" },
          {
            id: "mov-fin-despesas",
            label: "Despesas / Receitas",
            hasSubmenu: true,
            children: [
              { id: "mov-fin-despesas-cadastrar-despesa", label: "Cadastrar Despesa", href: "/client/movimentacoes/financeiro/despesas/cadastrar" },
              { id: "mov-fin-despesas-cadastrar-receita", label: "Cadastrar Receita", href: "/client/movimentacoes/financeiro/receitas/cadastrar" },
              { id: "mov-fin-despesas-listar", label: "Listar Receitas / Despesas", href: "/client/movimentacoes/financeiro/despesas" },
            ],
          },
          { id: "mov-fin-caixa-clientes", label: "Relatório Caixa de Clientes", href: "/client/movimentacoes/financeiro/caixa-clientes" },
          {
            id: "mov-fin-boletos",
            label: "Boletos",
            hasSubmenu: true,
            children: [
              { id: "mov-fin-boletos-recorrentes", label: "Boletos Recorrentes", href: "/client/movimentacoes/financeiro/boletos/recorrentes" },
              { id: "mov-fin-boletos-contas", label: "Contas Bancárias", href: "/client/movimentacoes/financeiro/boletos/contas" },
              { id: "mov-fin-boletos-gerenciar", label: "Gerenciar Boletos", href: "/client/movimentacoes/financeiro/boletos/gerenciar" },
              { id: "mov-fin-boletos-arquivos", label: "Gerenciar Arquivos", href: "/client/movimentacoes/financeiro/boletos/arquivos" },
            ],
          },
        ],
      },
      {
        id: "mov-transferencias",
        label: "Transferências",
        hasSubmenu: true,
        children: [
          { id: "mov-transf-lojas", label: "Listar Lojas", href: "/client/movimentacoes/transferencias/lojas" },
          {
            id: "mov-transf-enviadas",
            label: "Enviadas",
            hasSubmenu: true,
            children: [
              { id: "mov-transf-enviadas-abertas", label: "Abertas", href: "/client/movimentacoes/transferencias/enviadas/abertas" },
              { id: "mov-transf-enviadas-concluidas", label: "Concluídas", href: "/client/movimentacoes/transferencias/enviadas/concluidas" },
              { id: "mov-transf-enviadas-estornadas", label: "Estornadas", href: "/client/movimentacoes/transferencias/enviadas/estornadas" },
              { id: "mov-transf-enviadas-excluidas", label: "Excluídas", href: "/client/movimentacoes/transferencias/enviadas/excluidas" },
            ],
          },
          {
            id: "mov-transf-recebidas",
            label: "Recebidas",
            hasSubmenu: true,
            children: [
              { id: "mov-transf-recebidas-abertas", label: "Abertas", href: "/client/movimentacoes/transferencias/recebidas/abertas" },
              { id: "mov-transf-recebidas-concluidas", label: "Concluídas", href: "/client/movimentacoes/transferencias/recebidas/concluidas" },
              { id: "mov-transf-recebidas-estornadas", label: "Estornadas", href: "/client/movimentacoes/transferencias/recebidas/estornadas" },
              { id: "mov-transf-recebidas-excluidas", label: "Excluídas", href: "/client/movimentacoes/transferencias/recebidas/excluidas" },
            ],
          },
          { id: "mov-transf-buscar", label: "Buscar", href: "/client/movimentacoes/transferencias/buscar" },
        ],
      },
      { id: "mov-contagem", label: "Contagem de Estoque", href: "/client/movimentacoes/contagem" },
      {
        id: "mov-docs",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "mov-docs-nfe", label: "NF-e / NFC-e", href: "/client/movimentacoes/documentos-fiscais/nfe" },
          { id: "mov-docs-nfse", label: "NFS-e(Serviços)", href: "/client/movimentacoes/documentos-fiscais/nfse" },
          { id: "mov-docs-manifestacao", label: "Manifestação do Destinatário", href: "/client/movimentacoes/documentos-fiscais/manifestacao" },
          { id: "mov-docs-param-nfe", label: "Parâmetros de NF-e / NFC-e", href: "/client/documentos-fiscais/parametros" },
          { id: "mov-docs-param-nfse", label: "Parâmetros NFS-e", href: "/client/documentos-fiscais/parametros" },
          { id: "mov-docs-arquivos-contador", label: "Arquivos Fiscais Contador", href: "/client/movimentacoes/documentos-fiscais/arquivos-contador" },
          { id: "mov-docs-gerenciador", label: "Gerenciador Arquivos Fiscais", href: "/client/movimentacoes/documentos-fiscais/gerenciador" },
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
          { id: "rel-auditoria-autorizacao-venda", label: "Autorização de Venda", href: "/client/relatorios/auditoria/autorizacao-venda" },
          { id: "rel-auditoria-estoque", label: "Estoque", href: "/client/relatorios/auditoria/estoque" },
          { id: "rel-auditoria-geral-log", label: "Geral de Log", href: "/client/relatorios/auditoria/geral-log" },
          { id: "rel-auditoria-itens-excluido", label: "Itens Excluído da Venda", href: "/client/relatorios/auditoria/itens-excluido" },
          { id: "rel-auditoria-preco-venda", label: "Preço de Venda", href: "/client/relatorios/auditoria/preco-venda" },
          { id: "rel-auditoria-preco-compra", label: "Preço de Compra", href: "/client/relatorios/auditoria/preco-compra" },
        ],
      },
      {
        id: "rel-clientes",
        label: "Clientes",
        hasSubmenu: true,
        children: [
          { id: "rel-clientes-marketing", label: "Marketing", href: "/client/relatorios/clientes/marketing" },
          { id: "rel-clientes-sem-movimentacao", label: "Clientes sem Movimentação", href: "/client/relatorios/clientes/sem-movimentacao" },
          { id: "rel-clientes-impressao", label: "Impressão/Carta/E-mail", href: "/client/relatorios/clientes/impressao" },
          { id: "rel-clientes-caixa", label: "Relatório Caixa de Clientes", href: "/client/relatorios/clientes/caixa" },
          { id: "rel-clientes-movimentacao", label: "Movimentação", starred: true, href: "/client/relatorios/clientes/movimentacao" },
        ],
      },
      {
        id: "rel-compras",
        label: "Compras",
        hasSubmenu: true,
        children: [
          { id: "rel-compras-detalhada", label: "Compras Detalhada", href: "/client/relatorios/compras/detalhada" },
          { id: "rel-compras-sugestao", label: "Sugestão de Compra", href: "/client/relatorios/compras/sugestao" },
        ],
      },
      { id: "rel-despesa", label: "Despesa", href: "/client/relatorios/despesa" },
      {
        id: "rel-docs",
        label: "Documentos Fiscais",
        hasSubmenu: true,
        children: [
          { id: "rel-docs-documentos-fiscais", label: "Documentos Fiscais", href: "/client/relatorios/documentos-fiscais" },
          { id: "rel-docs-totalizador", label: "Totalizador", href: "/client/relatorios/documentos-fiscais/totalizador" },
          { id: "rel-docs-nfse", label: "NFS-e", href: "/client/relatorios/documentos-fiscais/nfse" },
          { id: "rel-docs-totalizador-nfse", label: "Totalizador (NFS-e)", href: "/client/relatorios/documentos-fiscais/totalizador-nfse" },
        ],
      },
      { id: "rel-dre", label: "DRE Gerencial", href: "/client/relatorios/dre" },
      {
        id: "rel-estoque",
        label: "Estoque",
        hasSubmenu: true,
        children: [
          { id: "rel-estoque-estoque", label: "Estoque", href: "/client/relatorios/estoque" },
          { id: "rel-estoque-detalhado", label: "Detalhado", href: "/client/relatorios/estoque/detalhado" },
          { id: "rel-estoque-por-grade", label: "por Grade", href: "/client/relatorios/estoque/por-grade" },
          { id: "rel-estoque-por-status", label: "por Status", href: "/client/relatorios/estoque/por-status" },
          { id: "rel-estoque-sem-movimentacao", label: "Estoque sem Movimentação", href: "/client/relatorios/estoque/sem-movimentacao" },
          { id: "rel-estoque-minimo-maximo", label: "Mínimo e Máximo", href: "/client/relatorios/estoque/minimo-maximo" },
          { id: "rel-estoque-retroativo", label: "Retroativo", href: "/client/relatorios/estoque/retroativo" },
          { id: "rel-estoque-contagem", label: "Contagem Estoque", href: "/client/relatorios/estoque/contagem" },
          { id: "rel-estoque-fiscal", label: "Estoque Fiscal", href: "/client/relatorios/estoque/fiscal" },
          { id: "rel-estoque-livro-inventario", label: "Livro de Registro de Inventário", href: "/client/relatorios/estoque/livro-inventario" },
        ],
      },
      {
        id: "rel-etiquetas",
        label: "Etiquetas",
        hasSubmenu: true,
        children: [
          { id: "rel-etiquetas-produtos", label: "Produtos", href: "/client/relatorios/etiquetas/produtos" },
          {
            id: "rel-etiquetas-sigep",
            label: "SIGEP",
            hasSubmenu: true,
            children: [
              { id: "rel-etiquetas-sigep-etiqueta", label: "Etiqueta", href: "/client/relatorios/etiquetas/sigep/etiqueta" },
              { id: "rel-etiquetas-sigep-postagem", label: "Postagem", href: "/client/relatorios/etiquetas/sigep/postagem" },
              { id: "rel-etiquetas-sigep-pacotes", label: "Pacotes", href: "/client/relatorios/etiquetas/sigep/pacotes" },
            ],
          },
          {
            id: "rel-etiquetas-de-envio",
            label: "De Envio",
            hasSubmenu: true,
            children: [
              { id: "rel-etiquetas-de-envio-cliente", label: "Cliente", href: "/client/relatorios/etiquetas/envio/cliente" },
              { id: "rel-etiquetas-de-envio-venda", label: "Venda", href: "/client/relatorios/etiquetas/envio/venda" },
            ],
          },
        ],
      },
      {
        id: "rel-financeiro",
        label: "Financeiro",
        hasSubmenu: true,
        children: [
          { id: "rel-financeiro-caixa", label: "Caixa", href: "/client/relatorios/financeiro/caixa" },
          { id: "rel-financeiro-cheque", label: "Cheque", href: "/client/relatorios/financeiro/cheque" },
          { id: "rel-financeiro-cobranca", label: "Cobrança", href: "/client/relatorios/financeiro/cobranca" },
          { id: "rel-financeiro-conferencia-cartao", label: "Conferência de Cartão", href: "/client/relatorios/financeiro/conferencia-cartao" },
          { id: "rel-financeiro-recebimento", label: "Recebimento", href: "/client/relatorios/financeiro/recebimento" },
        ],
      },
      {
        id: "rel-produto",
        label: "Produto",
        hasSubmenu: true,
        children: [
          { id: "rel-produto-tabela-preco", label: "Tabela de Preço", href: "/client/relatorios/produto/tabela-preco" },
          { id: "rel-produto-lote", label: "Lote", href: "/client/relatorios/produto/lote" },
          { id: "rel-produto-tabela-preco-cliente", label: "Tabela de Preço Cliente", href: "/client/relatorios/produto/tabela-preco-cliente" },
        ],
      },
      {
        id: "rel-venda",
        label: "Venda",
        hasSubmenu: true,
        children: [
          { id: "rel-venda-cliente-loja", label: "Cliente/Loja", href: "/client/relatorios/venda/cliente-loja" },
          { id: "rel-venda-comissao", label: "Comissão", href: "/client/relatorios/venda/comissao" },
          { id: "rel-venda-custos-vendas", label: "Custos e Vendas", href: "/client/relatorios/venda/custos-vendas" },
          { id: "rel-venda-custo-x-preco", label: "Custo X Preço de Venda", href: "/client/relatorios/venda/custo-x-preco" },
          { id: "rel-venda-descontos", label: "Descontos em Vendas", href: "/client/relatorios/venda/descontos" },
          { id: "rel-venda-forma-pagamento", label: "Forma de Pagamento", href: "/client/relatorios/venda/forma-pagamento" },
          { id: "rel-venda-itens", label: "Itens das Vendas", href: "/client/relatorios/venda/itens" },
          { id: "rel-venda-meta", label: "Meta", href: "/client/relatorios/venda/meta" },
          { id: "rel-venda-vale-desconto", label: "Vale Desconto", href: "/client/relatorios/venda/vale-desconto" },
          { id: "rel-venda-vale-presente", label: "Vale Presente", href: "/client/relatorios/venda/vale-presente" },
          { id: "rel-venda-resumida", label: "Venda Resumida", href: "/client/relatorios/venda/resumida" },
          { id: "rel-venda-vendedores-mes", label: "Vendedores / Mes", href: "/client/relatorios/venda/vendedores-mes" },
          { id: "rel-venda-cliente-mes", label: "Cliente / Mes", href: "/client/relatorios/venda/cliente-mes" },
        ],
      },
      {
        id: "rel-venda-gerencial",
        label: "Venda Gerencial",
        hasSubmenu: true,
        children: [
          { id: "rel-venda-gerencial-giro", label: "Giro de Mercadorias", href: "/client/relatorios/venda-gerencial/giro" },
          { id: "rel-venda-gerencial-giro-transferencia", label: "Giro de Mercadorias por Transferência", href: "/client/relatorios/venda-gerencial/giro-transferencia" },
          { id: "rel-venda-gerencial-faturamento", label: "Faturamento", href: "/client/relatorios/venda-gerencial/faturamento" },
          { id: "rel-venda-gerencial-faturamento-totalizador", label: "Faturamento Totalizador", starred: true, href: "/client/relatorios/venda-gerencial/faturamento-totalizador" },
          { id: "rel-venda-gerencial-lucratividade", label: "Lucratividade", href: "/client/relatorios/venda-gerencial/lucratividade" },
          { id: "rel-venda-gerencial-produto-mais-vendido", label: "Produto mais Vendido", href: "/client/relatorios/venda-gerencial/produto-mais-vendido" },
          { id: "rel-venda-gerencial-giro-grade", label: "Giro por Grade", href: "/client/relatorios/venda-gerencial/giro-grade" },
          { id: "rel-venda-gerencial-aproveitamento", label: "Aproveitamento de Venda", starred: true, href: "/client/relatorios/venda-gerencial/aproveitamento" },
        ],
      },
    ],
  },
];
