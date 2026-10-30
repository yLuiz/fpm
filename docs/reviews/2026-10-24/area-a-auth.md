# Revisão funcional — Área A. Autenticação e sessão

- **Data:** 2026-10-24 (testes entre 20:14 e 20:20 UTC)
- **Padrão seguido:** `docs/process/padrao-revisao-funcional.md`
- **Ambiente:** API `http://localhost:3001` (container `fpm-backend`), frontend `http://localhost:5173` (container `fpm-frontend`, Vite dev). Nenhum container foi reiniciado, nenhum código foi alterado.
- **Código revisado:** o que estava no disco durante a rodada. Os arquivos da área (`Login.tsx`, `AuthContext.tsx`, `api.ts`, `App.tsx`, `layout/sidebar.tsx`, `Layout.tsx`) não mudaram durante a revisão (última modificação às 16:00 locais, antes do início dos testes).
- **Evidências (scripts, logs, screenshots):** `C:\Users\LUIZ\AppData\Local\Temp\claude\e--Estudos-ProjetosPessoais-Descomplica\57045645-c400-4d0a-90e7-53fb4f2bb27a\scratchpad\e2e\area-a\`
  - `api-tests.mjs` / `api-tests.log`, `api-tests2.mjs` / `api-tests2.log` — testes de API
  - `ui-tests.mjs` / `ui-tests.log`, `ui-tests2.mjs` / `ui-tests2.log` — Playwright (Chromium headless)
  - `throttle-tests.mjs` / `throttle-tests.log` — throttling (executado por último)
  - `t1-…png` a `t12-…png` — screenshots
- **Tokens forjados:** para simular token expirado e assinatura inválida usei o `JWT_SECRET` que está em `docker-compose.yml:47`.
- **Não existe topbar** no layout atual (`components/Layout.tsx` só tem sidebar + `<main>`), então o logout foi testado só na sidebar.

---

## Achados

### [CRÍTICO] Rotação e revogação do refresh token não funcionam: refresh tokens antigos continuam válidos por 7 dias
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.service.ts:42`, `:89`, `:98` (bcrypt do refresh token)
- **Como reproduzir:**
  1. `POST /auth/login` (admin) → guarda `R1`.
  2. `POST /auth/refresh {refresh_token: R1}` → 201, recebe `R2` (rotação; `R2 != R1`).
  3. `POST /auth/refresh {refresh_token: R1}` de novo.
  4. Variante logout: `login` (user) → `UR1`; `POST /auth/logout`; `refresh UR1` → 401 (ok); faz **novo login** do mesmo usuário; `refresh UR1` de novo.
