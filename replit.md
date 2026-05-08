# ArtTee — AI-Powered Custom T-Shirt Store

Loja de camisetas personalizadas com IA. Usuários geram arte com Gemini, compartilham na galeria, e encomendam camisetas impressas via Stripe. Todo o texto da UI está em português brasileiro.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/tshirt-store run dev` — Frontend (Vite, dynamic port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Routing**: Wouter (not React Router — diverges from original spec wording, intentional choice for simplicity)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Firebase Auth (client) + Firebase Admin SDK (server-side token verification)
- AI: Google Gemini via `@google/genai` SDK (`gemini-2.5-flash-image` model)
- Payments: Stripe Checkout + Webhook
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — Firebase token verification, admin claim check
- `artifacts/api-server/src/lib/gemini.ts` — Gemini image generation + refinement
- `artifacts/tshirt-store/src/` — React + Vite frontend
- `artifacts/tshirt-store/src/contexts/AuthContext.tsx` — Firebase auth state, role, token balance
- `artifacts/tshirt-store/src/components/TshirtMockup.tsx` — CSS/SVG t-shirt mockup compositing
- `artifacts/tshirt-store/src/pages/create.tsx` — AI editor with guest conversion modal
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated hooks (do not edit manually)
- `packages/db/src/schema.ts` — Drizzle DB schema

## Architecture decisions

- **Firebase Auth only** (no Clerk). Admin role is driven by a Firebase custom claim (`decoded.admin`), synced to DB on every request in `auth.ts`.
- **Guest tokens**: 3 free uses stored in `guest_sessions` table. Migration to authenticated account uses `SELECT FOR UPDATE` + transaction to prevent double-credit races.
- **Token accounting is atomic**: all debit/refund operations use SQL expressions (`token_balance - 1`) with `WHERE token_balance > 0` guard — never read-modify-write from app layer.
- **Unlike integrity**: wrapped in a transaction — only decrements `likes` counter if a like row was actually deleted.
- **Public APIs never expose email**: `authorName` resolves to `displayName ?? null` only.
- **Wouter** used instead of React Router (task originally specified React Router; Wouter chosen for its simplicity and zero-config base-path support via `<Router base={BASE_URL}>`).
- **mockupUrl** in `tshirt_models` table is empty in development; `TshirtMockup` component falls back to an SVG t-shirt silhouette with CSS compositing when no photo mockup is available.

## Product

- Guest users get 3 free AI image generations without signing up
- Signed-in users can refine, share to gallery, and order on a t-shirt
- Public gallery: approved designs, filterable by style, sortable by recent/popular
- Stripe Checkout for orders; webhook updates order status on payment
- Admin panel: user management, artwork moderation (approve/reject), style/model CRUD

## User preferences

- All UI text must be in Portuguese (Brazilian)

## Gotchas

- `GEMINI_API_KEY` is set but free tier has 0 quota for image models (`gemini-2.5-flash-image`) — generation returns 503 with a user-friendly message
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` not yet configured — webhook fails closed
- After changing OpenAPI spec, run codegen: `pnpm --filter @workspace/api-spec run codegen`
- API server binds to port 8080; frontend reads `$PORT` from env
- `setBaseUrl(null)` in `main.tsx` makes all API calls go through the Vite proxy

## Pointers

- See `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Firebase config served from `/api/config/firebase` endpoint (safe — only public SDK keys)
