# Padrão de Revisão e Teste Funcional — FPM

> **Objetivo:** definir como revisamos e testamos as funcionalidades do FPM (backend + frontend) e o formato dos relatórios.
> **Categoria:** process · **Status:** Ativo
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Padrão de documentação](padrao-documentacao.md) · [Relatórios](../reviews/)

Toda rodada de revisão segue este padrão e gera relatórios em `docs/reviews/AAAA-MM-DD/`.

---

## 1. Objetivo

Encontrar o que **não funciona**, o que funciona **errado** e o que está **frágil**, em cada funcionalidade,
olhando as duas camadas juntas: a regra de negócio no backend e a experiência real na tela.

Uma revisão **não corrige nada**. Ela produz evidência; as correções são feitas depois, priorizadas pelo relatório.

---

## 2. Divisão por área (um revisor por área)

Cada área é revisada de ponta a ponta (API → tela) por um revisor independente:

| Área | Backend | Frontend |
|---|---|---|
| **A. Autenticação e sessão** | `auth/*` (login, refresh, logout, me), guards, roles, throttling | `Login.tsx`, `AuthContext.tsx`, `services/api.ts` (interceptors), rotas privadas, logout na sidebar/topbar |
| **B. Equipamentos** | `equipment/*` (CRUD, toggle-status, soft delete, filtros, auditoria) | `EquipmentList.tsx` (tabela, filtro, **menu de ações**, diálogos), `EquipmentForm.tsx`, `EquipmentDetail.tsx` |
| **C. Manutenções** | `maintenance/*` (upcoming, overdue, by-equipment, complete, checklist, reagendamento) | `MaintenanceRegister.tsx`, histórico no detalhe do equipamento, links "Registrar" |
| **D. Dashboard e Configurações** | `maintenance/stats`, `settings/*` (frequências, ADMIN only) | `Dashboard.tsx` (KPIs, gráficos, tabelas), `Settings.tsx` |
| **E. Corretivas e Paradas** | checklist OK/NOK/NA → corretiva automática (`maintenance/*`), `downtime/*` (registrar, encerrar, listar) | registro de manutenção com resultado por item, `Downtimes.tsx`, status "Parado" na lista/detalhe/dashboard |
| **F. Indicadores e QR Code** | `metrics/*` (summary, monthly: MTBF, MTTR, disponibilidade, cumprimento) | aba Indicadores do dashboard, `EquipmentScan.tsx` (`/e/:id`), `EquipmentLabels.tsx` (etiquetas) |

Quando surgir funcionalidade nova, acrescente uma área nesta tabela antes da próxima rodada.

Itens transversais (layout, navegação, tema claro/escuro, responsividade, erros globais) entram na área cuja tela os exibe.

---

## 3. Como testar

### 3.1 Backend — teste real contra a API
- Base: `http://localhost:3001` · Swagger: `http://localhost:3001/api`
- Faça **um** login por usuário e reaproveite o token: `/auth/login` aceita só **5 tentativas por minuto**.
- Usuários do seed: `admin@fpm.com / admin123` (ADMIN) e `user@fpm.com / user123` (USER).
- Para cada endpoint da área, cubra:
  1. **Caminho feliz:** status HTTP e corpo esperados.
  2. **Validação:** campos faltando/inválidos → `400` com mensagem clara (nunca `500`).
  3. **Autorização:** sem token → `401`; papel errado → `403` onde a regra exigir ADMIN.
  4. **Recurso inexistente:** ID inválido/inexistente → `404`.
  5. **Efeitos colaterais:** o que mais deveria mudar mudou? (ex.: concluir manutenção cria a próxima; criar equipamento cria a 1ª manutenção; ações geram audit log).
  6. **Consistência:** soft delete some das listagens; filtros devolvem só o que deveriam.

