# Padrão de Documentação — FPM

> **Objetivo:** definir onde cada documento mora, como é nomeado e estruturado, e quando criar ou atualizar um.
> **Categoria:** process · **Status:** Ativo
> **Atualizado em:** 2026-10-24
> **Relacionados:** [Índice da documentação](../README.md)

Vale para qualquer pessoa ou agente (inclusive o Claude) que crie ou edite arquivos em `docs/`.

---

## 1. Princípio

**Um documento = um objetivo = uma categoria.**
Se não dá para dizer em uma frase para que o documento serve e em qual pasta ele entra, ele não deve ser criado ainda.

---

## 2. Categorias (pastas)

| Pasta | Objetivo | Entra aqui | Não entra aqui |
|---|---|---|---|
| `pitch/` | Material da avaliação da pós (módulo 3) | Deck, orientações da faculdade, templates, roteiro e textos do pitch | Documentação do sistema |
| `product/` | O que é o FPM e por que existe | Proposta de valor, público, mercado, apresentação comercial, casos de uso | Detalhe técnico de implementação |
| `specs/` | **O que** o sistema deve fazer | Requisitos, regras de negócio, contratos de API, critérios de aceite | Ordem de execução (vai em `plans/`) |
| `plans/` | **Como e em que ordem** uma mudança será executada | Diagnóstico, decisões, etapas e **status de execução** com checkboxes | Requisito estável (vai em `specs/`) |
| `design/` | Como o sistema deve parecer e se comportar visualmente | Design system, tokens, padrões de UI/UX | Plano de implementação do redesign (vai em `plans/`) |
| `technical/` | Arquitetura e engenharia | Guias técnicos, decisões de arquitetura, backlog de melhorias técnicas | Requisitos de negócio |
| `process/` | Como a equipe trabalha | Padrões (documentação, revisão, git, deploy), checklists de processo | Conteúdo de uma execução específica |
| `reviews/AAAA-MM-DD/` | Resultado de uma rodada de revisão | Relatórios gerados seguindo [padrao-revisao-funcional](padrao-revisao-funcional.md) | Correções (vão no código + plano) |

Arquivos que não são `.md` (pptx, pdf, imagens) ficam na pasta da categoria a que pertencem; imagens de apoio em `<categoria>/assets/`.

**Fora de `docs/`:** o `README.md` da raiz (como rodar o projeto) e READMEs de pacote. Exceção conhecida: `frontend/REDESIGN-PLAN.md` (plano em execução; mover para `plans/` quando o redesign terminar).

Precisa de uma categoria nova? **Pergunte antes de criar a pasta** e, se aprovada, registre-a nesta tabela.

---

## 3. Nome de arquivo

- Minúsculas, palavras separadas por hífen, **sem acentos nem espaços**: `plano-funcionalidades.md`.
- Em português, descrevendo o objetivo: `guia-evolucao-tecnica.md`, não `doc1.md` ou `notas.md`.
- **Proibido** versionar no nome: nada de `-v2`, `-final`, `-novo`, `-copia`. O histórico fica no git.
- Datas só onde a data é a identidade do documento: pastas de `reviews/` (`reviews/2026-10-24/`).
- Exceção: arquivos externos recebidos (ex.: PDF da faculdade) podem manter a versão do emissor no nome.

---

## 4. Cabeçalho obrigatório

Todo `.md` em `docs/` começa assim:

```markdown
# Título claro

> **Objetivo:** uma frase dizendo para que este documento serve.
> **Categoria:** plans · **Status:** Rascunho | Ativo | Em andamento | Concluído | Obsoleto
> **Atualizado em:** AAAA-MM-DD
> **Relacionados:** [outro doc](../caminho/relativo.md)
```

- **Status:** `Rascunho` (em construção) · `Ativo` (vale como referência) · `Em andamento` (plano sendo executado) · `Concluído` (plano/review fechado) · `Obsoleto` (substituído; aponte o substituto em Relacionados).
- Atualize **Atualizado em** sempre que o conteúdo mudar.

---

## 5. Estrutura mínima por categoria

| Categoria | Seções esperadas |
|---|---|
| `specs/` | Contexto · Requisitos · Regras de negócio · Fora do escopo · Critérios de aceite |
| `plans/` | Objetivo · Diagnóstico · Decisões · Etapas · **Status de execução** (checkboxes) |
| `technical/` | Problema · Solução proposta · Como aplicar · Riscos/trade-offs |
| `design/` | Princípios · Tokens (cores, tipografia, espaçamento) · Componentes · Exemplos |
| `process/` | Quando se aplica · Passo a passo · Regras · Formato de saída |
| `reviews/` | Conforme a seção 5 de [padrao-revisao-funcional](padrao-revisao-funcional.md) |
| `product/`, `pitch/` | Livre, mas com o cabeçalho e um objetivo único |

---

## 6. Regras para criar e editar

1. **Procure antes de criar.** Se já existe documento com o mesmo objetivo, atualize-o em vez de criar outro.
2. **Só crie um `.md` quando** alguém pediu, ou quando um processo exige (plano antes de mudança grande, relatório de revisão). Não crie resumos de conversa, "notas" ou relatórios avulsos.
3. **Escolha a categoria pela tabela da seção 2.** Na dúvida entre duas, use a pergunta: *é o quê (specs), o como/quando (plans), o porquê (product) ou o como-trabalhamos (process)?*
4. **Registre no índice** [`docs/README.md`](../README.md) ao criar, mover, renomear ou tornar obsoleto.
5. **Links relativos** entre documentos. Ao mover ou renomear, procure e atualize todas as referências (`grep` pelo nome antigo no repositório).
6. **Não apague** documento sem pedido explícito: marque `Obsoleto` e aponte o substituto.
7. **Planos terminados** viram `Concluído` e ficam em `plans/` como registro do que foi feito.
8. Idioma: português; termos técnicos consagrados podem ficar em inglês.
