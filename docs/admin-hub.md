# Admin Hub — AI T-Studio

## Visão Geral

O **Admin Hub** é um painel administrativo standalone, acessível em `/admin/`, separado da loja principal. Ele oferece controle total sobre pedidos, erros, integrações e lojas externas conectadas à plataforma AI T-Studio.

Acesso restrito: somente usuários autorizados (configurados via `ADMIN_UIDS` ou coleção `admins/{uid}` no Firestore) conseguem entrar após autenticação via Google.

---

## Acesso e Autenticação

- **URL:** `/admin/`
- **Login:** Google (Firebase Auth — mesmo projeto da loja: `tee-studio-75a62`)
- **Autorização:** o UID do usuário autenticado é verificado contra:
  1. Variável de ambiente `ADMIN_UIDS` (lista separada por vírgula)
  2. Documento `admins/{uid}` no Firestore
- Se não autorizado, exibe mensagem de acesso restrito com o UID do usuário para facilitar o provisionamento.

---

## Estrutura de Abas

### 1. Pedidos

Tabela completa de todos os pedidos de todas as lojas conectadas.

**Colunas:**
| Campo | Descrição |
|---|---|
| ID | Primeiros 8 caracteres do ID do documento Firestore |
| E-mail | E-mail do cliente |
| Estilo | Estilo de arte solicitado |
| Status | Select inline para alterar o status |
| Valor | Valor formatado em BRL |
| Loja | `storeId` de origem |
| Data | Data/hora de criação |

**Filtros disponíveis:**
- **Busca textual:** por e-mail, ID, estilo ou sessionId
- **Filtro por loja:** dropdown "Todas as lojas" + lista de lojas carregadas do Firestore

**Expansão de linha:** clique em qualquer linha para expandir detalhes completos: UID, session, modelo, cor, tamanho, quantidade, status de upscale, data de conclusão/erro e miniatura da arte.

**Alterar status inline:** o select na tabela e no kanban chama `PATCH /api/admin/forders/:id/status` imediatamente.

---

### 2. Erros

Lista de pedidos com status `erro_processamento`, apresentados em cards vermelhos com informações de diagnóstico: cliente, estilo, data do erro, data de criação e sessionId.

Cada card tem um select para mover o pedido para outro status (ex.: reprocessar como `processing`).

Quando não há erros, exibe confirmação visual verde.

---

### 3. Replicate

Painel de monitoramento da conta Replicate usada para upscaling via Real-ESRGAN.

**Seção Conta:**
- Usuário, nome, tipo e link para GitHub

**Seção Predições Recentes:**
- Tabela com ID, modelo, status (colorido), duração e data das últimas 10 predições
- Status com badges: `succeeded` (verde), `failed` (vermelho), `processing` (azul), `starting` (amarelo), `canceled` (cinza)

---

### 4. Kanban

Quadro visual drag-and-drop com todos os pedidos organizados por status.

**Colunas:**
| Status | Label | Cor |
|---|---|---|
| `processing` | Processando | Azul |
| `aguardando_producao` | Aguard. Produção | Âmbar |
| `em_producao` | Em Produção | Laranja |
| `enviado` | Enviado | Roxo |
| `entregue` | Entregue | Verde |
| `erro_processamento` | Erro | Vermelho |

**Arrastar e soltar:** mova um card entre colunas para atualizar o status via API automaticamente.

Cada card mostra: miniatura da arte (ou spinner se em processamento), estilo, e-mail do cliente, data e valor.

---

### 5. Lojas

Gerenciamento completo das lojas conectadas à plataforma.

**Funcionalidades por loja:**
- Visualizar nome, ID, plataforma e status (ativa/inativa)
- Revelar/ocultar chave de API
- Copiar chave de API para a área de transferência
- Rotacionar chave de API (gera nova chave via `POST /api/admin/stores/:id/rotate-key`)
- Ativar/desativar loja (toggle)
- Desativar loja permanente (soft-delete — documento preservado no Firestore)
- Visualizar e copiar URL de ingestão de pedidos
- Visualizar webhook de retorno (se configurado)

**Criar nova loja:**
- Modal com campos: Nome, Plataforma e URL de Webhook (opcional)
- Plataformas aceitas: `custom`, `shopify`, `woocommerce`, `nuvemshop`
- Chave de API gerada automaticamente no servidor

