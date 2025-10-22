# 📋 Módulo de Listas de Compras - Sistema Completo

## 📖 Visão Geral

O **Módulo de Listas de Compras** é um sistema completo implementado no backoffice para gerenciar listas de compras com controle avançado de status e quantidades dinâmicas. O sistema permite criar, editar, deletar e acompanhar o progresso de compras com precisão.

## 🎯 Funcionalidades Principais

### ✅ **CRUD Completo**

- **Criar** novas listas de compras
- **Visualizar** todas as listas existentes
- **Editar** listas (adicionar/remover produtos, alterar quantidades)
- **Deletar** listas permanentemente

### 🔄 **Sistema de Status Dinâmico**

- **⏳ PENDING (Aguardando)**: Item na lista, ainda não comprado
- **🛒 PURCHASED (Comprado)**: Item foi comprado, aguardando recebimento
- **✅ RECEIVED (Recebido)**: Item foi recebido e está disponível

### 📊 **Controle de Quantidades Detalhado**

- **📦 Quantidade Pedida**: Quantidade original solicitada
- **✅ Quantidade Recebida**: Quantidade efetivamente recebida
- **❌ Quantidade com Defeito**: Itens recebidos com problemas
- **🔄 Quantidade Devolvida**: Itens devolvidos ao fornecedor
- **🎯 Quantidade Final**: Cálculo automático (Recebido - Defeito - Devolvido)

## 🏗️ Arquitetura Técnica

### **Backend (Node.js + Fastify + Prisma)**

#### **📊 Modelos de Dados**

```prisma
model ShoppingList {
  id          String   @id @default(uuid())
  name        String
  description String?
  items        Json     // JSONB para armazenar lista de produtos
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String   // ID do usuário que criou

  // Relação com itens
  shoppingListItems ShoppingListItem[]

  @@map("shopping_lists")
}

model ShoppingListItem {
  id            String      @id @default(uuid())
  shoppingListId String
  productId     String
  quantity      Float // Quantidade pedida
  notes         String?
  status        String      @default("PENDING") // PENDING, PURCHASED, RECEIVED
  purchased     Boolean     @default(false)
  purchasedAt   DateTime?
  receivedAt    DateTime?
  receivedQuantity Float     @default(0)
  defectiveQuantity Float   @default(0)
  returnedQuantity Float    @default(0)
  finalQuantity   Float      @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  shoppingList  ShoppingList @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  product       Product      @relation(fields: [productId], references: [id])

  @@map("shopping_list_items")
}
```

#### **🛠️ Controllers Implementados**

1. **`create.ts`** - Criar nova lista
2. **`get-all.ts`** - Listar todas as listas
3. **`get.ts`** - Obter lista específica por ID
4. **`update.ts`** - Atualizar lista existente
5. **`delete.ts`** - Deletar lista
6. **`mark-purchased.ts`** - Marcar item como comprado
7. **`update-status.ts`** - Atualizar status do item
8. **`update-quantities.ts`** - Gerenciar quantidades detalhadas

#### **🛣️ Rotas da API**

```typescript
// Shopping Lists Routes
app.post("/invoice/shopping-lists", createShoppingList);
app.get("/invoice/shopping-lists", getAllShoppingLists);
app.get("/invoice/shopping-lists/:id", getShoppingListById);
app.put("/invoice/shopping-lists/:id", updateShoppingList);
app.delete("/invoice/shopping-lists/:id", deleteShoppingList);
app.patch("/invoice/shopping-lists/mark-purchased", markItemAsPurchased);
app.patch("/invoice/shopping-lists/update-status", updateItemStatus);
app.patch("/invoice/shopping-lists/update-quantities", updateItemQuantities);
```

### **Frontend (React + TypeScript + Tailwind)**

#### **📱 Componente Principal: `ShoppingListsTab.tsx`**

**Localização**: `backoffice/src/pages/gestao-invoices/components/sections/ShoppingListsTab.tsx`

#### **🎨 Interface do Usuário**

##### **📋 Lista de Listas**

- **Cards responsivos** com informações básicas
- **Contadores de status** (Aguardando, Comprados, Recebidos)
- **Botões de ação** (Editar, Deletar) com tooltips explicativos
- **Datas de criação** formatadas em português brasileiro

##### **📝 Formulário de Criação/Edição**

- **Nome da lista** (obrigatório)
- **Descrição** (opcional)
- **Seleção de produtos** da base de produtos cadastrados
- **Quantidades** para cada produto
- **Notas** específicas por item

