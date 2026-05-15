# AI T-Studio — Roadmap de Funcionalidades

## Visão Geral

Este documento descreve as funcionalidades planejadas para o roadmap do AI T-Studio, organizadas por dependência e prioridade de implementação.

---

## Dependências entre tarefas

```
#12 Upscaling + Armazenamento
  └── #15 Status do Pedido + WhatsApp
        └── #16 Área de Admin + Kanban
              └── #17 Mercado Envios

#13 Optin de Galeria + Pontos     (independente)
#14 Privacidade + Cookies         (independente)
```

---

## Tarefa #12 — Upscaling e Armazenamento de Artes Pós-Compra

### O que e por quê
Após a confirmação do pagamento via Stripe webhook, fazer o upscaling da arte gerada com um serviço externo (ex: Real-ESRGAN via Replicate, ou similar), armazenar a imagem em alta resolução no Firebase Storage e nomeá-la seguindo o padrão `email+data+estilo`. Garante que o cliente receba arte em qualidade de impressão e que o administrador tenha acesso organizado às artes.

### Pronto quando
- Webhook do Stripe (`checkout.session.completed`) dispara o fluxo de upscaling automaticamente
- A imagem é upscalada de 1x para 4x usando serviço externo de IA
- A imagem final é armazenada no Firebase Storage com nome no formato `{email}_{YYYYMMDD}_{estilo}.png`
- O administrador consegue listar e baixar as artes pelo painel de admin
- Um link de download da arte em alta resolução é enviado ao cliente por e-mail

