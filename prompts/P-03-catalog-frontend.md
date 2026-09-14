Tarefa: implementar a tela de catálogo (área staff) para listar exercícios/equipamentos e permitir
ao Admin cadastrar novos itens e alternar disponibilidade de equipamento.

Contexto:
- As procedures tRPC catalog.list, catalog.listEquipment, catalog.createExercise,
  catalog.createEquipment e catalog.toggleEquipmentAvailability já existem (ver
  prompts/P-02-catalog-backend.md).
- Convenções de frontend em rules/frontend.md: toda leitura/escrita de servidor via tRPC + React
  Query (nunca fetch manual); formulários com react-hook-form + zodResolver, reaproveitando o
  schema zod de packages/shared quando o input espelha uma procedure; shadcn/ui como base de
  qualquer componente interativo.
- Rotas ficam agrupadas por permissão, não por role: esta tela pertence ao grupo (staff)/ (rules/
  frontend.md, seção "Routing / access structure").

Escopo permitido:
- Criar apenas apps/web/src/app/(staff)/catalog/** (page.tsx e componentes específicos dessa tela).
- Não alterar rotas de member ou kiosk, não alterar nada em apps/api.
- Não adicionar biblioteca de UI além do que já está no projeto (Tailwind + shadcn/ui).

Requisitos funcionais:
1. Lista de exercícios mostrando nome, grupo muscular e um badge "disponível"/"indisponível"
   (usando o dado que catalog.list já retorna calculado).
2. Lista de equipamentos com um toggle (switch) de disponibilidade por item.
3. Formulário de cadastro de exercício (nome, grupo muscular, instruções, equipamentos vinculados).
4. Formulário de cadastro de equipamento (nome).

Critérios de aceite:
- O toggle de equipamento atualiza a UI e reconcilia com o servidor (React Query invalidation),
  sem exigir reload manual da página.
- O formulário de exercício bloqueia o submit se o nome estiver vazio, com mensagem de erro visível.
- A tela é usável em viewport mobile (NFR-1) sem quebrar layout.
- Os três estados de toda query (carregando, erro, vazio) são tratados explicitamente — nada
  renderiza undefined silenciosamente (rules/error-handling.md).

Testes:
- Este projeto não usa teste de componente (rules/testing.md) — a validação é manual: subir
  docker compose e navegar até /catalog logado como o admin seedado.

Resposta final:
- Responder em no máximo 10 linhas com arquivos criados, passos de validação manual e pendências.
