Tarefa: implementar o modelo de dados do catálogo de exercícios e equipamentos (FR-16, FR-17, FR-24).

Contexto:
- O sistema ainda não tem nenhum código em apps/ nem packages/ — este é o primeiro schema do projeto.
- A entidade pertence ao domínio "catalog": um exercício (d_exercises) pode precisar de zero ou mais
  equipamentos (d_gym_equipment), ligados por uma tabela N:N (d_exercise_equipment).
- O schema exato (colunas, tipos, obrigatoriedade) está definido em docs/05-data-model.md, seções
  "d_exercises", "d_gym_equipment" e "d_exercise_equipment" — use esse documento como fonte da
  verdade, não invente colunas.
- Convenções de nomenclatura e Drizzle estão em rules/database.md e rules/naming-conventions.md:
  tabelas snake_case prefixadas d_/f_, uuid PK exceto onde o doc diz o contrário, coluna Postgres
  snake_case mapeada para propriedade TS camelCase.

Escopo permitido:
- Criar apenas apps/api/src/db/schema/catalog.ts.
- Gerar a migration correspondente via drizzle-kit generate (não escrever SQL manual).
- Não criar routers, services, repositories ou nada de frontend nesta tarefa.
- Não alterar nenhum outro arquivo de schema existente.
- Não adicionar dependências novas além das já previstas em docs/04-architecture.md (Drizzle,
  PostgreSQL driver) — se algo estiver faltando no package.json, avise em vez de instalar sozinho.

Requisitos funcionais:
1. FR-16: exercícios vêm de uma biblioteca curada e estruturada (não texto livre).
2. FR-17: um exercício é elegível se não precisa de equipamento OU pelo menos um equipamento
   vinculado está disponível — a tabela precisa suportar essa checagem (is_available em
   d_gym_equipment, join via d_exercise_equipment).
3. FR-24: d_exercises é add-only — não crie nenhuma coluna nem trigger de soft-delete, apenas não
   inclua nenhum mecanismo de exclusão.

Critérios de aceite:
- As três tabelas existem com exatamente as colunas de docs/05-data-model.md.
- d_exercise_equipment tem chave primária composta (exercise_id, equipment_id).
- is_available é boolean com default true.
- A migration gerada por drizzle-kit generate está commitada.

Testes:
- Não é necessário teste unitário nesta etapa (é apenas schema).
- Validação: rodar drizzle-kit generate sem erro é suficiente.

Resposta final:
- Responder em no máximo 10 linhas com arquivos criados, comando de migration rodado e pendências.