### Fora do escopo
- Interface de admin para visualização (tarefa #16)
- Envio via WhatsApp (tarefa #15)
- Optin de galeria (tarefa #13)

### Passos
1. Configurar webhook Stripe no backend — endpoint `/webhooks/stripe` escutando `checkout.session.completed` com verificação de assinatura
2. Integrar serviço de upscaling — conectar API (ex: Replicate/Real-ESRGAN) via variável de ambiente; receber imagem original em base64 e retornar versão 4x
3. Armazenamento no Firebase Storage — salvar imagem com nome `{email}_{YYYYMMDD}_{estilo}.png`; registrar URL e metadata no Firestore na coleção `orders`
4. Notificação ao cliente — enviar e-mail com link de download via Stripe (receipt email) ou Firebase Extensions

---

## Tarefa #13 — Optin de Galeria e Sistema de Pontos de Rebate

### O que e por quê
Permitir que o cliente autorize, no momento da compra, que sua arte seja exibida na galeria comunitária e reutilizada como base por outros clientes. Quando um cliente usar uma arte originada por outro, o dono original recebe pontos que podem ser convertidos em desconto na próxima compra.

### Pronto quando
- No fluxo de checkout há um checkbox claro pedindo autorização para exibir e reutilizar a arte na galeria
- Artes autorizadas aparecem na galeria pública do app com atribuição ao criador
- Quando outro cliente seleciona uma arte da galeria como base, o criador original recebe pontos registrados no Firestore
- O cliente vê seu saldo de pontos no Dashboard e pode aplicar desconto na próxima compra
- Desconto é gerado como cupom Stripe ou abatimento calculado server-side no `create-session`

### Fora do escopo
- Moderação manual das artes (tarefa #16 — Área de Admin)
- Transferência de pontos entre usuários
- Expiração de pontos (versão inicial sem expiração)

### Passos
1. Optin no checkout — adicionar campo `shareInGallery` ao formulário de checkout e armazená-lo na ordem no Firestore
2. Galeria comunitária conectada ao Firestore — substituir dados mock por query real filtrando `shareInGallery = true`; exibir arte, estilo e nome do criador
3. Reutilização de artes da galeria — ao clicar em uma arte da galeria, iniciar a Oficina com aquela arte como base; registrar `sourceDesignId` e `sourceOwnerUid` na nova ordem
4. Sistema de pontos no Firestore — criar coleção `points` por usuário; ao detectar `sourceOwnerUid` em uma compra concluída (webhook), incrementar os pontos do criador original
5. Resgate de pontos no checkout — verificar saldo de pontos do usuário autenticado e aplicar desconto proporcional; deduzir pontos usados após pagamento confirmado

---

## Tarefa #14 — Política de Privacidade e Modal de Cookies

### O que e por quê
Criar uma página estática de Política de Privacidade em conformidade com a LGPD e exibir um banner/modal de consentimento de cookies na primeira visita do usuário. Requisitos legais mínimos para operação da loja no Brasil.

### Pronto quando
- Existe uma rota `/privacidade` com o conteúdo completo da Política de Privacidade em Português do Brasil
- No rodapé do site há um link para a Política de Privacidade
- Na primeira visita, um banner discreto aparece na parte inferior da tela pedindo consentimento para uso de cookies
- O usuário pode aceitar todos, recusar ou personalizar; a escolha é salva no `localStorage`
- O banner não reaparece após o consentimento

### Fora do escopo
- Sistema de consentimento granular avançado (CMP completo)
- Gestão de cookies de terceiros além do Firebase Analytics
- Conteúdo jurídico detalhado validado por advogado

### Passos
1. Página de Política de Privacidade — criar página `PrivacyPage` na SPA com texto completo em PT-BR cobrindo coleta de dados, Firebase, Stripe, cookies e direitos LGPD; adicionar link no rodapé
2. Modal/banner de cookies — criar componente `CookieConsent` que aparece na primeira visita com opções de aceitar/recusar; salvar escolha em `localStorage`

---

## Tarefa #15 — Status do Pedido e Notificações via WhatsApp
*Depende de: #12*

### O que e por quê
Criar uma área "Meus Pedidos" no painel do cliente mostrando o status de cada pedido (Aguardando pagamento → Processando arte → Em produção → Enviado → Entregue). Integrar envio de mensagens automáticas via WhatsApp Business API (ex: Twilio, Z-API ou Evolution API) a cada mudança de status.

### Pronto quando
- O cliente logado vê a página "Meus Pedidos" com todos os seus pedidos e status atual em tempo real (Firestore listener)
- Cada pedido exibe: miniatura da arte, modelo/cor/tamanho, data, status com indicador visual (timeline/badge)
- Ao confirmar pagamento (webhook Stripe), o status avança automaticamente para "Processando arte"
- Quando o admin atualiza o status no Kanban, o cliente recebe mensagem WhatsApp automática com o novo status e link de rastreamento
- O número de WhatsApp do cliente é coletado no checkout (campo opcional)

### Fora do escopo
- Chat bidirecional com o cliente via WhatsApp
- Notificações por SMS ou push
- Rastreamento automático de transportadora (tarefa #17)

### Passos
1. Coleta de WhatsApp no checkout — adicionar campo de telefone opcional no `CheckoutSidebar`; salvar junto com a ordem no Firestore
2. Página "Meus Pedidos" — criar aba/página no Dashboard com lista de pedidos em tempo real via Firestore `onSnapshot`; exibir timeline de status com ícones e datas
3. Modelo de dados de status — definir os 5 status no Firestore e criar campo `statusHistory` (array com status + timestamp) em cada ordem
4. Backend de notificação WhatsApp — criar serviço no API server que chama a API de WhatsApp escolhida ao receber um novo status; configurar templates de mensagem em PT-BR
5. Disparo automático por webhook — ao receber `checkout.session.completed`, avançar status e enviar WhatsApp; expor endpoint interno para o admin acionar ao mudar status no Kanban

---

## Tarefa #16 — Área de Admin com Kanban de Ordens
*Depende de: #12, #15*

### O que e por quê
Criar uma área administrativa protegida por autenticação de admin (custom claim do Firebase Auth) onde o administrador pode visualizar todas as compras, artes geradas, gerenciar estilos de design e refinar prompts existentes. O centro da área é um Kanban com as ordens organizadas por status.

### Pronto quando
- Rota `/admin` acessível apenas para usuários com claim `admin: true` no Firebase Auth
- Dashboard de admin exibe: total de vendas, artes geradas, pedidos pendentes e receita
- Kanban com colunas: Aguardando Pagamento / Processando Arte / Em Produção / Enviado / Entregue
- Cada card do Kanban mostra miniatura da arte, cliente, modelo/cor/tamanho e botão para avançar status
- Aba "Artes" lista todas as imagens geradas com link de download (nome: email+data+estilo)
- Aba "Estilos" permite adicionar novos estilos e editar prompts dos estilos existentes, com salvamento no Firestore
- Ao mover um card no Kanban, dispara a notificação WhatsApp ao cliente automaticamente

### Fora do escopo
- Multi-admin ou sistema de permissões granulares
- Relatórios e exportação de dados (fase futura)
- Integração com Mercado Envios (tarefa #17)

### Passos
1. Autenticação admin — adicionar custom claim `admin: true` via Firebase Admin SDK; criar middleware de verificação no backend; proteger rota `/admin` no frontend
2. Kanban de ordens — criar componente Kanban com as 5 colunas, cards arrastáveis (drag-and-drop), atualização de status no Firestore ao soltar o card
3. Dashboard de métricas — exibir totais de vendas, artes e receita agregando dados da coleção `orders` no Firestore
4. Aba de artes geradas — listar imagens da coleção `orders` com pré-visualização em miniatura, nome formatado e botão de download do Firebase Storage
5. Aba de gestão de estilos e prompts — CRUD de estilos no Firestore (`styles` collection); editor de prompt base por estilo; sincronizar com leitura dinâmica do Firestore
6. Disparo de notificação ao mover card — ao atualizar status no Kanban, chamar endpoint do backend que envia WhatsApp ao cliente

---

## Tarefa #17 — Integração Mercado Envios no Kanban
*Depende de: #16*

### O que e por quê
Integrar a API do Mercado Envios para cotar e contratar fretes diretamente dentro do Kanban de ordens do Admin. O administrador pode selecionar a transportadora, gerar a etiqueta de envio e o número de rastreamento é enviado automaticamente ao cliente.

### Pronto quando
- No card do Kanban de cada ordem, existe um botão "Cotar Frete" que abre um painel lateral
- O painel exibe as opções de frete disponíveis (PAC, Sedex, etc.) com preço e prazo estimado em tempo real via API Mercado Envios
- O admin seleciona a opção e clica em "Contratar" — a etiqueta é gerada e disponibilizada para impressão
- O número de rastreamento é salvo no Firestore e exibido no card do Kanban e na página "Meus Pedidos" do cliente
- O cliente recebe notificação WhatsApp com o código de rastreamento e link de acompanhamento

### Fora do escopo
- Cálculo de frete automático no checkout para o cliente final (melhoria futura)
- Integração com outras transportadoras fora do Mercado Envios
- Impressão em lote de etiquetas

### Passos
1. Autenticação Mercado Livre/Envios — configurar OAuth2 do Mercado Livre no backend; armazenar token de acesso com refresh automático
2. Endpoint de cotação de frete — criar rota no API server que recebe dados do pedido (CEP destino, dimensões, peso) e retorna opções do Mercado Envios
3. Endpoint de contratação e geração de etiqueta — criar rota que contrata o frete escolhido, obtém a etiqueta PDF e devolve o código de rastreamento
4. UI no Kanban — adicionar painel lateral no card com as opções de frete, botão de contratar e visualizador/downloader da etiqueta
5. Propagação do rastreamento — salvar código no Firestore; exibir no Kanban e em "Meus Pedidos"; enviar WhatsApp com o rastreamento
