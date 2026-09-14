# Regras de Negócio (RN)

A Unidade 2 pede que se diferencie **requisito funcional** ("o que o sistema faz"), **requisito não
funcional** ("com que qualidade") e **regra de negócio** ("que condição do domínio deve ser
respeitada"). `docs/02-requirements.md` já numera FR-1..FR-44 (funcionais) e NFR-1..NFR-6 (não
funcionais), mas várias regras de negócio estão **embutidas em prosa dentro dos FRs**, sem código
próprio. Este documento extrai as mais importantes como RN-01..RN-11, no formato que a Unidade 2
recomenda (código, descrição, requisito de origem, critério de verificação) — para que cada uma vire
um prompt isolado e testável, como no exemplo `AssessmentService.complete()` da apostila.

Esta lista não é exaustiva — é um exemplo de como fazer a extração. Completar com as regras
restantes (ex.: tudo que envolve `f_user_policy_on_user.effect = denied`) fica como exercício.

| Código | Descrição | Origem | Critério de verificação |
|---|---|---|---|
| RN-01 | Um resultado de aptidão/certificado só pode ser `cleared`, `not_cleared` ou `pending_retry`; `pending_retry` nunca pode ser interpretado como uma decisão real. | FR-4, FR-5, PRODUCT.md princípio 4 | Uma falha/timeout da IA na avaliação grava `pending_retry`, nunca `cleared` nem `not_cleared`, e nunca lança exceção não tratada. |
| RN-02 | Todo resultado de certificado médico — `cleared`, `not_cleared` ou `pending_retry` — é roteado para a fila de revisão do Admin, sem exceção. | FR-6 | Ao salvar qualquer `f_medical_certificates`, uma linha aparece na fila do Admin independente do `ai_result`. |
| RN-03 | Um membro com resultado final `not_cleared` nunca recebe `password_hash` nem acesso autenticado. | FR-8 | Tentar setar senha para um `d_users` com `aptitude_status = rejected` deve falhar. |
| RN-04 | Um exercício só é incluível num plano se não precisa de equipamento OU pelo menos um equipamento vinculado está `is_available = true`. | FR-17 | Ver `prompts/P-04-rn04-availability-tests.md`. |
| RN-05 | `d_exercises` é add-only: nenhum caminho de código pode deletar uma linha. | FR-24, rules/database.md | Não existe procedure `catalog.deleteExercise` em nenhum router. |
| RN-06 | Se a IA for regenerar um plano de uma data que já tem edição direta de um trainer (`status = trainer_edited`), o membro deve confirmar antes de a regeneração sobrescrever a edição. | FR-22 | Regenerar sem confirmação prévia deve ser rejeitado/bloqueado pela procedure. |
| RN-07 | Uma correção retroativa sobrescreve o registro histórico daquela data diretamente; métricas devem refletir a versão corrigida, não a original. | FR-23 | Após uma correção, uma métrica que soma daquele dia usa os valores novos, não os antigos. |
| RN-08 | No matching facial, se os dois melhores candidatos estão acima do limiar e próximos demais entre si, o resultado é "sem match" — nunca um palpite. | FR-32 | Dado um par de embeddings com distância abaixo da margem de desempate, a função de matching retorna rejeição, não o candidato de maior score. |
| RN-09 | Um check-in é sempre gravado, com `turnstile_status` `success` ou `failed`, independente do resultado da chamada externa à catraca. | FR-33, FR-34 | Simular falha na API da catraca e confirmar que a linha em `f_check_ins` ainda é criada, tagueada `failed`. |
| RN-10 | A permissão efetiva de um usuário é a união de todas as linhas não expiradas de `f_user_policy_on_user`; uma linha com `effect = denied` sempre vence sobre uma `granted` para a mesma policy. | FR-42, docs/05-data-model.md | Conceder e depois negar a mesma policy ao mesmo usuário deve resultar em `ability.cannot(...)`. |
| RN-11 | Contas de trainer/admin só existem via seed script; nenhum caminho de aplicação pode criar uma. | FR-41, FR-43 | Não existe nenhuma mutation pública de "signup" que grave uma policy de staff. |

## Como usar isso nos prompts

Cada RN vira um prompt formal isolado, no mesmo padrão de `docs/08-traceability-matrix.md`, seguindo
o modelo da Unidade 1 §9. Veja `prompts/P-04-rn04-availability-tests.md` como exemplo completo.
