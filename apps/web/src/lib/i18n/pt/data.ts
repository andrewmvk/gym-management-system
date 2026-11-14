// Text that reaches the screen as data rather than code: validation messages from the shared schemas, messages
// the API returns and the seeded catalog. Looked up with tx(), which leaves anything unknown (an exercise an
// admin added later) as it was typed. Muscles, muscle groups and fact types are keyed by id in labels.ts.
export const PT_DATA = {
  // Shared zod schemas
  'Enter a valid e-mail': 'Informe um e-mail válido',
  'Enter your password': 'Informe sua senha',
  'Use the 24-hour HH:MM format': 'Use o formato de 24 horas HH:MM',
  'The gym must close after it opens': 'A academia precisa fechar depois de abrir',
  'The start date must not be after the end date': 'A data inicial não pode ser depois da final',
  'Choose at least one primary muscle': 'Escolha pelo menos um músculo principal',
  'A muscle can only be listed once': 'Um músculo só pode aparecer uma vez',
  'Height is required': 'Informe a altura',
  'Height must be a whole number of centimeters': 'A altura deve ser um número inteiro de centímetros',
  'Weight is required': 'Informe o peso',
  'Weight allows one decimal place': 'O peso aceita uma casa decimal',
  'Exam name is required': 'Informe o nome do exame',
  'Enter a valid date': 'Informe uma data válida',
  'Describe what the exam found': 'Descreva o resultado do exame',
  'An exam has one attachment': 'Um exame tem um anexo',
  'Goals are required': 'Informe seus objetivos',
  'Name is required': 'Informe o nome',
  'Phone is required': 'Informe o telefone',
  'A photo is required': 'A foto é obrigatória',
  'Biometric consent is required': 'O consentimento biométrico é obrigatório',
  'Name the header': 'Dê um nome ao cabeçalho',
  'Not a valid header name': 'Nome de cabeçalho inválido',
  'Give the header a value': 'Dê um valor ao cabeçalho',
  'Enter a valid URL': 'Informe uma URL válida',
  'The URL must start with http:// or https://': 'A URL precisa começar com http:// ou https://',
  'This header is already set': 'Esse cabeçalho já foi definido',
  'A GET request cannot have a body': 'Uma requisição GET não pode ter corpo',
  'Password must be at least 8 characters': 'A senha precisa ter pelo menos 8 caracteres',
  'Confirm your password': 'Confirme sua senha',
  'Passwords do not match': 'As senhas não coincidem',
  'An account already exists for this email. Try signing in instead.':
    'Já existe uma conta com este e-mail. Tente entrar.',

  // Seeded equipment (apps/api/src/db/seed-data/catalog.ts)
  Barbell: 'Barra',
  Dumbbells: 'Halteres',
  'Leg Press Machine': 'Aparelho de leg press',
  'Squat Rack': 'Rack de agachamento',
  Bench: 'Banco',
  'Cable Machine': 'Polia com cabos',
  'Lat Pulldown Machine': 'Aparelho de puxada alta',
  Treadmill: 'Esteira',
  'Stationary Bike': 'Bicicleta ergométrica',
  'Rowing Machine': 'Remo ergométrico',
  'Pull-up Bar': 'Barra fixa',
  Kettlebell: 'Kettlebell',

  // Seeded exercises and their instructions
  'Bodyweight Squat': 'Agachamento com peso corporal',
  'Feet shoulder-width apart, lower until thighs are parallel to the floor, drive back up.':
    'Pés na largura dos ombros, desça até as coxas ficarem paralelas ao chão e suba empurrando o chão.',
  'Barbell Back Squat': 'Agachamento livre com barra',
  'Bar racked across the upper back, squat to depth, drive up through the heels.':
    'Barra apoiada na parte alta das costas, agache até a profundidade e suba empurrando pelos calcanhares.',
  'Leg Press': 'Leg press',
  'Feet on the platform shoulder-width apart, lower under control, press back to start.':
    'Pés na plataforma na largura dos ombros, desça com controle e empurre de volta à posição inicial.',
  'Walking Lunge': 'Avanço andando',
  'Step forward into a lunge, alternate legs while moving across the floor.':
    'Dê um passo à frente em avanço, alternando as pernas enquanto se desloca pelo chão.',
  'Push-Up': 'Flexão de braço',
  'Hands under shoulders, lower the chest to the floor, press back up.':
    'Mãos sob os ombros, desça o peito até o chão e empurre de volta.',
  'Barbell Bench Press': 'Supino reto com barra',
  'Lie on the bench, lower the bar to the chest, press to full extension.':
    'Deite no banco, desça a barra até o peito e empurre até estender totalmente os braços.',
  'Dumbbell Chest Fly': 'Crucifixo com halteres',
  'Lie on the bench, arc the dumbbells out and back with a slight elbow bend.':
    'Deite no banco e abra e feche os halteres em arco, com uma leve flexão nos cotovelos.',
  'Cable Chest Press': 'Supino na polia',
  'Set cables at chest height, press both handles forward until arms extend.':
    'Ajuste os cabos na altura do peito e empurre as duas manoplas à frente até estender os braços.',
  'Pull-Up': 'Barra fixa',
  'Grip the bar shoulder-width, pull the chin above the bar, lower under control.':
    'Segure a barra na largura dos ombros, suba até o queixo passar da barra e desça com controle.',
  'Bent-Over Barbell Row': 'Remada curvada com barra',
  'Hinge at the hips, pull the bar to the lower ribs, lower with control.':
    'Incline o tronco flexionando o quadril, puxe a barra até as costelas inferiores e desça com controle.',
  'Lat Pulldown': 'Puxada alta',
  'Grip the bar wide, pull down to the upper chest, control the return.':
    'Segure a barra aberta, puxe até a parte alta do peito e controle a volta.',
  'Superman Hold': 'Superman isométrico',
  'Lie face down, lift arms and legs off the floor, hold briefly.':
    'Deite de bruços, tire braços e pernas do chão e segure por um instante.',
  'Overhead Dumbbell Press': 'Desenvolvimento com halteres',
  'Press dumbbells from shoulder height to full overhead extension.':
    'Empurre os halteres da altura dos ombros até estender totalmente acima da cabeça.',
  'Pike Push-Up': 'Flexão em pike',
  'Hips high in a pike position, lower the head toward the floor, press back up.':
    'Com o quadril alto em posição de pike, desça a cabeça em direção ao chão e empurre de volta.',
  'Cable Lateral Raise': 'Elevação lateral na polia',
  'Raise the cable handle out to shoulder height, lower under control.':
    'Eleve a manopla do cabo para o lado até a altura dos ombros e desça com controle.',
  'Diamond Push-Up': 'Flexão diamante',
  'Hands together under the chest forming a diamond, lower and press up.':
    'Mãos juntas sob o peito formando um diamante, desça e empurre de volta.',
  'Barbell Bicep Curl': 'Rosca direta com barra',
  'Curl the bar from thighs to shoulders, keeping the elbows fixed.':
    'Flexione a barra das coxas até os ombros, mantendo os cotovelos fixos.',
  'Dumbbell Hammer Curl': 'Rosca martelo com halteres',
  'Curl the dumbbells with a neutral grip from thighs to shoulders.':
    'Flexione os halteres com pegada neutra, das coxas até os ombros.',
  'Kettlebell Overhead Tricep Extension': 'Extensão de tríceps com kettlebell',
  'Hold the kettlebell overhead, lower behind the head, extend back up.':
    'Segure o kettlebell acima da cabeça, desça-o atrás da cabeça e estenda os braços de novo.',
  Plank: 'Prancha',
  'Forearms and toes on the floor, hold a straight line from head to heels.':
    'Antebraços e pontas dos pés no chão, mantenha uma linha reta da cabeça aos calcanhares.',
  'Bicycle Crunch': 'Abdominal bicicleta',
  'Alternate bringing elbow to opposite knee in a pedaling motion.':
    'Alterne levando o cotovelo ao joelho oposto, num movimento de pedalar.',
  'Cable Woodchopper': 'Lenhador na polia',
  'Pull the cable diagonally across the body from high to low, or low to high.':
    'Puxe o cabo na diagonal pelo corpo, de cima para baixo ou de baixo para cima.',
  'Treadmill Run': 'Corrida na esteira',
  'Sustained run at a steady, conversational pace.': 'Corrida contínua em ritmo constante, que permita conversar.',
  'Stationary Bike Ride': 'Pedalada na bicicleta ergométrica',
  'Steady-state cycling at a moderate, sustainable resistance.':
    'Pedalada contínua com resistência moderada e sustentável.',
  'Rowing Machine Sprint': 'Tiros no remo ergométrico',
  'Alternate short, hard rowing intervals with easy recovery strokes.':
    'Alterne intervalos curtos e intensos de remada com remadas leves de recuperação.',
} as const;
