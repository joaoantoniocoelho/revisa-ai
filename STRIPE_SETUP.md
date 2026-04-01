# Configuração do Stripe (Checkout)

Guia completo para configurar a integração de pagamentos via Stripe Checkout no Revisa Aí.

O pagamento usa **Stripe Checkout** — o usuário é redirecionado para uma página hospedada pelo Stripe, paga com cartão, e volta para `/account` com os créditos adicionados automaticamente.

---

## 1. Criar conta no Stripe

1. Acesse [stripe.com](https://stripe.com) e crie uma conta (ou faça login)
2. Complete o onboarding com os dados do seu negócio
3. Cartão de crédito/débito funciona em qualquer conta Stripe — nenhuma verificação especial necessária

---

## 2. Obter as chaves de API

### Modo de teste (development)

1. No dashboard Stripe, certifique-se de estar no modo **Test** (toggle no canto superior esquerdo)
2. Vá em **Developers → API keys**
3. Copie a **Secret key** → `sk_test_...`

### Modo live (produção)

1. Ative o modo **Live** no toggle superior
2. Vá em **Developers → API keys**
3. Copie a **Secret key** → `sk_live_...`

> A secret key nunca deve ser exposta no frontend ou no repositório. O Stripe Checkout não exige publishable key no frontend.

---

## 3. Configurar o webhook

O webhook notifica o backend quando o pagamento é confirmado, adicionando os créditos ao usuário.

**Evento a escutar:** `checkout.session.completed`

### Desenvolvimento local (Stripe CLI)

**1. Instalar o Stripe CLI:**

```bash
# macOS
brew install stripe/stripe-cli/stripe
```

**2. Fazer login** (abre o browser para autenticar com sua conta Stripe):

```bash
stripe login
```

**3. Iniciar o listener:**

```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

A saída vai mostrar:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxx (^C to quit)
```

**4. Copiar o `whsec_...` e colocar no `backend/.env`:**

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

**5. Reiniciar o backend** para carregar a nova variável.

> O listener precisa estar rodando em paralelo com o backend durante os testes locais.

---

**Se você já fez um pagamento e ele ficou `pending`** (o CLI não estava rodando):

1. No dashboard Stripe (modo **Test**) → **Developers → Events**
2. Encontre o evento `checkout.session.completed` correspondente
3. Clique no evento → **Resend**

Isso reprocessa o pagamento sem precisar comprar de novo.

### Produção (Stripe Dashboard)

1. Vá em **Developers → Webhooks → Add endpoint**
2. Preencha:
   - **Endpoint URL:** `https://seu-dominio.com/api/payments/webhook`
   - **Events to listen:** `checkout.session.completed`
3. Salve e copie o **Signing secret** (`whsec_...`) do endpoint criado

---

## 4. Variáveis de ambiente

### Backend — `backend/.env`

```env
STRIPE_SECRET_KEY=sk_test_...       # sk_live_... em produção
STRIPE_WEBHOOK_SECRET=whsec_...     # Do CLI (dev) ou do endpoint (produção)
FRONTEND_URL=http://localhost:3000  # URL do frontend (usada nos redirects do Checkout)
```

> `FRONTEND_URL` já existe no projeto. Em produção, deve apontar para o domínio real (ex: `https://revisaai.com.br`). O Checkout usa essa variável para montar os URLs de `success_url` e `cancel_url`.

### Frontend — não precisa de variáveis adicionais

O Stripe Checkout é totalmente server-side. Não há publishable key nem SDK do Stripe no frontend.

---

## 5. Testar localmente

### 5.1 Subir os serviços

Em terminais separados:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — Stripe CLI
stripe listen --forward-to localhost:3001/api/payments/webhook
```

### 5.2 Fluxo de teste

1. Acesse `http://localhost:3000` e faça login
2. Vá em **Conta** (`/account`)
3. Clique em **Comprar créditos** e selecione um pacote
4. Você será redirecionado para a página de Checkout do Stripe
5. Preencha com um cartão de teste:

| Cenário | Número do cartão | Validade | CVC |
|---------|-----------------|----------|-----|
| Sucesso | `4242 4242 4242 4242` | qualquer data futura | qualquer 3 dígitos |
| Requer 3DS | `4000 0025 0000 3155` | qualquer data futura | qualquer 3 dígitos |
| Recusado | `4000 0000 0000 9995` | qualquer data futura | qualquer 3 dígitos |

6. Após o pagamento, o Stripe redireciona para `/account?session_id=cs_...`
7. A página detecta o `session_id`, inicia polling e aguarda o webhook confirmar
8. Em alguns segundos, o banner verde de confirmação aparece e os créditos são atualizados

### 5.3 Verificar o resultado

- No terminal do Stripe CLI: evento `checkout.session.completed` entregue
- No MongoDB: documento `Payment` com `status: "credited"`
- Na interface: créditos atualizados e banner de confirmação

### 5.4 Testar idempotência

```bash
# Disparar o evento duas vezes com o mesmo session ID
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed
```

Confirme no MongoDB que os créditos foram adicionados apenas uma vez.

### 5.5 Testar erros esperados

**Pacote inválido:**
```bash
curl -X POST http://localhost:3001/api/payments/session \
  -H "Content-Type: application/json" \
  -b "token=SEU_JWT" \
  -d '{"packageId": "invalido"}'
# Esperado: 400
```

**Não autenticado:**
```bash
curl -X POST http://localhost:3001/api/payments/session \
  -H "Content-Type: application/json" \
  -d '{"packageId": "starter"}'
# Esperado: 401
```

**Status de outro usuário:**
```bash
curl http://localhost:3001/api/payments/cs_xxx/status \
  -b "token=JWT_DE_OUTRO_USUARIO"
# Esperado: 404
```

---

## 6. Deploy em produção

### Checklist

- [ ] `STRIPE_SECRET_KEY` configurado com `sk_live_...`
- [ ] `FRONTEND_URL` configurado com o domínio de produção (ex: `https://revisaai.com.br`)
- [ ] Webhook criado no dashboard com a URL de produção, evento `checkout.session.completed`
- [ ] `STRIPE_WEBHOOK_SECRET` atualizado com o signing secret do endpoint de produção
- [ ] Endpoint `/api/payments/webhook` acessível publicamente (sem autenticação)
- [ ] Testar um pagamento real de baixo valor antes do lançamento

### Variáveis de ambiente em produção

**Backend:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://seu-dominio.com.br
```

---

## 7. Monitoramento

- **Stripe Dashboard → Payments:** lista todas as sessões de Checkout com status
- **Stripe Dashboard → Developers → Webhooks → seu endpoint:** histórico de entregas e falhas de webhook
- **MongoDB collection `payments`:** auditoria local (`status: pending | credited | failed`)

Em caso de falha no webhook, o Stripe tenta reenviar automaticamente por até 3 dias com backoff exponencial.