**Loja padrão (`tshirt-store`):** não pode ser desativada via delete; toggle de ativo ainda funciona.

---

## API — Endpoints do Admin Hub

Todos os endpoints abaixo exigem header `Authorization: Bearer <firebase_id_token>` de um usuário administrador.

### Pedidos

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/admin/forders` | Lista todos os pedidos (aceita `?storeId=` para filtrar) |
| `PATCH` | `/api/admin/forders/:id/status` | Atualiza o status de um pedido |
| `GET` | `/api/admin/replicate/account` | Info da conta + predições recentes do Replicate |

### Lojas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/admin/stores` | Lista todas as lojas |
| `POST` | `/api/admin/stores` | Cria nova loja |
| `PATCH` | `/api/admin/stores/:storeId` | Atualiza nome/plataforma/webhookUrl/active |
| `POST` | `/api/admin/stores/:storeId/rotate-key` | Gera nova chave de API |
| `DELETE` | `/api/admin/stores/:storeId` | Desativa loja (soft-delete, preserva documento) |

### Ingestão de Pedidos (público — autenticado por API key)

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/ingest/:storeId/orders` | Recebe pedido de loja externa |

**Header obrigatório:** `x-api-key: <chave_da_loja>`

**Body aceito:**
```json
{
  "customerEmail": "cliente@exemplo.com",
  "style": "Cyberpunk",
  "model": "premium",
  "size": "M",
  "color": "Preto",
  "quantity": 1,
  "amount": 9900,
  "currency": "brl",
  "artworkUrl": "https://...",
  "artworkFilename": "arte.png",
  "sessionId": "...",
  "uid": "..."
}
```

**Resposta de sucesso:**
```json
{ "orderId": "<id_do_documento_firestore>" }
```

---

## Modelo de Dados — Firestore

### Coleção `stores/{storeId}`

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome da loja |
| `platform` | string | Plataforma: `custom`, `shopify`, `woocommerce`, `nuvemshop` |
| `apiKey` | string | Chave de API gerada automaticamente (`sk_...`) |
| `active` | boolean | Se a loja está ativa |
| `webhookUrl` | string\|null | URL para notificações de retorno |
| `createdAt` | ISO string | Data de criação |
| `deactivatedAt` | ISO string | Data de desativação (se soft-deleted) |

### Coleção `orders/{orderId}` — campos adicionados pela ingestão

| Campo | Tipo | Descrição |
|---|---|---|
| `storeId` | string | ID da loja de origem |
| `storeName` | string | Nome da loja no momento da ingestão |
| `ingestedAt` | ISO string | Timestamp de recebimento via API |

---

## Status de Pedidos

| Status | Descrição |
|---|---|
| `processing` | Em processamento de arte/pagamento |
| `aguardando_producao` | Arte aprovada, aguardando produção |
| `em_producao` | Em produção na gráfica |
| `enviado` | Enviado ao cliente |
| `entregue` | Entregue ao cliente |
| `erro_processamento` | Falha no processamento |

---

## Configuração

| Variável de Ambiente | Descrição |
|---|---|
| `ADMIN_UIDS` | UIDs Firebase de admins separados por vírgula |
| `FIREBASE_*` | Credenciais do Firebase (Auth + Firestore) |
| `REPLICATE_API_TOKEN` | Token da conta Replicate |

---

## Arquitetura

```
artifacts/admin/          # SPA React + Vite
  src/
    App.tsx               # Toda a UI do Admin Hub (login + 5 abas)
    index.css             # Design tokens (cores, tipografia)
    main.tsx              # Entry point
  firebase-applet-config.json  # Config do Firebase Client
  vite.config.ts          # Proxy /api → API Server (port 8080)

artifacts/api-server/src/routes/
  stores.ts               # CRUD de lojas + endpoint de ingestão
  admin-firestore.ts      # Listagem/atualização de pedidos + Replicate
```

O Admin Hub é servido em `/admin/` pelo Vite (dev) ou como arquivo estático (produção). Todas as chamadas de API usam `/api/...` (roteadas pelo proxy da plataforma para o API Server na porta 8080).