##### **🔄 Sistema de Status Visual**

- **Badges coloridos** para cada status:
  - 🟡 **Aguardando**: Fundo amarelo
  - 🔵 **Comprado**: Fundo azul
  - 🟢 **Recebido**: Fundo verde
- **Botões contextuais** baseados no status atual
- **Datas de transição** (comprado em, recebido em)

##### **📊 Modal de Quantidades**

- **Interface intuitiva** para gerenciar quantidades
- **Validação automática** (defeito + devolvido ≤ recebido)
- **Cálculo automático** da quantidade final
- **Campos organizados** por tipo de quantidade

#### **💡 Sistema de Tooltips Inteligente**

**Componente Customizado**: `Tooltip`

**Características**:

- **Posicionamento inteligente** (top, bottom, left, right)
- **Largura máxima configurável** para evitar cortes
- **Quebra de linha automática** para textos longos
- **Sombra pronunciada** para melhor visibilidade
- **Seta indicativa** apontando para o elemento

**Tooltips Implementados**:

- **Título da seção**: "Sistema completo com controle de status e quantidades"
- **Botão Nova Lista**: "Criar nova lista de compras"
- **Botão Editar**: "Editar lista: adicionar/remover produtos"
- **Botão Deletar**: "Deletar lista permanentemente"
- **Status Badges**: "Status: [nome]. Use os botões para alterar"
- **Botão Comprar**: "Marcar como comprado"
- **Botão Quantidades**: "Gerenciar quantidades detalhadas"
- **Botão Reverter**: "Reverter para aguardando"

## 🔧 Integração com Sistema Existente

### **📦 Base de Produtos**

- **Integração** com produtos já cadastrados em `/invoices-management`
- **Reutilização** da estrutura de produtos existente
- **Relacionamento** bidirecional entre `Product` e `ShoppingListItem`

### **🎯 Rota de Integração**

- **Localização**: `/invoices-management`
- **Tab**: "Listas de Compras" (terceira aba)
- **Ícone**: `ShoppingCart` do Lucide React
- **Permissão**: Sempre visível para usuários autenticados

### **🔗 Navegação**

```typescript
// Em Tabs.tsx
{
  id: "shopping-lists",
  label: "Listas de Compras",
  icon: <ShoppingCart />,
  path: "/invoices-management/shopping-lists"
}
```

## 🚀 Fluxo de Uso

### **1. Criar Nova Lista**

1. Clicar em **"Nova Lista"**
2. Preencher **nome** e **descrição**
3. **Selecionar produtos** da lista disponível
4. Definir **quantidades** para cada produto
5. Adicionar **notas** se necessário
6. **Salvar** a lista

### **2. Gerenciar Status**

1. **Aguardando → Comprado**: Clicar em "🛒 Comprar"
2. **Comprado → Recebido**: Usar "📊 Quantidades" para detalhar recebimento
3. **Recebido → Aguardando**: Clicar em "🔄 Reverter" (se necessário)

### **3. Controlar Quantidades**

1. Clicar em **"📊 Quantidades"** em itens comprados/recebidos
2. Informar **quantidade recebida**
3. Informar **quantidade com defeito** (se houver)
4. Informar **quantidade devolvida** (se houver)
5. **Quantidade final** é calculada automaticamente
6. **Salvar** as alterações

### **4. Editar Lista**

1. Clicar em **"Editar"** na lista desejada
2. **Modificar** nome, descrição ou produtos
3. **Adicionar/remover** produtos conforme necessário
4. **Alterar quantidades** dos produtos existentes
5. **Salvar** as alterações

### **5. Deletar Lista**

1. Clicar em **"Deletar"** na lista desejada
2. **Confirmar** a exclusão no modal
3. Lista é **removida permanentemente**

## 🎨 Design System

### **🎨 Cores e Estilos**

- **Gradientes modernos**: `from-slate-50 via-blue-50 to-indigo-50`
- **Cards**: `shadow-xl` e `rounded-2xl`
- **Botões**: Gradientes `from-blue-600 to-indigo-600`
- **Status badges**: Cores específicas por status
- **Tooltips**: Fundo escuro `bg-gray-900` com texto branco

### **📱 Responsividade**

- **Grid responsivo** para listas
- **Cards adaptáveis** em diferentes tamanhos de tela
- **Botões otimizados** para mobile
- **Tooltips inteligentes** que se adaptam ao espaço

### **🎭 Animações**

- **Hover effects** suaves em botões
- **Transições** em tooltips
- **Feedback visual** em interações
- **Loading states** durante operações