### 3.2 Frontend — leitura de código + navegador automatizado
- **Leitura:** rastrear cada botão/link/form até a chamada de API e o tratamento de resposta (loading, sucesso, erro, lista vazia).
- **Navegador:** Playwright (Chromium headless) contra `http://localhost:5173`, simulando o usuário: clicar, preencher, confirmar, verificar o que aparece na tela e nos **erros do console**.
- Para cada tela da área, verifique:
  1. A tela carrega sem erro no console.
  2. **Todo elemento clicável faz algo** (botões, menus, links, diálogos).
  3. Dados exibidos batem com a API.
  4. Estados de loading, vazio e erro existem e fazem sentido.
  5. Permissões: USER não vê/não consegue usar o que é só de ADMIN.
  6. Feedback ao usuário (toast/mensagem) em sucesso e erro.
  7. Layout em desktop (1440px) e mobile (390px).
- Use screenshots (`page.screenshot`) como evidência dos problemas visuais/de interação.

### 3.3 Regras de convivência (revisores em paralelo)
- **Não reinicie containers.** Derrubaria o teste dos outros revisores. (O seed só popula banco vazio; `--reset` apaga tudo e **nunca** deve ser usado durante uma rodada.)
- **Dados de teste próprios:** crie seus registros com o prefixo `[REVIEW-<ÁREA>]` no nome (ex.: `[REVIEW-B] Motor teste`). Só altere/exclua o que você criou.
- **Não altere código** do projeto. Scripts de teste ficam fora do repositório (pasta temporária).
- Antes de testar o frontend no navegador, confirme que o container `fpm-frontend` foi construído com o código atual do disco (ele não monta volume; mudanças exigem `docker compose up -d --build frontend` — feito por quem coordena, não pelo revisor).

---

## 4. Classificação dos achados

| Severidade | Quando usar |
|---|---|
| **Crítico** | Perda de dados, falha de segurança, ou funcionalidade principal inutilizável |
| **Alto** | Funcionalidade não funciona ou dá resultado errado, sem contorno razoável |
| **Médio** | Funciona parcialmente, erro mal tratado, regra de negócio inconsistente |
| **Baixo** | Usabilidade, texto, visual, robustez menor |

Só entra no relatório o que foi **verificado** (reproduzido ou rastreado no código até a causa).
Suspeita não confirmada vai numa seção separada, marcada como "não confirmado".

---

## 5. Formato do relatório

Arquivos, na pasta da rodada `docs/reviews/AAAA-MM-DD/`:
- um por área: `area-<letra>-<slug>.md` (ex.: `area-b-equipamentos.md`);
- revalidação de achados anteriores: `revalidacao.md`;
- consolidado, ordenado por severidade: `consolidado.md`.

Para cada achado:

```markdown
### [SEVERIDADE] Título curto
- **Área / camada:** B. Equipamentos / Frontend
- **Onde:** `frontend/src/pages/EquipmentList.tsx:123`
- **Como reproduzir:** passos objetivos (ou request HTTP)
- **Esperado:** ...
- **Obtido:** ... (status, mensagem, erro de console, screenshot)
- **Causa provável:** explicação curta apontando o código
- **Sugestão de correção:** curta
```

Ao final de cada área, uma tabela **"O que foi testado e passou"**, para deixar claro o que foi coberto e não apenas o que quebrou.

---

## 6. Fluxo de uma rodada

1. Garantir ambiente no ar (`docker compose up -d`) e frontend reconstruído com o código atual.
2. Disparar um revisor por área (seção 2), em paralelo, cada um seguindo as seções 3 a 5.
3. Se o código mudou depois de uma área já revisada, rodar a **revalidação**: para cada achado anterior, marcar `Corrigido`, `Persiste` ou `Mudou` (com evidência nova) em `revalidacao.md`.
4. Consolidar em `consolidado.md`, ordenado por severidade, apenas com achados que persistem.
5. Priorizar e corrigir. Cada correção referencia o achado.
6. Na rodada seguinte, revalidar os achados corrigidos antes de procurar novos.
