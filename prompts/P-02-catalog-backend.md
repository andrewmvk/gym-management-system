Tarefa: implementar as procedures tRPC do módulo catalog (listar exercícios, listar equipamentos,
criar exercício, criar equipamento, alternar disponibilidade de equipamento).

Contexto:
- O schema do catálogo já existe (ver prompts/P-01-catalog-data-model.md): d_exercises,
  d_gym_equipment, d_exercise_equipment.
- Estrutura de módulo backend por domínio está em rules/backend.md: router.ts (procedures + zod,
  sem query direta), service.ts (lógica), repository.ts (só Drizzle).
- Autorização é 100% via CASL (ctx.ability.can(operation, resource)), nunca um if de role — ver
  rules/backend.md seção "Authorization (CASL)" e docs/04-architecture.md §11.
- A regra de disponibilidade (FR-17 / RN-04) deve ser um único predicate em catalog/service.ts,
  reaproveitado por qualquer procedure que precise saber se um exercício está disponível — não
  reimplementar a lógica em mais de um lugar (rules/backend.md, seção "Exercise/equipment
  availability").

Escopo permitido:
- Criar apenas apps/api/src/modules/catalog/router.ts, service.ts, repository.ts.
- Se precisar de um novo subject CASL "Catalog", adicionar apenas em
  packages/shared/src/auth/types.ts (não recriar o arquivo inteiro, só estender).
- Não alterar frontend, Docker, outros módulos ou o schema criado no P-01.
- Não adicionar dependências novas.

Requisitos funcionais:
1. catalog.list — retorna exercícios com equipamentos vinculados e se cada um está disponível
   agora (aplicando o predicate).
2. catalog.listEquipment — retorna todos os equipamentos com seu is_available atual.
3. catalog.createExercise — cria um exercício; exige a policy de gestão de catálogo.
4. catalog.createEquipment — cria um equipamento; exige a policy de gestão de catálogo.
5. catalog.toggleEquipmentAvailability — inverte is_available de um equipamento; exige a policy de
   gestão de catálogo.
6. Não existe nenhuma procedure de delete para exercício (FR-24 / RN-05) nem para equipamento.

Critérios de aceite:
- Um exercício sem nenhum equipamento vinculado é sempre "disponível".
- Um exercício com equipamentos vinculados só é "disponível" se ao menos um estiver
  is_available = true.
- toggleEquipmentAvailability só afeta o equipamento indicado, nenhum outro.
- Qualquer chamada de create*/toggle* sem a policy correta retorna FORBIDDEN via ctx.ability.

Testes:
- Vitest unitário para o predicate de disponibilidade, cobrindo: sem equipamento vinculado; um
  equipamento disponível; um equipamento indisponível; múltiplos com pelo menos um disponível;
  múltiplos todos indisponíveis.
- Rodar apenas os testes do módulo catalog.

Resposta final:
- Responder em no máximo 10 linhas com arquivos alterados, testes executados e pendências.
