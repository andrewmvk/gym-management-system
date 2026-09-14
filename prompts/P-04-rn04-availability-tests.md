Tarefa: implementar e testar isoladamente a regra de negócio RN-04 (disponibilidade de exercício
por equipamento vinculado).

Contexto:
- Regra (docs/06-regras-de-negocio.md, RN-04): um exercício é elegível se não precisa de nenhum
  equipamento OU pelo menos um dos equipamentos vinculados a ele está disponível agora.
- Esta função já deve existir como parte do módulo catalog (ver prompts/P-02-catalog-backend.md);
  esta tarefa é sobre garantir que ela seja pura e totalmente coberta por teste, não sobre criar o
  módulo inteiro de novo.

Escopo permitido:
- Alterar apenas a função isExerciseAvailable (ou equivalente) em
  apps/api/src/modules/catalog/service.ts e seu arquivo de teste correspondente.
- Não alterar schema, router, repository ou frontend.
- Não adicionar dependências novas.

Critérios de aceite:
- A função é pura: recebe a lista de equipamentos já vinculados ao exercício (com seus
  is_available) como parâmetro, sem fazer nenhuma query dentro dela.
- Não precisa de equipamento (lista vazia) → sempre true.
- Um equipamento vinculado, disponível → true.
- Um equipamento vinculado, indisponível → false.
- Múltiplos equipamentos, pelo menos um disponível → true.
- Múltiplos equipamentos, todos indisponíveis → false.

Testes:
- Vitest cobrindo exatamente os cinco casos acima.
- Rodar apenas o arquivo de teste desta função.

Resposta final:
- Responder em no máximo 8 linhas com arquivo alterado, testes executados e pendências.
