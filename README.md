# Gestor Legal (SaaS Jurídico)

Plataforma SaaS completa para gestão de processos jurídicos com foco em:

- Controle total de prazos, audiências e intimações
- Parser inteligente de e-mails dos tribunais
- Histórico completo de ações (auditoria)
- Experiência moderna, responsiva e mobile-first
- Modelo multiusuário com perfis `admin`, `operador` e `cliente`

## Stack

- **Frontend:** Next.js 14 + React 18
- **Backend:** Node.js + Express + JWT
- **Banco:** PostgreSQL

## Estrutura

```bash
apps/
  api/  # backend REST
  web/  # frontend Next.js
db/
  schema.sql
```

## Funcionalidades implementadas

### Backend

- Login com JWT (`/auth/login`)
- Gestão de processos com validação de duplicidade
- Dashboard resumido com cards e lista priorizada
- Webhook premium para ingestão de e-mails de tribunais (`/emails/webhook`)
- Parser com validação inteligente:
  - processo não encontrado -> `parser_alerts`
  - dados incompletos -> `pendente_revisao`
- Histórico/auditoria em `audit_logs`

### Frontend

- Tela de login com impacto visual e frase “Nunca mais perca um prazo”
- Dashboard moderno com cards de urgência e agenda
- Tela de processo com dados e histórico
- Layout responsivo com CSS mobile-first

## Rodando localmente

1. Instale dependências:

```bash
npm install
```

2. Configure ambiente:

```bash
cp .env.example .env
```

3. Suba banco PostgreSQL e aplique schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

4. Rode API + Web:

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

## Alertas e automação

Os alertas de prazo estão preparados para integração com:

- E-mail
- WhatsApp
- Push notification

A estratégia recomendada é usar workers/queues (BullMQ + Redis) para disparos 3 dias, 1 dia e no dia do vencimento.
