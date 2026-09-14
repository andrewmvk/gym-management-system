# Matriz de Rastreabilidade

Unidade 2 §7: a matriz liga **requisito → prompt → artefato gerado → teste/evidência**. Preencha uma
linha por prompt executado, na ordem em que foram enviados. Isso é o que comprova, pro professor (e
pra você em seis meses), que cada trecho de código nasceu de um requisito rastreável — não de uma
suposição do agente.

| Requisito | Prompt associado | Artefato gerado | Teste/evidência |
|---|---|---|---|
| FR-16, FR-17, FR-24 | [P-01](../prompts/P-01-catalog-data-model.md) — schema do catálogo | `apps/api/src/db/schema/catalog.ts` + migration | `drizzle-kit generate` roda sem erro; colunas batem com `docs/05-data-model.md` |
| FR-16, FR-17, FR-24 | [P-02](../prompts/P-02-catalog-backend.md) — procedures tRPC do catálogo | `apps/api/src/modules/catalog/{router,service,repository}.ts` | Teste unitário do predicate de disponibilidade cobrindo os 4 casos do RN-04 |
| FR-16, FR-17, FR-24 | [P-03](../prompts/P-03-catalog-frontend.md) — tela de catálogo (staff) | `apps/web/src/app/(staff)/catalog/**` | Navegação manual via `docker compose up`; toggle de equipamento reflete no banco |
| RN-04 | [P-04](../prompts/P-04-rn04-availability-tests.md) — regra de disponibilidade isolada | `isExerciseAvailable()` em `catalog/service.ts` | Vitest: 0 equip. vinculado, 1 disponível, 1 indisponível, múltiplos mistos |
| _(próxima linha)_ | | | |

## Como preencher uma linha nova

1. Escolha um FR/RN ainda sem prompt associado (comece pelo MVP atual em `docs/07-mvp-roadmap.md`).
2. Escreva o prompt no formato de `prompts/_template.md` e salve como `prompts/P-<nn>-<slug>.md`.
3. Envie o prompt (cole aqui na conversa, ou entregue ao Codex).
4. Depois que o agente responder, preencha "Artefato gerado" com os arquivos que ele de fato tocou
   (confira no diff — não confie só na resposta em texto do agente, essa é a parte de **auditor**).
5. Rode o teste/evidência descrito e só marque como concluído se ele realmente passar.
