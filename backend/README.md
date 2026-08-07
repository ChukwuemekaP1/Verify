# VeriFlow Backend

Production-ready Node.js + Express backend foundation organized with Clean Architecture boundaries.

## Layers

- `modules/*/*.routes.js`: route registration only
- `modules/*/*.controller.js`: HTTP request/response handling only
- `modules/*/*.validator.js`: input schemas only
- `modules/*/*.service.js`: business logic only
- `modules/*/*.repository.js`: persistence only
- `config/*`: runtime config, logging, database
- `middlewares/*`: framework middleware and shared error handling

## Modules

- `health`
- `auth`
- `graduates`
- `institutions`
- `certificates`
- `verifications`
- `profile`

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

The service starts even if MongoDB is unavailable and exposes that degraded state on `GET /api/v1/health`.