## 🔍 Validações e Segurança

### **✅ Validações Frontend**

- **Nome obrigatório** para novas listas
- **Quantidades positivas** para produtos
- **Validação de quantidades** (defeito + devolvido ≤ recebido)
- **Confirmação** para ações destrutivas

### **🛡️ Validações Backend**

- **Schema validation** com Zod
- **Verificação de existência** de produtos
- **Validação de relacionamentos** entre entidades
- **Tratamento de erros** com AppError

### **🔒 Segurança**

- **Autenticação** obrigatória para acesso
- **Validação de dados** em todas as operações
- **Sanitização** de inputs
- **Rate limiting** nas APIs

## 📊 Métricas e Relatórios

### **📈 Contadores Automáticos**

- **Total de listas** criadas
- **Itens aguardando** compra
- **Itens comprados** mas não recebidos
- **Itens recebidos** com sucesso
- **Taxa de defeitos** por produto
- **Taxa de devoluções** por produto

### **📋 Relatórios Disponíveis**

- **Lista por status** (filtros automáticos)
- **Histórico de compras** por produto
- **Performance de fornecedores** (baseado em defeitos/devoluções)
- **Tendências de consumo** por produto

## 🚀 Melhorias Futuras

### **🔮 Funcionalidades Planejadas**

- **📧 Notificações** por email quando itens são recebidos
- **📱 App mobile** para acompanhamento em campo
- **📊 Dashboard** com gráficos de performance
- **🔄 Integração** com sistemas de estoque
- **📋 Templates** de listas frequentes
- **👥 Compartilhamento** de listas entre usuários
- **📅 Agendamento** de compras recorrentes

### **⚡ Otimizações Técnicas**

- **🔄 Cache** de produtos frequentemente usados
- **📊 Paginação** para listas grandes
- **🔍 Busca** avançada em listas
- **📱 PWA** para uso offline
- **🔄 Sincronização** em tempo real

## 🐛 Troubleshooting

### **❌ Problemas Comuns**

#### **"Erro ao carregar listas de compras"**

- **Causa**: Prisma client desatualizado
- **Solução**: `npx prisma generate` e reiniciar backend

#### **"Cannot read properties of undefined (reading 'name')"**

- **Causa**: Estrutura de dados incorreta entre frontend/backend
- **Solução**: Verificar se `shoppingListItems` está sendo retornado

#### **Tooltips cortados**

- **Causa**: Posicionamento inadequado
- **Solução**: Usar `position` e `maxWidth` adequados

#### **Quantidades não aparecem**

- **Causa**: Campos novos não populados no banco
- **Solução**: Executar script de migração de dados

### **🔧 Comandos Úteis**

```bash
# Regenerar Prisma client
npx prisma generate

# Aplicar mudanças no banco
npx prisma db push

# Verificar status do banco
npx prisma studio

# Testar API
curl http://localhost:3333/invoice/shopping-lists
```

## 📚 Documentação Técnica

### **🔗 Arquivos Relacionados**

#### **Backend**

- `backend/prisma/schema.prisma` - Modelos de dados
- `backend/src/http/controllers/invoices/routes.ts` - Rotas principais
- `backend/src/http/controllers/invoices/shopping-lists/` - Controllers específicos

#### **Frontend**

- `backoffice/src/pages/gestao-invoices/components/sections/ShoppingListsTab.tsx` - Componente principal
- `backoffice/src/pages/gestao-invoices/InvocesManagement.tsx` - Integração com tabs
- `backoffice/src/pages/gestao-invoices/layout/Tabs.tsx` - Navegação

#### **Configuração**

- `package.json` - Scripts do monorepo
- `backoffice/src/services/api.ts` - Configuração da API

### **📖 Referências**

- **Prisma ORM**: https://www.prisma.io/docs
- **Fastify**: https://www.fastify.io/docs/latest/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide React**: https://lucide.dev/

---

## 🎉 Conclusão

O **Módulo de Listas de Compras** representa uma solução completa e robusta para gerenciamento de compras, oferecendo:

- ✅ **Interface intuitiva** com tooltips explicativos
- ✅ **Controle granular** de status e quantidades
- ✅ **Integração perfeita** com o sistema existente
- ✅ **Arquitetura escalável** e bem documentada
- ✅ **Experiência do usuário** otimizada

O sistema está pronto para uso em produção e pode ser facilmente estendido com novas funcionalidades conforme necessário.

**Desenvolvido com ❤️ para Black Rabbit** 🐰