- **Esperado:** passo 3 → 401 (token já rotacionado). Passo 4, último refresh → 401 (token emitido antes do logout).
- **Obtido:** passo 3 → **201 com novos tokens**. Passo 4 → **201 com novos tokens**: basta o usuário logar de novo (em qualquer dispositivo) para que todos os refresh tokens antigos dele voltem a valer (`api-tests.log`, `api-tests2.log`). O logout só bloqueia até o próximo login.
- **Causa provável:** o bcrypt considera só os **primeiros 72 bytes** da entrada. Um JWT tem ~250 bytes, e os 72 primeiros são o header (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.`) + o começo do payload (`{"sub":"<id do usuário>…`), iguais para todos os tokens do mesmo usuário. O script confirmou: `R1.slice(0,72) === R2.slice(0,72)`. Então `bcrypt.compare(tokenAntigo, hashDoTokenNovo)` sempre devolve `true`. Só `refreshToken = null` (logout) bloqueia, e só até o próximo login.
- **Sugestão de correção:** guardar `sha256(refresh_token)` (hash rápido e sem truncamento serve, porque o token já tem alta entropia) e comparar com `timingSafeEqual`; ou incluir um `jti` aleatório no payload e guardar/comparar só o `jti`. Depois, detectar reuso de token rotacionado e revogar a sessão.

### [ALTO] O limite de 5 logins/minuto não é aplicado; o login aceita 100/min (e 10/s)
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.controller.ts:15` (`@Throttle({ default: … })`) × `backend/src/app.module.ts:25-41` (throttlers `short`, `medium` e `long`)
- **Como reproduzir:** 7 `POST /auth/login` seguidos com senha errada, ~1,2 s entre eles (`throttle-tests.log`). Ver também os headers de qualquer resposta do login.
- **Esperado:** a 6ª tentativa no mesmo minuto → 429.
- **Obtido:** todas as 7 → 401. Headers do login: `X-RateLimit-Limit-short: 10`, `X-RateLimit-Limit-medium: 100`, `X-RateLimit-Limit-long: 1000`. Não há limite de 5. O 429 só aparece ao passar de 10 req/s (rajada de 11 → a 11ª deu 429). Durante o teste o contador `medium` estava em 92 a 98, então outros revisores consumiram pouca cota. Isso não muda a conclusão, que vem dos headers.
- **Causa provável:** no `@nestjs/throttler` v5 (instalado: 5.2.0), `@Throttle({ default: … })` só sobrescreve um throttler chamado `default`. O `ThrottlerModule` registra apenas `short`/`medium`/`long`, então a sobrescrita é ignorada. Pelo mesmo motivo, `@SkipThrottle()` em `/auth/refresh` (`auth.controller.ts:29`) também não tem efeito: o refresh devolveu headers de rate limit e conta para os limites globais.
- **Sugestão de correção:** usar os nomes reais, por exemplo `@Throttle({ medium: { limit: 5, ttl: 60000 } })` (e `short` se quiser), e `@SkipThrottle({ short: true, medium: true, long: true })` no refresh, se a intenção for pular. Colocar um teste e2e que espera 429 na 6ª tentativa. A documentação que fala em "5 tentativas/minuto" também está errada hoje.

### [ALTO] Credencial inválida não mostra mensagem: a página de login recarrega e limpa o formulário
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/services/api.ts:29-39` (interceptor de 401), que atinge `frontend/src/pages/Login.tsx:33-34`
- **Como reproduzir:** em `/login`, digitar `admin@fpm.com` / `senhaerrada` e clicar em Entrar.
- **Esperado:** toast "Email ou senha inválidos", email mantido no campo.
- **Obtido:** `POST /auth/login → 401`; o interceptor faz `window.location.href = '/login'` (reload completo). **Nenhum toast aparece** (verificado aos 400 ms e aos 2,4 s), e os campos voltam vazios (`t2-login-errado-400ms.png`, `t2-login-errado-2s.png`). Na prática, quem erra a senha vê a tela "piscar" sem nenhuma explicação.
- **Causa provável:** o interceptor trata qualquer 401 como "sessão expirada", inclusive o 401 de credencial inválida em `/auth/login`. O `toast.error` do `catch` até roda, mas a página recarrega logo em seguida.
- **Sugestão de correção:** ignorar o redirect quando `error.config.url` for `/auth/login` (e `/auth/refresh`/`/auth/logout`) ou quando já estiver em `/login`. De preferência, fazer o redirect via estado do AuthContext/`navigate`, e não com `window.location`.

### [ALTO] O frontend não usa o refresh token: a sessão cai a cada 15 minutos, sem aviso e com perda do que estava sendo digitado
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/contexts/AuthContext.tsx:41-46` (só guarda `access_token`), `frontend/src/types/index.ts:53-56` (`AuthResponse` sem `refresh_token`), `frontend/src/services/api.ts:29-39`; backend `auth.service.ts:147` (`expiresIn: '15m'`)
- **Como reproduzir:** logar pela UI e verificar o `localStorage` (só `token` e `user`). Depois, simular a expiração trocando `token` por um JWT expirado (assinatura válida) e clicar em "Equipamentos".
- **Esperado:** ao receber 401 com token expirado, chamar `POST /auth/refresh`, repetir a requisição e manter o usuário na tela.
- **Obtido:** nenhuma chamada a `/auth/refresh`; `GET /equipment → 401` (2x, StrictMode); hard redirect para `/login` sem toast nem explicação (`t6-expirou-no-meio.png`). Na vida real isso acontece 15 min após o login, mesmo com uso ativo, e um formulário em andamento (ex.: registro de manutenção) é perdido. O console mostra `Error loading equipment: AxiosError`.
- **Causa provável:** o refresh token devolvido pelo login é descartado. O interceptor não tenta renovar a sessão.
- **Sugestão de correção:** guardar o `refresh_token` e, no interceptor, em 401 (exceto nas rotas `/auth/*`), fazer um único refresh (com fila para requisições concorrentes) e repetir a requisição original. Se o refresh falhar, deslogar com toast "Sessão expirada". Depende do achado CRÍTICO acima para que a rotação seja segura.

### [MÉDIO] Toda falha de login aparece como "Email ou senha inválidos" (inclusive 429, erro de rede e 500)
- **Área / camada:** A. Autenticação / Frontend (+ mensagem do backend)
- **Onde:** `frontend/src/pages/Login.tsx:33-34`
- **Como reproduzir:** estourar o limite (rajada de 10 tentativas em < 1 s) e logo em seguida entrar com as credenciais **corretas** `admin@fpm.com / admin123` (`throttle-tests.mjs`, passo 12).
- **Esperado:** mensagem do tipo "Muitas tentativas, aguarde X segundos".
- **Obtido:** `POST /auth/login → 429`, corpo `{"message":"ThrottlerException: Too Many Requests"}` (cru e em inglês), e a tela mostra o toast **"Email ou senha inválidos"** com credenciais corretas (`t12-login-429.png`). O mesmo `catch` genérico vale para backend fora do ar e para 500.
- **Causa provável:** `catch {}` sem inspecionar `error.response?.status`.
- **Sugestão de correção:** diferenciar 401 (credenciais), 429 (usar o header `Retry-After`), 400 (validação) e erro de rede/5xx. No backend, devolver mensagem em português no 429, via `ThrottlerGuard` customizado ou `errorMessage` nas opções do módulo.

### [MÉDIO] A tela de login exibe a senha do administrador
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/pages/Login.tsx:91-94` (e o placeholder `admin@fpm.com` na linha 70)
- **Como reproduzir:** abrir `/login`.
- **Esperado:** nenhuma credencial na tela, ou exibição só em modo demo (ex.: `import.meta.env.DEV` / flag).
- **Obtido:** caixa "Usuário de teste — admin@fpm.com · admin123" sempre visível (`t1-rota-privada-sem-login.png`), com a conta de maior privilégio (ADMIN). Junto com o throttling frouxo, qualquer pessoa com acesso à URL entra como admin. Severidade Médio por ser projeto acadêmico/demo; seria Crítico em qualquer deploy real.
- **Sugestão de correção:** renderizar a caixa só sob flag de demo, ou mostrar a conta USER, e nunca em build de produção.

### [MÉDIO] Depois do login, o usuário não volta para a página que tentou abrir
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/App.tsx:24` (`<Navigate to="/login" />` sem `state`) e `frontend/src/pages/Login.tsx:32` (`navigate('/')` fixo)
- **Como reproduzir:** sem sessão, abrir `http://localhost:5173/equipment` → vai para `/login` → logar.
- **Esperado:** voltar para `/equipment`.
- **Obtido:** cai em `/` (Dashboard) (`ui-tests.log`, passo 3). O mesmo acontece quando a sessão expira (achado anterior): o usuário perde o contexto duas vezes.
- **Sugestão de correção:** `<Navigate to="/login" replace state={{ from: location }} />` e, no login, `navigate(location.state?.from?.pathname ?? '/', { replace: true })`. No interceptor, passar o `pathname` atual por query string.

### [BAIXO] `localStorage.user` corrompido derruba o app inteiro (tela branca permanente)
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/contexts/AuthContext.tsx:24` (`JSON.parse(storedUser)` sem try/catch)
- **Como reproduzir:** `localStorage.token = 'qualquer'`, `localStorage.user = 'nao-e-json'` e abrir `/`.
- **Esperado:** descartar a sessão e ir para `/login`.
- **Obtido:** `SyntaxError: Unexpected token 'a', "nao-e-json" is not valid JSON`, "The above error occurred in the <AuthProvider> component" e body vazio (`t8-user-corrompido.png`). Como nada limpa o storage, o app fica em branco em todo carregamento até o usuário limpar os dados do site. Não há Error Boundary.
- **Sugestão de correção:** `try { JSON.parse } catch { limpar storage }` e um Error Boundary na raiz.

### [BAIXO] `/login` continua acessível estando logado
- **Área / camada:** A. Autenticação / Frontend
- **Onde:** `frontend/src/App.tsx:30`
- **Como reproduzir:** logado, abrir `/login`.
- **Esperado:** redirecionar para `/`.
- **Obtido:** o formulário de login aparece normalmente (`t4-login-autenticado.png`), e um novo login sobrescreve a sessão atual.
- **Sugestão de correção:** rota pública com guard inverso (`isAuthenticated ? <Navigate to="/" replace/> : <Login/>`).

### [BAIXO] Rota inexistente mostra página em branco
- **Área / camada:** A. Autenticação (roteamento) / Frontend
- **Onde:** `frontend/src/App.tsx:28-48` (sem rota `*`)
- **Como reproduzir:** abrir `/rota-que-nao-existe` (logado ou não).
- **Obtido:** body vazio; console `No routes matched location "/rota-que-nao-existe"` (`t5-rota-inexistente.png`).
- **Sugestão de correção:** `<Route path="*" element={<NotFound/>} />`, ou redirect para `/`.

### [BAIXO] A JwtStrategy aceita token de usuário soft-deletado e usa o papel do token, não o do banco
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/jwt.strategy.ts:21-33`
- **Verificação:** rastreado no código (não há endpoint de gestão de usuários para reproduzir sem mexer no banco). `findUnique({ where: { id } })` não filtra `deletedAt`, e o objeto retornado usa `payload.role`. O `RolesGuard` (`roles.guard.ts:21-22`) confia nesse `role`. Por contraste, `/auth/me` usa `validateUser`, que filtra `deletedAt`. Já reproduzido: token válido para um `sub` inexistente → 401 "Usuário não encontrado" (correto).
- **Impacto:** um usuário removido ou rebaixado de ADMIN mantém acesso/privilégio por até 15 min (validade do access token). O refresh não amplia esse prazo para usuário removido, porque `refreshToken()` filtra `deletedAt`. Já o rebaixamento de papel só vale no próximo refresh, que emite o token com o papel do banco.
- **Sugestão de correção:** filtrar `deletedAt: null` e retornar `user.role` do banco.

### [BAIXO] Auditoria de autenticação incompleta
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.service.ts:29-37` (falhas sem log), `:116-121` (logout sem IP/UA), `auth.controller.ts:43-44`
- **Como reproduzir:** consulta somente leitura em `audit_logs` após os testes.
- **Obtido:** os `LOGIN` bem-sucedidos são gravados com IP e user-agent (ok). Já as **tentativas falhas não geram registro** (fiz 9+ tentativas com senha errada e não há nenhuma linha), e os `LOGOUT` são gravados com `ipAddress`/`userAgent` vazios. Observação: o IP gravado é sempre o do gateway Docker (`::ffff:172.22.0.1`), então o rastreio por IP (e o throttling por IP) trata todos os clientes como um só nesse ambiente.
- **Sugestão de correção:** registrar `LOGIN_FAILED` (com email tentado, IP e UA) e passar `@Ip()`/`user-agent` para o logout. Em produção atrás de proxy, configurar `trust proxy`.

### [BAIXO] Enumeração de usuários por tempo de resposta no login
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.service.ts:29-31`
- **Como reproduzir:** `POST /auth/login` com email existente + senha errada vs. email inexistente.
- **Obtido:** a mensagem é a mesma ("Credenciais inválidas", correto), mas o tempo não: **43 ms** contra **4 ms** (`api-tests2.log`). Quando o usuário não existe, o bcrypt não roda.
- **Sugestão de correção:** rodar `bcrypt.compare` contra um hash fictício quando o usuário não existir.

### [BAIXO] Detalhes de contrato e entrada
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.controller.ts:14,28,37`; `auth.service.ts:22-27`
- **Obtido:**
  - `POST /auth/login`, `/auth/refresh` e `/auth/logout` respondem **201**, mas o Swagger documenta **200** (falta `@HttpCode(200)`).
  - O email é case-sensitive: `ADMIN@FPM.COM / admin123` → 401.
  - Os segredos JWT de produção estão versionados em `docker-compose.yml:47-48`, o que permitiu forjar tokens válidos nos testes. Para um projeto acadêmico isso é aceitável; num deploy, eles devem vir de variável de ambiente/secret.
- **Sugestão de correção:** `@HttpCode(HttpStatus.OK)`; normalizar o email (`toLowerCase().trim()`) no DTO (`@Transform`) e no cadastro; mover os segredos para `.env` não versionado.

### [BAIXO] O access token continua válido depois do logout
- **Área / camada:** A. Autenticação / Backend
- **Onde:** `backend/src/auth/auth.service.ts:110-124`, `jwt.strategy.ts`
- **Obtido:** após `POST /auth/logout`, `GET /auth/me` com o mesmo access token → 200 (até expirar, em 15 min). É o comportamento esperado de JWT stateless, e o frontend apaga o token local, mas o Swagger descreve o logout como "invalida refresh token", então não há falha de contrato. Registro só para ciência.
- **Sugestão de correção (opcional):** `tokenVersion` no usuário, incluído no payload e checado na strategy, ou uma denylist curta por `jti`.

---

## O que foi testado e passou

| # | Item | Camada | Resultado |
|---|---|---|---|
| 1 | Login admin e user → 201 com `access_token`, `refresh_token`, `expires_in: 900` e `user` (id, email, name, role) sem senha/hash | Backend | OK |
| 2 | Credencial inválida (senha errada / email inexistente) → 401 "Credenciais inválidas", com a mesma mensagem nos dois casos | Backend | OK |
| 3 | Validação do login: email inválido, senha < 6, body vazio → 400 com mensagens em PT | Backend | OK |
| 4 | `GET /auth/me` com token válido → 200 com dados corretos | Backend | OK |
| 5 | `GET /auth/me` sem token, token lixo, token expirado, assinado com outro segredo, `alg=none` e refresh token usado como access → 401 | Backend | OK |
| 6 | Token válido para usuário inexistente → 401 "Usuário não encontrado" | Backend | OK |
| 7 | `/auth/refresh`: body vazio/string vazia → 400; campo extra → 400 (`forbidNonWhitelisted`); token lixo ou access token → 401 "Token inválido ou expirado" | Backend | OK |
| 8 | `/auth/refresh` com token válido → novo par de tokens (`R2 ≠ R1`) | Backend | OK (mas veja o achado CRÍTICO sobre reuso) |
| 9 | Logout → 201; `refresh` com o token do usuário logo após o logout → 401 | Backend | OK (até o próximo login, veja o achado CRÍTICO) |
| 10 | Logout sem token → 401 | Backend | OK |
| 11 | RBAC: USER `GET /settings/frequency` → 200; USER `PUT /settings/frequency/MOTOR` → 403; sem token → 401 em `/settings`, `/equipment` e `/maintenance/stats` | Backend | OK |
| 12 | Audit log de LOGIN com userId, IP e user-agent; LOGOUT com userId | Backend | OK (com as lacunas do achado de auditoria) |
| 13 | Rota privada (`/equipment`) sem login → redireciona para `/login` sem flash de conteúdo privado | Frontend | OK |
| 14 | Token expirado/lixo no `localStorage` ao abrir o app → spinner, `GET /auth/me → 401`, storage limpo e `/login` (a sidebar não aparece antes) | Frontend | OK |
| 15 | Login correto pela UI → toast "Bem-vindo de volta!", Dashboard carrega e as chamadas seguintes usam o Bearer | Frontend | OK |
| 16 | Logout pela sidebar → `POST /auth/logout → 201` com o token, `localStorage` vazio, vai para `/login`; "Voltar" do navegador não reabre área privada | Frontend | OK |
| 17 | Login em 390 px: sem scroll horizontal (`scrollWidth = 390`) | Frontend | OK |
| 18 | Console sem erros na tela de login e no fluxo feliz (só os avisos "Future Flag" do React Router) | Frontend | OK |
| 19 | O 429 existe e é devolvido pela API acima de 10 req/s no login | Backend | OK (mas veja o achado ALTO sobre o limite de 5/min) |

## Não confirmado / não testado

- **Logout com access token já expirado:** pela leitura do código, `authApi.logout` recebe 401, o interceptor redireciona para `/login` e o refresh token **não** é invalidado no backend, porque o logout exige um access token válido. Não reproduzi no navegador.
- **Topbar:** não existe no layout atual, então não houve o que testar.
- **Sidebar em 390 px (logout no mobile):** não avaliei o layout do app logado em mobile. Isso é transversal (área D/layout) e fica a cargo de quem revisa o Dashboard.
- **Throttling com vários IPs:** todos os clientes chegam com o mesmo IP do gateway Docker (`::ffff:172.22.0.1`), então o limite "por IP" é, na prática, compartilhado entre todos os revisores. A cota consumida pelos outros revisores durante meu teste foi pequena (contador `medium` entre 92 e 98 de 100).
- **Usuário soft-deletado/rebaixado com token ativo:** só rastreado no código (não alterei dados de usuários).
