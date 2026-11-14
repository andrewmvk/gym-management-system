// Staff area: members list and member detail, policies and groups.
export const PT_STAFF_MEMBERS = {
  // Members list
  'Membership status and plan for everyone who has signed up. Both are mocked, with no billing behind them.':
    'Situação da matrícula e plano de todo mundo que já se cadastrou. Os dois são simulados, sem cobrança por trás.',
  'membership::Plan': 'Plano',
  Membership: 'Matrícula',
  'membership::All': 'Todas',
  'membership::Active': 'Ativa',
  'membership::Inactive': 'Inativa',
  'membership::None': 'Nenhuma',
  'No access': 'Sem acesso',
  "Your account doesn't include the member list. Ask an admin if you need it.":
    'Sua conta não inclui a lista de alunos. Peça a um administrador se precisar.',
  "We couldn't load the members": 'Não foi possível carregar os alunos',
  'No members yet': 'Nenhum aluno ainda',
  'Members show up here once they finish signing up and set a password.':
    'Os alunos aparecem aqui depois que terminam o cadastro e definem uma senha.',
  'Search by name or email': 'Buscar por nome ou e-mail',
  'Filter by membership': 'Filtrar por matrícula',
  'No matches': 'Nenhum resultado',
  'Try another name, email or status.': 'Tente outro nome, e-mail ou situação.',
  members: 'alunos',

  // Membership control
  '{name} is active again and can log in.': 'A matrícula de {name} foi reativada e o acesso está liberado.',
  '{name} is inactive and was signed out.': 'A matrícula de {name} foi desativada e a sessão foi encerrada.',
  "We couldn't change the membership of {name}. Try again.":
    'Não foi possível mudar a matrícula de {name}. Tente de novo.',
  'Membership of {name}': 'Matrícula de {name}',
  'Deactivate {name}?': 'Desativar {name}?',
  '{name} is signed out right away and cannot log in until a staff member activates the membership again. Their plans and history stay as they are.':
    'A sessão de {name} é encerrada na hora, e não dá para entrar até alguém da equipe reativar a matrícula. Os treinos e o histórico continuam como estão.',
  'Deactivating...': 'Desativando...',
  Deactivate: 'Desativar',

  // Member detail
  'All members': 'Todos os alunos',
  'Member not found': 'Aluno não encontrado',
  'No member has this link. The link may be wrong.': 'Nenhum aluno tem este link. O link pode estar errado.',
  "We couldn't load this member": 'Não foi possível carregar este aluno',
  '{age} years old': '{age} anos',
  'Member since {date}': 'Aluno desde {date}',

  // Member detail: health profile
  'Current health profile': 'Perfil de saúde atual',
  'What the member told us in the health profile.': 'O que o aluno nos contou no perfil de saúde.',
  'This member has not submitted a health profile yet.': 'Este aluno ainda não enviou um perfil de saúde.',
  'Submitted {date}. The newest entry is the one the AI reads first.':
    'Enviado em {date}. A entrada mais recente é a que a IA lê primeiro.',
  'File attached by the member': 'Arquivo anexado pelo aluno',

  // Member detail: remembered facts
  'What the coach remembers': 'O que o coach lembra',
  'Facts mined from the chat messages with the coach. The AI reads the ones that still apply when it builds a plan. Struck facts were marked as no longer true.':
    'Fatos tirados das mensagens do chat com o coach. A IA lê os que ainda valem ao montar um treino. Os riscados foram marcados como não sendo mais verdade.',
  'marked no longer true on {date}': 'marcado como não sendo mais verdade em {date}',
  'Member said: {quote}': 'O aluno disse: {quote}',
  'Nothing remembered yet. Facts show up here once the member tells the coach about an injury, a medication or a change in routine.':
    'Nada lembrado ainda. Os fatos aparecem aqui quando o aluno conta ao coach sobre uma lesão, um medicamento ou uma mudança na rotina.',

  // Member detail: plans
  Plans: 'Treinos',
  'The last 60 days and any plan dated later, newest first. Each opens its review.':
    'Os últimos 60 dias e qualquer treino com data posterior, do mais recente ao mais antigo. Cada um abre a sua revisão.',
  'This member has no plans in that period.': 'Este aluno não tem treinos nesse período.',
  'Done {done} of {total}': '{done} de {total} feitos',
  '{count} note': '{count} nota',
  '{count} notes': '{count} notas',

  // Member detail: check-ins
  '{count} day with a check-in in the last {days} days': '{count} dia com check-in nos últimos {days} dias',
  '{count} days with a check-in in the last {days} days': '{count} dias com check-in nos últimos {days} dias',
  ', the latest on {date}': ', o mais recente em {date}',
  'Check-ins in the last 30 days': 'Check-ins nos últimos 30 dias',
  '{date}: checked in': '{date}: com check-in',
  '{date}: no check-in': '{date}: sem check-in',

  // Policies page
  'What each account can do. Grants change existing accounts only; none creates one.':
    'O que cada conta pode fazer. As permissões mudam só contas que já existem; nenhuma cria uma conta.',
  Users: 'Usuários',
  "Your account doesn't include policy management. Ask an admin if you need it.":
    'Sua conta não inclui a gestão de permissões. Peça a um administrador se precisar.',
  "We couldn't load the policies": 'Não foi possível carregar as permissões',
  'Filter by group': 'Filtrar por grupo',
  'All groups': 'Todos os grupos',
  'Filter by policy': 'Filtrar por permissão',
  'All policies': 'Todas as permissões',
  'Filter users': 'Filtrar usuários',
  All: 'Todos',
  'Needs attention': 'Precisa de atenção',
  'Nothing needs attention': 'Nada precisa de atenção',
  'No users': 'Nenhum usuário',
  'No user matches these filters.': 'Nenhum usuário corresponde a esses filtros.',
  'No denied, expired or soon-to-expire access.': 'Nenhum acesso negado, expirado ou perto de expirar.',
  'There are no accounts yet.': 'Ainda não há contas.',
  'Clear filters': 'Limpar filtros',
  users: 'usuários',

  // Policy summary words
  'subject::training plans': 'treinos',
  'subject::plan reviews': 'revisões de treino',
  'subject::the catalog': 'o catálogo',
  'subject::onboarding': 'o perfil de saúde',
  'subject::remembered facts': 'fatos lembrados',
  'subject::check-ins': 'check-ins',
  'subject::turnstile settings': 'ajustes da catraca',
  'subject::gym information': 'informações da academia',
  'subject::gym settings': 'ajustes da academia',
  'subject::metrics': 'métricas',
  'subject::members': 'alunos',
  'subject::policy assignments': 'atribuições de permissões',
  'subject::the member app': 'o app do aluno',
  'subject::the staff app': 'o app da equipe',
  'action::Create': 'Criar',
  'action::Read': 'Ver',
  'action::Update': 'Editar',
  'action::Delete': 'Excluir',
  'action::Manage': 'Gerenciar',
  'scope::their own only': 'só os próprios',
  'scope::everyone': 'todos',

  // Policy dialogs
  'Expires on (optional)': 'Expira em (opcional)',
  'No expiry': 'Sem expiração',
  'Leave empty for no expiry. It ends at the close of that day.':
    'Deixe vazio para não expirar. Termina ao fim desse dia.',
  'Search policies': 'Buscar permissões',
  'No policy matches.': 'Nenhuma permissão encontrada.',
  'already held, saving replaces it': 'já concedida, salvar substitui',
  Groups: 'Grupos',
  '{count} policies': '{count} permissões',
  'already a member, saving replaces the expiry': 'já faz parte, salvar substitui a expiração',
  'Added {name} to the {group} group.': '{name} entrou no grupo {group}.',
  'Denied "{label}" for {name}.': 'Permissão "{label}" negada para {name}.',
  'Granted "{label}" to {name}.': 'Permissão "{label}" concedida a {name}.',
  "We couldn't save that change. Try again.": 'Não foi possível salvar essa mudança. Tente de novo.',
  'Add access': 'Adicionar acesso',
  'Changes what {name} can do. Adding something they already have replaces its expiry.':
    'Muda o que {name} pode fazer. Adicionar algo que a pessoa já tem substitui a expiração.',
  'Changes what {name} can do. Adding something they already have replaces its expiry and effect.':
    'Muda o que {name} pode fazer. Adicionar algo que a pessoa já tem substitui a expiração e o efeito.',
  'What to add': 'O que adicionar',
  'A group': 'Um grupo',
  'A policy': 'Uma permissão',
  Group: 'Grupo',
  'A group gives every policy it contains. To take one away from this user, deny that policy afterwards.':
    'Um grupo dá todas as permissões que contém. Para tirar uma deste usuário, negue essa permissão depois.',
  Policy: 'Permissão',
  Effect: 'Efeito',
  Granted: 'Concedida',
  Denied: 'Negada',
  'A denial wins over every grant of the same permission, even one that comes from a group.':
    'Uma negação vale mais que qualquer concessão da mesma permissão, até uma que venha de um grupo.',
  'The user can do what this policy covers, unless a denial says otherwise.':
    'O usuário pode fazer o que esta permissão cobre, a menos que uma negação diga o contrário.',
  "You can't deny your own access to the staff area or to policy management.":
    'Você não pode negar seu próprio acesso à área da equipe nem à gestão de permissões.',
  Save: 'Salvar',
  'Removed {name} from the {group} group.': '{name} saiu do grupo {group}.',
  'Lifted the denial of "{label}" for {name}.': 'A negação de "{label}" para {name} foi retirada.',
  'Revoked "{label}" for {name}.': 'Permissão "{label}" revogada para {name}.',
  'Remove from this group?': 'Remover deste grupo?',
  'Lift this denial?': 'Retirar esta negação?',
  'Revoke this policy?': 'Revogar esta permissão?',
  '{name} loses everything the {group} group gives them, unless another group or a direct grant also provides it. The membership stays on their record and can be extended later.':
    '{name} perde tudo o que o grupo {group} dá, a menos que outro grupo ou uma concessão direta também dê. A participação continua no registro e pode ser prorrogada depois.',
  'The denial of "{label}" for {name} ends right away. Anything else they hold for it applies again.':
    'A negação de "{label}" para {name} acaba na hora. Qualquer outra concessão que a pessoa tenha para isso volta a valer.',
  '{name} loses "{label}" right away, unless a group still provides it. It stays on their record and can be extended later.':
    '{name} perde "{label}" na hora, a menos que um grupo ainda a dê. Continua no registro e pode ser prorrogada depois.',
  Remove: 'Remover',
  'Lift denial': 'Retirar negação',
  Revoke: 'Revogar',
  'Updated the {group} membership of {name}.': 'Participação de {name} no grupo {group} atualizada.',
  'Updated the expiry of "{label}" for {name}.': 'Expiração de "{label}" para {name} atualizada.',
  'Extend this membership': 'Prorrogar esta participação',
  'Change the denial period': 'Mudar o período da negação',
  'Extend this policy': 'Prorrogar esta permissão',
  '{name} in the {group} group.': '{name} no grupo {group}.',
  '"{label}" is denied for {name}.': '"{label}" está negada para {name}.',
  '"{label}" for {name}.': '"{label}" para {name}.',
  'It expired {date}. Saving a new period makes it active again.':
    'Expirou em {date}. Salvar um novo período reativa o acesso.',
  'It expires {date}.': 'Expira em {date}.',
  'It currently has no expiry.': 'No momento, não tem expiração.',
  'Until a date': 'Até uma data',
  'New expiry date': 'Nova data de expiração',
  'It ends at the close of that day.': 'Termina ao fim desse dia.',
  'Save expiry': 'Salvar expiração',

  // Policy user row
  Expired: 'Expirada',
  Expiring: 'Expirando',
  'no expiry': 'sem expiração',
  'expires {date}': 'expira em {date}',
  'expired {date}': 'expirou em {date}',
  'Extend the {group} membership of {name}': 'Prorrogar a participação de {name} no grupo {group}',
  'Remove {name} from the {group} group': 'Remover {name} do grupo {group}',
  Extend: 'Prorrogar',
  'grant::direct': 'direta',
  'revoking is refused if no group still gives you this access':
    'revogar é recusado se nenhum grupo ainda der esse acesso a você',
  'Extend {label} for {name}': 'Prorrogar {label} para {name}',
  'Lift denial of {label} for {name}': 'Retirar a negação de {label} para {name}',
  'Revoke {label} for {name}': 'Revogar {label} para {name}',
  Lift: 'Retirar',
  'via {group}': 'via {group}',
  'a denial overrides what the group gives': 'uma negação sobrepõe o que o grupo dá',
  'Deny {label} for {name}': 'Negar {label} para {name}',
  Deny: 'Negar',
  You: 'Você',
  'Add access for {name}': 'Adicionar acesso para {name}',
  "No groups or policies, so this account can't do anything yet.":
    'Sem grupos nem permissões, esta conta ainda não pode fazer nada.',
  'Hide {count} active policy': 'Ocultar {count} permissão ativa',
  'Hide {count} active policies': 'Ocultar {count} permissões ativas',
  'Show {count} active policy': 'Mostrar {count} permissão ativa',
  'Show {count} active policies': 'Mostrar {count} permissões ativas',

  // Group matrix
  'No policies': 'Nenhuma permissão',
  'No policy is defined yet.': 'Nenhuma permissão foi definida ainda.',
  'About the {group} group: {description}': 'Sobre o grupo {group}: {description}',
  'matrix::of': 'de',
  'Included in the {group} group': 'Incluída no grupo {group}',
  'Not included in the {group} group': 'Não incluída no grupo {group}',

  // Seeded groups and policies, which reach the screen as data
  Trainer: 'Treinador',
  'Gym members: their own plans, chat and onboarding':
    'Alunos da academia: os próprios treinos, o chat e o perfil de saúde',
  'Personal trainers: review and edit every plan': 'Treinadores: revisam e editam todos os treinos',
  'Gym admins: catalog, turnstile and access': 'Administradores: catálogo, catraca e acessos',
  'Open the member app': 'Abrir o app do aluno',
  'Fill in and extend their own onboarding': 'Preencher e atualizar o próprio perfil de saúde',
  'View their own training plans': 'Ver os próprios treinos',
  'Mark exercises and adjust their own plans': 'Marcar exercícios e ajustar os próprios treinos',
  'Use the AI chat, which records facts about themselves':
    'Usar o chat com a IA, que registra fatos sobre quem conversa',
  'See the facts the AI remembers about them and mark them resolved':
    'Ver os fatos que a IA lembra sobre si e marcar quais não são mais verdade',
  'View their own training metrics': 'Ver as próprias métricas de treino',
  'Browse the exercise and equipment catalog': 'Consultar o catálogo de exercícios e equipamentos',
  'View gym information and occupancy': 'Ver informações e ocupação da academia',
  'Open the staff app': 'Abrir o app da equipe',
  "View every member's training plans": 'Ver os treinos de todos os alunos',
  "Edit any member's training plan": 'Editar o treino de qualquer aluno',
  'Write review notes on any plan': 'Escrever notas de revisão em qualquer treino',
  'Add exercises and toggle equipment availability':
    'Adicionar exercícios e alternar a disponibilidade dos equipamentos',
  'Configure the external turnstile API': 'Configurar a API externa da catraca',
  'Grant, revoke and extend user policies': 'Conceder, revogar e prorrogar permissões de usuários',
  'View the member list': 'Ver a lista de alunos',
  'View every check-in': 'Ver todos os check-ins',
  'Switch a member membership between active and inactive': 'Alternar a matrícula de um aluno entre ativa e inativa',
  'Edit the gym opening hours': 'Editar os horários da academia',

  // Messages the API returns for members and policies
  'This account has no membership to change': 'Esta conta não tem matrícula para mudar',
  'The expiry date must be in the future': 'A data de expiração precisa ser no futuro',
  'That user does not exist': 'Esse usuário não existe',
  'That policy does not exist': 'Essa permissão não existe',
  'That group does not exist': 'Esse grupo não existe',
  'That user does not hold this policy directly': 'Esse usuário não tem essa permissão diretamente',
  'That user does not belong to this group': 'Esse usuário não pertence a este grupo',
  "You can't remove your own access to the staff area or to policy management":
    'Você não pode remover seu próprio acesso à área da equipe nem à gestão de permissões',
} as const;
