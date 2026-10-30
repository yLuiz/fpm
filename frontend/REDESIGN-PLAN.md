# Plano de Redesign do Frontend — FPM (Sakai-style + shadcn/ui)

> **Atualização (out/2026):** a identidade visual passou a seguir o design system industrial
> descrito em `../docs/design/design-system-junglerms.md` (tema escuro único, acento `#66A197`, bordas
> `#6F6F90`, sem sombras, menu lateral recolhível). O tema claro e a topbar foram removidos.
> Tokens em `src/index.css` (`--ds-*`), cores de gráfico em `src/lib/chart-colors.ts`.
> O restante deste documento registra a primeira fase (Sakai) e está desatualizado quanto ao visual.

> **Objetivo:** repaginar o frontend do FPM (Factory Preventive Maintenance) com **shadcn/ui**,
> inspirado no template admin **Sakai** (https://sakai.primereact.org/): sidebar lateral + topbar,
> modo claro/escuro, cards de KPI com ícones, gráficos no dashboard e componentes polidos.
>
> **Contexto:** POC — precisa ficar **bonito e funcional**. Backend **não será alterado**;
> apenas consumimos as APIs existentes.
>
> Este arquivo é a **fonte da verdade** da implementação. Toda a execução deve segui-lo e
> marcar progresso na seção [Status de Execução](#status-de-execução).

---

## Stack atual (diagnóstico)

- React 18 + Vite + TypeScript + **Tailwind v3** + React Router DOM + Axios
- Alias `@/*` já no `tsconfig.json` (falta espelhar no `vite.config.ts`)
- 7 páginas: `Login`, `Dashboard`, `EquipmentList`, `EquipmentDetail`, `EquipmentForm`,
  `MaintenanceRegister`, `Settings` + `Layout` + `AuthContext`
- Classes CSS caseiras em `index.css`: `.card`, `.btn-primary/secondary/danger`,
  `.input-field`, `.badge*` — serão migradas para componentes shadcn
- Paleta `primary-{50..900}` (azul) no `tailwind.config.js`

### ⚠️ Conflito conhecido a resolver
O código usa `primary-600` (escala numérica). O shadcn usa `primary` como **token semântico**
(`bg-primary` / `text-primary-foreground`), o que quebra `primary-600`. Como todas as páginas
serão reescritas, trocamos as referências pelos tokens/componentes shadcn e mantemos o **azul**
como cor de marca no token `--primary`.

---

## Fase 0 — Setup do shadcn/ui

1. Ajustar alias `@/*` em `vite.config.ts` usando `fileURLToPath(import.meta.url)`
   (sem depender de `@types/node`).
2. Instalar deps: `class-variance-authority`, `clsx`, `tailwind-merge`,
   `tailwindcss-animate`, `lucide-react`, `recharts`.
3. `npx shadcn@latest init` — gera `components.json`, `src/lib/utils.ts` (`cn()`),
   injeta variáveis de tema (claro/escuro) em `index.css` e `tailwind.config.js`.
4. Adicionar componentes:
   `button card table input label select badge checkbox textarea dropdown-menu`
   `avatar separator sheet tooltip sonner skeleton chart alert-dialog`.

## Fase 1 — Shell de layout (a "cara" do Sakai)

Substituir a navbar-topo por **sidebar + topbar**:
- **Sidebar** colapsável com logo "FPM" e navegação com ícones (Dashboard, Equipamentos,
  Configurações); item ativo destacado. No mobile vira drawer (`Sheet`).
- **Topbar**: botão de menu, título da página, **toggle de tema claro/escuro**,
  avatar do usuário com dropdown (nome, papel, "Sair").
- Fundo `muted` e espaçamentos no estilo Sakai.
- **ThemeProvider** próprio (classe no `<html>` + `localStorage`).

Arquivos novos previstos:
- `src/lib/utils.ts` (via shadcn)
- `src/components/theme-provider.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/AppTopbar.tsx`
- `src/components/ui/*` (componentes shadcn)

## Fase 2 — Refatorar as 7 páginas

| Página | Mudança |
|--------|---------|
| **Login** | Card centralizado (Input/Label/Button shadcn), branding |
| **Dashboard** | KPI cards com ícone colorido + **gráficos Recharts** (manutenções por status; equipamentos por tipo agregados no client) + tabelas repaginadas |
| **EquipmentList** | `Table` + `Select` filtro + `Badge` + ações em `DropdownMenu` + `AlertDialog` p/ confirmar ativar/desativar |
| **EquipmentDetail** | `Card`s de info + `Badge` + `Table` de histórico |
| **EquipmentForm** | Input/Select/Label/Button shadcn |
| **MaintenanceRegister** | `Checkbox` no checklist, `Textarea`, datetime, Button |

- Alertas de erro/sucesso → **`sonner`** (toasts).
- Spinners → `Skeleton`.

## Fase 3 — Limpeza e verificação

- Remover classes obsoletas de `index.css`.
- `npm run build` (`tsc -b && vite build`) — tsconfig é **strict**
  (`noUnusedLocals`/`noUnusedParameters`); build precisa passar limpo.

---

## Premissas

- Acesso à internet para `npm install` e `npx shadcn` (download de pacotes/componentes).
- Backend intocado.

## Decisão técnica (durante a execução): migração para Tailwind v4

O `shadcn init` aplicou o preset **radix-nova**, que assume **Tailwind v4** (cores `oklch()`,
`@import "tailwindcss"`, `tw-animate-css`, fonte Geist). O projeto estava em Tailwind v3, o que
geraria conflito. Decisão: **migrar para Tailwind v4** (alinha com o tooling instalado; com Vite
usa o plugin `@tailwindcss/vite` e dispensa `postcss.config.js`).

Passos da migração:
1. `npm i tailwindcss@4 @tailwindcss/vite`
2. `vite.config.ts`: adicionar plugin `tailwindcss()`
3. Remover `postcss.config.js` (v4/Vite não precisa)
4. Reescrever `index.css` no formato v4 (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`)
   com a **cor de marca azul** no token `--primary`
5. Remover `tailwind.config.js` v3 (paleta `primary-*` não é mais usada)

---

## Status de Execução

- [x] **Fase 0** — Setup shadcn/ui (alias, deps, init, componentes) + migração Tailwind v4 ✅ build OK
- [x] **Fase 1** — ThemeProvider + sidebar + topbar (novo Layout) ✅ build OK
- [x] **Fase 2.1** — Login ✅
- [x] **Fase 2.2** — Dashboard (KPIs + gráficos + tabelas) ✅ tsc OK
- [x] **Fase 2.3** — EquipmentList ✅ (Table + Select + DropdownMenu + AlertDialog)
- [x] **Fase 2.4** — EquipmentDetail ✅
- [x] **Fase 2.5** — EquipmentForm ✅
- [x] **Fase 2.6** — MaintenanceRegister ✅ (Checkbox + Textarea)
- [x] **Fase 2.7** — Settings ✅
- [x] **Fase 3** — Limpeza CSS + `npm run build` passando ✅ + smoke test dev server OK

> **Concluído.** Build (`tsc -b && vite build`) passa limpo (apenas aviso de chunk >500 kB do
> Recharts, esperado para POC). Helpers centralizados em `src/lib/format.ts`; toasts via `sonner`;
> tema claro/escuro funcional; sidebar + topbar estilo Sakai.
>
> Observação: a porta 5173 pode estar ocupada por outro projeto — o Vite cai para 5174.

### Decisões registradas
- Escopo: **Sakai completo** (sidebar + topbar + dark mode + gráficos)
- Tema: **claro/escuro** com toggle
- Gráficos: **sim** (Recharts via shadcn chart)
- Ferramenta: **CLI do shadcn diretamente** (`npx shadcn@latest`)
