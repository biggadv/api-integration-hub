# OAB Quest

Plataforma de estudo gamificada estilo Duolingo para preparação da prova da OAB (FGV).

## Como rodar localmente

1. Instale Node.js 18+.
2. Instale dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   node server.js
   ```
4. Abra no navegador:
   - `http://localhost:3000` (recomendado), ou
   - abrir `index.html` diretamente.

## Variáveis de ambiente (opcional)

Crie um `.env` para customizar:

- `PORT=3000`
- `JWT_SECRET=sua-chave`
- `OPENAI_API_KEY=...`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_MODEL=gpt-4o-mini`
- `STRIPE_SECRET_KEY=...`
- `APP_BASE_URL=http://localhost:3000`
- `FREE_DAILY_LIMIT=15`

Sem `OPENAI_API_KEY`, o sistema usa gerador mock gratuito automaticamente.
