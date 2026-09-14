# Roteiro de MVPs (Escopo Mínimo Viável e Evolução Incremental)

A Unidade 2 §6 é explícita: **não peça Docker, dashboard, autenticação, relatórios e testes globais
no mesmo prompt**. Primeiro o núcleo funcional, depois amplia por incrementos. Este documento adapta
o modelo genérico de 5 MVPs da apostila para os FRs reais de `docs/02-requirements.md`, na ordem em
que devem ser implementados — cada linha é um conjunto de prompts pequenos, não um prompt único.

## MVP 1 — Fundação (sem IA, sem biometria, sem e-mail)

Objetivo: ter algo que sobe e responde, com dados reais no banco, sem nenhuma dependência externa
ainda.

- Seed script: `d_user_policy` completo + contas fixas de trainer/admin (FR-41, FR-42, FR-43).
- Auth mínima: login por senha, JWT em cookie httpOnly, CASL ability básica (docs/04-architecture.md §3).
- Catálogo: `d_exercises`, `d_gym_equipment`, `d_exercise_equipment` — schema, CRUD de admin, listagem (FR-16, FR-17, FR-24).

**Validação do MVP 1**: um admin seedado consegue logar, cadastrar um exercício e um equipamento, e
a regra RN-04 (disponibilidade) responde certo em teste unitário.

## MVP 2 — Fluxo principal de ponta a ponta (com IA/e-mail/biometria ainda mockados)

Objetivo: o caminho crítico do membro funciona de ponta a ponta, mesmo que a "inteligência" de cada
etapa seja um stub por enquanto.

- Signup: FR-1, FR-2 (captura de foto real, mas sem exigir threshold de matching ainda).
- Aptidão: FR-3, FR-4 com resultado da IA **mockado** (retorna sempre `cleared` num primeiro momento, para não depender do OpenRouter já).
- Onboarding: FR-10 a FR-13 (sem e-mail real ainda — link exposto em log/console).
- Primeiro plano: FR-15, FR-18, gerado por um gerador **placeholder** (ex.: escolhe 3 exercícios fixos), não pela IA de verdade.

**Validação do MVP 2**: um membro percorre signup → aptidão → onboarding → vê um plano na tela, sem
nenhum erro, mesmo que o "cérebro" de cada etapa ainda seja fake.

## MVP 3 — Regras de negócio, IA real e casos inválidos

Objetivo: trocar os stubs do MVP 2 pelas regras de verdade e validar que casos inválidos são
bloqueados com mensagem clara (é literalmente a definição de MVP 3 da apostila).

- Integração real com OpenRouter para aptidão/certificado/plano/chat (FR-4, FR-5, FR-15, FR-25-29), com `pending_retry` (RN-01).
- Fila de backstop do Admin (FR-6, FR-7, RN-02).
- Face recognition real (face-api.js) no signup e no kiosk (FR-2, FR-30-32, RN-08).
- Check-in + catraca (FR-33, FR-34, RN-09).
- Revisão do trainer (FR-19, FR-21, FR-22, RN-06) e correção retroativa (FR-23, RN-07).
- E-mail real via Resend (FR-10).

**Validação do MVP 3**: cada RN de `docs/06-regras-de-negocio.md` tem um teste Vitest passando.

## MVP 4 — Dashboards e informação agregada

Objetivo: nada aqui altera regra de negócio, só expõe dados já existentes.

- Métricas do membro (FR-36).
- Página de info da academia: ocupação, demanda de equipamento (FR-37, FR-38, FR-39).
- Tela de gestão de policies do Admin (FR-43, RN-10).

**Validação do MVP 4**: os números batem com o que está no banco (conferir manualmente contra uma
query SQL direta).

## MVP 5 — Refinamento, testes, Docker, documentação

Objetivo: fechar a disciplina com o checklist final da Unidade 1 §11 satisfeito em todo o histórico
de prompts.

- Docker Compose com os 3 containers (frontend, backend, db) de verdade, variáveis de `.env`.
- Cobertura de teste das RNs restantes que ainda não têm teste.
- Sincronizar `docs/`, `rules/` e `AGENTS.md` com qualquer decisão que tenha mudado no caminho (AGENTS.md §"Keeping docs in sync").
- Preencher `docs/08-traceability-matrix.md` até o fim.

**Validação do MVP 5**: `docker compose up` sobe o sistema do zero e ele passa no checklist da
Unidade 1 §11 para toda tarefa relevante.
