# Log de Auditoria

Registro do papel de **Auditor** (Unidade 1 §5/§7): cada achado, onde foi encontrado, e se já foi
fechado. Sem isso, uma auditoria vira conversa perdida em vez de rastro verificável — o mesmo
motivo pelo qual `docs/08-traceability-matrix.md` existe pro papel de Especificador.

| # | Achado | Onde | Status | Resolução |
|---|---|---|---|---|
| 1 | Caminho de `policies.ts` divergia entre docs: `packages/shared/src/constants/policies.ts` vs `packages/shared/src/auth/constants/policies.ts` | `docs/05-data-model.md:55`, `rules/database.md:8` (errados) vs `rules/backend.md:17`, `docs/04-architecture.md:128` (corretos) | ✅ Resolvido (2026-09-13) | Os dois arquivos errados foram corrigidos pra incluir `/auth/`, alinhando com `AGENTS.md` (que já dizia que todo código de CASL fica em `packages/shared/src/auth/`) |
| 2 | Sem definição do que acontece com a linha `d_users` de um membro rejeitado definitivamente (`aptitude_status = rejected`) — FR-8 diz "nenhuma conta é criada", mas a linha já existe desde o FR-1/FR-2 pra guardar embedding/foto/e-mail | `docs/02-requirements.md` FR-8, `docs/05-data-model.md` `d_users.password_hash` | ✅ Resolvido (2026-09-13) | Decidido: o e-mail fica bloqueado permanentemente após rejeição final — sem soft-delete/expurgo. FR-8 e `d_users.aptitude_status` atualizados |
| 3 | Sem mecanismo definido pra retry automático de `pending_retry` (cron? nova tentativa só ao recarregar a página?) | `docs/03-features-and-flows.md` fluxo 1, passo 4b ("system retries automatically") | ✅ Resolvido (2026-09-13) | Decidido: retry só quando o membro reabre a página/pede de novo — sem job em background. FR-4 atualizado |
| 4 | Sem fluxo de retomada pra um signup incompleto (candidato fecha o navegador antes de terminar; não há login possível antes da senha) | `docs/02-requirements.md` FR-1..FR-9 | ✅ Resolvido (2026-09-13) | Decidido: retomar pelo e-mail, buscando uma linha incompleta existente antes de criar uma nova. FR-1 e `d_users.email` atualizados |
| 5 | "Dias treinados"/"training frequency" nas métricas não define se conta check-in físico ou exercício marcado como concluído no app — as duas coisas podem divergir | `docs/05-data-model.md` §3, "Personal metrics" | ✅ Resolvido (2026-09-13) | Decidido: conta apenas check-in físico (`f_check_ins`), não exercício marcado como concluído. FR-36 e §3 do modelo de dados atualizados |

## Como fechar os itens abertos

Itens 2-5 não são texto faltando — são **decisões ainda não tomadas**. A forma certa de resolver é
uma sessão curta de `/grilling` focada só nesses 4 pontos (não a especificação inteira de novo),
porque cada um é uma pergunta de sim/não ou de escolha entre opções, exatamente o formato que esse
skill foi feito pra fechar. Depois de decidido, a resposta vira uma frase nova no FR/RN relevante, e
esta linha muda pra ✅ com a data e o commit que atualizou o doc.
