// Staff area: overview, reviews, members, catalog, check-ins, policies and settings.
export const PT_STAFF = {
  // Overview
  'Plans publish on their own. Here is what needs a trainer, what trainers touched this week, and what today’s plans ask of the equipment.':
    'Os treinos são publicados sozinhos. Aqui está o que precisa de um treinador, o que os treinadores mexeram esta semana e o que os treinos de hoje pedem dos equipamentos.',
  "We couldn't load the overview": 'Não foi possível carregar a visão geral',
  'Must review': 'Para revisar',
  'Trainer edits and notes': 'Edições e notas dos treinadores',
  '{exercise} ({equipment})': '{exercise} ({equipment})',
  'safety warning accepted on {exercises}': 'aviso de segurança aceito em {exercises}',
  'Next: {member}, {date}, {reasons}.': 'Próximo: {member}, {date}, {reasons}.',
  '{count} more.': 'Mais {count}.',
  'Every upcoming plan can be done with the equipment that is running, and no accepted safety warning is waiting for a trainer.':
    'Todos os próximos treinos podem ser feitos com os equipamentos em funcionamento, e nenhum aviso de segurança aceito está esperando um treinador.',
  'Plans edited or noted in the last {days} days.': 'Treinos editados ou com nota nos últimos {days} dias.',
  "Latest: {author} edited {member}'s plan for {date}, {time}":
    'Último: {author} editou o treino de {member} para {date}, {time}',
  "Latest: {author} noted {member}'s plan for {date}, {time}":
    'Último: {author} deixou uma nota no treino de {member} para {date}, {time}',
  'No trainer has edited or left a note on a plan in the last {days} days.':
    'Nenhum treinador editou nem deixou nota em um treino nos últimos {days} dias.',
  "We couldn't load the turnstile status": 'Não foi possível carregar o status da catraca',
  '{failed} of {total} check-in today did not open the turnstile.':
    '{failed} de {total} check-in de hoje não abriu a catraca.',
  '{failed} of {total} check-ins today did not open the turnstile.':
    '{failed} de {total} check-ins de hoje não abriram a catraca.',
  'No check-ins yet today.': 'Ainda não há check-ins hoje.',
  'All {total} check-in today opened the turnstile.': 'Hoje houve {total} check-in, e ele abriu a catraca.',
  'All {total} check-ins today opened the turnstile.': 'Todos os {total} check-ins de hoje abriram a catraca.',
  'Not configured: every check-in will show as failed.': 'Não configurada: todo check-in vai aparecer como falha.',

  // Today's demand
  "What today's plans ask of the gym, so missing or crowded equipment is no surprise.":
    'O que os treinos de hoje pedem da academia, para que equipamento faltando ou lotado não seja surpresa.',
  'plural::Equipment': 'Equipamentos',
  'Plans per muscle': 'Treinos por músculo',
  'Plans per piece': 'Treinos por equipamento',
  '{name}, out of service': '{name}, fora de serviço',
  'Muscles trained by plans of members already checked in':
    'Músculos treinados pelos treinos de alunos que já fizeram check-in',
  'Muscles trained today': 'Músculos treinados hoje',
  'Fewer plans': 'Menos treinos',
  'More plans': 'Mais treinos',
  'No plan trains it': 'Nenhum treino trabalha',
  'Each number is how many plans train that muscle or need that piece of equipment. Exercises that cannot be done now are not counted.':
    'Cada número é quantos treinos trabalham aquele músculo ou precisam daquele equipamento. Exercícios que não podem ser feitos agora não são contados.',
  '{link} (struck through).': '{link} (riscados).',
  '{count} out of service': '{count} fora de serviço',
  "We couldn't load today's demand": 'Não foi possível carregar a demanda de hoje',
  'No plans dated today yet': 'Ainda não há treinos com data de hoje',
  'Plans show up here as members build them for today.':
    'Os treinos aparecem aqui conforme os alunos montam os de hoje.',
  'Plans to count': 'Treinos a contar',
  'All plans today': 'Todos os treinos de hoje',
  'Already checked in': 'Já fizeram check-in',
  'Nobody with a plan has checked in yet': 'Ninguém com treino fez check-in ainda',
  'The plans of members who are in the gym show up here once they check in.':
    'Os treinos dos alunos que estão na academia aparecem aqui assim que fazem check-in.',
  '1 plan': '1 treino',
  '{count} plans': '{count} treinos',
  '1 member': '1 aluno',
  '{count} members': '{count} alunos',

  // Catalog
  'The exercises plans are built from. An exercise can be done when it needs no equipment or at least one linked item is in service.':
    'Os exercícios com que os treinos são montados. Um exercício pode ser feito quando não precisa de equipamento ou quando pelo menos um item vinculado está em serviço.',
  'Every exercise in the catalog, and whether it can be done today.':
    'Todos os exercícios do catálogo e se podem ser feitos hoje.',
  'Every piece of equipment, and whether it is in service today. Plans are not counted here.':
    'Todos os equipamentos e se estão em serviço hoje. Os treinos não são contados aqui.',
  "What the catalog could train, regardless of today's plans.":
    'O que o catálogo permite treinar, independentemente dos treinos de hoje.',
  Exercises: 'Exercícios',
  Coverage: 'Cobertura',
  Equipment: 'Equipamento',
  Status: 'Status',
  Name: 'Nome',
  Available: 'Disponível',
  Instructions: 'Instruções',
  'No matches': 'Nenhum resultado',
  exercises: 'exercícios',
  '{muscles} + {count}': '{muscles} + {count}',

  // Catalog: exercises
  'No muscles tagged': 'Nenhum músculo marcado',
  'Add exercise': 'Adicionar exercício',
  "We couldn't load the exercises": 'Não foi possível carregar os exercícios',
  'No exercises yet': 'Ainda não há exercícios',
  'Add the first one to start building plans.': 'Adicione o primeiro para começar a montar treinos.',
  'An admin adds exercises here.': 'Um administrador adiciona os exercícios aqui.',
  'Search exercises or muscles': 'Buscar exercícios ou músculos',
  'Try another name or muscle.': 'Tente outro nome ou músculo.',

  // Catalog: new exercise
  'Instructions are required': 'Informe as instruções',
  'An exercise with this name is already in the catalog.': 'Já existe um exercício com este nome no catálogo.',
  '{name} added to the catalog.': '{name} adicionado ao catálogo.',
  'Show it': 'Mostrar',
  "Couldn't add the exercise. Try again.": 'Não foi possível adicionar o exercício. Tente de novo.',
  'New exercise': 'Novo exercício',
  'Stays in the catalog once added, so past plans keep resolving. Name, instructions and muscles are required.':
    'Fica no catálogo depois de adicionado, para que treinos antigos continuem funcionando. Nome, instruções e músculos são obrigatórios.',
  'Draft restored from where you left off.': 'Rascunho restaurado de onde você parou.',
  'Start over': 'Recomeçar',
  'e.g. Incline dumbbell press': 'ex.: Supino inclinado com halteres',
  'How to do it, in a few steps. Members and the coach read this.':
    'Como fazer, em poucos passos. Os alunos e o coach leem isto.',
  'Equipment needed': 'Equipamento necessário',
  '(optional, none for bodyweight)': '(opcional, nenhum para peso do corpo)',
  'No equipment in the gym yet. Add some on the Equipment tab, or save this as a bodyweight exercise.':
    'Ainda não há equipamentos na academia. Adicione na aba Equipamentos ou salve como exercício com o peso do corpo.',
  'Select equipment': 'Selecione equipamentos',
  'No equipment matches.': 'Nenhum equipamento encontrado.',
  'Muscles trained': 'Músculos trabalhados',
  'Adding...': 'Adicionando...',
  'Add to catalog': 'Adicionar ao catálogo',

  // Catalog: equipment
  'If out of service': 'Se estiver fora de serviço',
  '{name} added and in service.': '{name} adicionado e em serviço.',
  'Link exercises': 'Vincular exercícios',
  "Couldn't add the equipment. Try again.": 'Não foi possível adicionar o equipamento. Tente de novo.',
  'This equipment is already in the list.': 'Este equipamento já está na lista.',
  'Add equipment': 'Adicionar equipamento',
  'e.g. Battle ropes': 'ex.: Cordas navais',
  'It starts in service. Link its exercises once it is added.':
    'Ele começa em serviço. Vincule os exercícios depois de adicionar.',
  'Nothing, every exercise has another option': 'Nada, todo exercício tem outra opção',
  'Out of service takes out {muscles}': 'Fora de serviço, tira o treino de {muscles}',
  'In service': 'Em serviço',
  "We couldn't load the equipment": 'Não foi possível carregar os equipamentos',
  'No equipment yet': 'Ainda não há equipamentos',
  'Add the first piece. Bodyweight exercises work without any.':
    'Adicione o primeiro equipamento. Exercícios com o peso do corpo funcionam sem nenhum.',
  'Bodyweight exercises work without any.': 'Exercícios com o peso do corpo funcionam sem nenhum.',
  'Search equipment': 'Buscar equipamentos',
  'Try another name.': 'Tente outro nome.',
  '{name} is back in service.': '{name} voltou a ficar em serviço.',
  '{name} is out of service.': '{name} está fora de serviço.',
  "We couldn't update {name}. Try again.": 'Não foi possível atualizar {name}. Tente de novo.',
  '{name} in service': '{name} em serviço',
  'Take {name} out of service?': 'Tirar {name} de serviço?',
  "We couldn't check which plans depend on it. You can still take it out of service, and any plan that needs it is flagged as Must review.":
    'Não foi possível verificar quais treinos dependem dele. Você ainda pode tirá-lo de serviço, e qualquer treino que precise dele fica marcado como "Para revisar".',
  'No plan depends on it.': 'Nenhum treino depende dele.',
  '{plans} dated today or later will be marked Must review ({members} affected).':
    'Treinos com data de hoje em diante que serão marcados como "Para revisar": {plans}. Alunos afetados: {members}.',
  '{plans} dated today use it.': 'Treinos de hoje que usam o equipamento: {plans}.',
  'Take out of service': 'Tirar de serviço',

  // Catalog: linked exercises
  '1 exercise': '1 exercício',
  '{count} exercises': '{count} exercícios',
  'Linked exercises of {name} saved.': 'Exercícios vinculados de {name} salvos.',
  "We couldn't save the links of {name}. Try again.": 'Não foi possível salvar os vínculos de {name}. Tente de novo.',
  'Linked exercises': 'Exercícios vinculados',
  'The exercises that use {name}. An exercise can be done while at least one of its linked pieces is in service.':
    'Os exercícios que usam {name}. Um exercício pode ser feito enquanto pelo menos um dos equipamentos vinculados estiver em serviço.',
  'Search exercises': 'Buscar exercícios',
  '{selected} of {total} exercises linked.': '{selected} de {total} exercícios vinculados.',
  'No exercise matches.': 'Nenhum exercício encontrado.',
  'New exercise with {name}': 'Novo exercício com {name}',
  '{count} exercise would have no equipment at all and count as always available, even if this piece is out of service: {names}.':
    '{count} exercício ficaria sem equipamento algum e contaria como sempre disponível, mesmo com este equipamento fora de serviço: {names}.',
  '{count} exercises would have no equipment at all and count as always available, even if this piece is out of service: {names}.':
    '{count} exercícios ficariam sem equipamento algum e contariam como sempre disponíveis, mesmo com este equipamento fora de serviço: {names}.',
  'Save links': 'Salvar vínculos',
  'Linked exercises of {name}, {exercises}': 'Exercícios vinculados de {name}, {exercises}',
  linked: 'vinculados',

  // Catalog: coverage
  'Available now': 'Disponíveis agora',
  'Every exercise in the catalog, counted for each muscle it works.':
    'Todos os exercícios do catálogo, contados para cada músculo que trabalham.',
  'Only exercises that can be done right now.': 'Só os exercícios que podem ser feitos agora.',
  'exercise lost': 'exercício perdido',
  'exercises lost': 'exercícios perdidos',
  'Muscle coverage': 'Cobertura muscular',
  "We couldn't load the coverage": 'Não foi possível carregar a cobertura',
  'Coverage shows up once exercises are added with their muscles.':
    'A cobertura aparece quando há exercícios cadastrados com seus músculos.',
  'With {name} out of service, {count} exercise is lost, hitting {muscles}.':
    'Com {name} fora de serviço, {count} exercício fica indisponível, afetando {muscles}.',
  'With {name} out of service, {count} exercises are lost, hitting {muscles}.':
    'Com {name} fora de serviço, {count} exercícios ficam indisponíveis, afetando {muscles}.',
  '{name} out of service loses nothing, because every exercise that uses it has another option.':
    'Com {name} fora de serviço, nada se perde, porque todo exercício que o usa tem outra opção.',
  'Most affected: {muscles}.': 'Mais afetados: {muscles}.',
  'Nothing is lost. Every exercise can be done.': 'Nada se perde. Todos os exercícios podem ser feitos.',
  'Best covered: {muscles}.': 'Mais bem cobertos: {muscles}.',
  '{count} with no available exercise: {muscles}.': '{count} sem exercício disponível: {muscles}.',
  '{count} with no exercise: {muscles}.': '{count} sem nenhum exercício: {muscles}.',
  'Every muscle has an exercise.': 'Todo músculo tem um exercício.',
  'How well the catalog covers each muscle, and what out-of-service equipment costs.':
    'Quanto o catálogo cobre cada músculo e o que o equipamento fora de serviço custa.',
  'Coverage view': 'Visão da cobertura',
  'Narrow by equipment': 'Filtrar por equipamento',
  'All pieces': 'Todos os equipamentos',
  'All equipment is in service, so nothing is lost.': 'Todos os equipamentos estão em serviço, então nada se perde.',
  'Muscle coverage of the catalog': 'Cobertura muscular do catálogo',
  'Less lost': 'Menos perdido',
  'More lost': 'Mais perdido',
  'Fewer exercises': 'Menos exercícios',
  'More exercises': 'Mais exercícios',
  'No exercise available now': 'Nenhum exercício disponível agora',
  'Close {muscle} details': 'Fechar detalhes de {muscle}',
  'No exercise trains this muscle yet.': 'Nenhum exercício trabalha este músculo ainda.',
  '{ratio} exercises available.': '{ratio} exercícios disponíveis.',
  'role::supporting': 'auxiliar',
  'bodyweight only': 'só peso do corpo',
  'Muscle coverage, ranked': 'Cobertura muscular, em ordem',

  // Check-ins
  'The latest check-ins and whether the turnstile opened. A check-in is always recorded, even when the turnstile does not respond.':
    'Os últimos check-ins e se a catraca abriu. O check-in é sempre registrado, mesmo quando a catraca não responde.',
  'Turnstile not configured': 'Catraca não configurada',
  'Timed out': 'Tempo esgotado',
  'Turnstile answered with an error': 'A catraca respondeu com erro',
  'Could not reach the turnstile': 'Não foi possível acessar a catraca',
  Unknown: 'Desconhecido',
  Reason: 'Motivo',
  'No access': 'Sem acesso',
  "Your account doesn't include the check-in log. Ask an admin if you need it.":
    'Sua conta não inclui o registro de check-ins. Peça a um administrador se precisar.',
  "We couldn't load the check-ins": 'Não foi possível carregar os check-ins',
  'No check-ins yet': 'Ainda não há check-ins',
  'Check-ins show up here as members arrive at the kiosk.':
    'Os check-ins aparecem aqui conforme os alunos chegam ao quiosque.',
  'Search members': 'Buscar alunos',
  'Filter by turnstile result': 'Filtrar pelo resultado da catraca',
  All: 'Todos',
  'Did not open': 'Não abriu',
  Opened: 'Abriu',
  'Try another member name.': 'Tente outro nome de aluno.',
  'Every recent check-in opened the turnstile': 'Todos os check-ins recentes abriram a catraca',
  'Check-ins where the turnstile did not open would be listed here.':
    'Check-ins em que a catraca não abriu apareceriam aqui.',
  'check-ins': 'check-ins',

  // Opening hours
  'When the gym is open each day of the week. A closed day has no hours at all.':
    'Quando a academia abre em cada dia da semana. Um dia fechado não tem horário nenhum.',
  'Opening hours saved.': 'Horários salvos.',
  "We couldn't save the opening hours. Try again.": 'Não foi possível salvar os horários. Tente de novo.',
  "Your account doesn't include gym settings. Ask an admin if you need it.":
    'Sua conta não inclui os ajustes da academia. Peça a um administrador se precisar.',
  "We couldn't load the opening hours": 'Não foi possível carregar os horários',
  Closed: 'Fechado',
  '{day} opens': 'Abertura de {day}',
  '{day} closes': 'Fechamento de {day}',
  to: 'até',
  'Closed all day': 'Fechado o dia todo',
  'Save opening hours': 'Salvar horários',
  "Times use the gym's local clock. The public gym page and the open or closed state follow these hours.":
    'Os horários seguem o relógio local da academia. A página pública da academia e o estado de aberta ou fechada seguem esses horários.',

  // Turnstile settings
  'The request sent to the turnstile API on every check-in.': 'A requisição enviada à API da catraca em cada check-in.',
  'Nothing is saved yet, so no request was sent.': 'Nada foi salvo ainda, então nenhuma requisição foi enviada.',
  'The turnstile API answered with an error.': 'A API da catraca respondeu com erro.',
  'The turnstile API did not answer within 5 seconds.': 'A API da catraca não respondeu em 5 segundos.',
  'The turnstile API could not be reached.': 'Não foi possível acessar a API da catraca.',
  'Turnstile settings saved.': 'Configurações da catraca salvas.',
  "We couldn't save the settings. Try again.": 'Não foi possível salvar as configurações. Tente de novo.',
  "We couldn't run the test. Try again.": 'Não foi possível executar o teste. Tente de novo.',
  "Your account doesn't include turnstile configuration. Ask an admin if you need it.":
    'Sua conta não inclui a configuração da catraca. Peça a um administrador se precisar.',
  "We couldn't load the settings": 'Não foi possível carregar as configurações',
  Configured: 'Configurada',
  'Not configured': 'Não configurada',
  'Last saved {time}': 'Salvo pela última vez em {time}',
  'Check-ins are tagged failed until this is saved.': 'Os check-ins ficam marcados como falha até isto ser salvo.',
  Request: 'Requisição',
  'HTTP method': 'Método HTTP',
  'Query values show only their last four characters once saved.':
    'Valores de query mostram só os últimos quatro caracteres depois de salvos.',
  Headers: 'Cabeçalhos',
  'Add header': 'Adicionar cabeçalho',
  'None. Add a key, token or Content-Type if the API needs one.':
    'Nenhum. Adicione uma chave, token ou Content-Type se a API precisar.',
  'Header {number} name': 'Nome do cabeçalho {number}',
  'Header {number} value': 'Valor do cabeçalho {number}',
  Secret: 'Secreto',
  'A secret value is hidden once saved and shows only its last four characters.':
    'Um valor secreto fica oculto depois de salvo e mostra só os últimos quatro caracteres.',
  'Remove header {number}': 'Remover cabeçalho {number}',
  'Body (optional)': 'Corpo (opcional)',
  'Insert {placeholder} at the end of the body': 'Inserir {placeholder} no fim do corpo',
  'A GET request has no body': 'Uma requisição GET não tem corpo',
  'Save settings': 'Salvar configurações',
  'Testing...': 'Testando...',
  'Test connection': 'Testar conexão',
  'Save your changes to test them.': 'Salve suas alterações para testá-las.',
  'The test sends the saved request for real, so the turnstile opens. No check-in is recorded.':
    'O teste envia a requisição salva de verdade, então a catraca abre. Nenhum check-in é registrado.',
  Success: 'Sucesso',
  Failed: 'Falhou',
  'HTTP {status}': 'HTTP {status}',
  'The turnstile API accepted the request.': 'A API da catraca aceitou a requisição.',
  '(empty response)': '(resposta vazia)',
} as const;
