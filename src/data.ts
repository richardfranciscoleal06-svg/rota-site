import type {
  Member,
  PendingRegistration,
  RSOReport,
  ActivePatrol,
  RankingEntry,
} from '@/types';

export const credentials: { id: string; senha: string; isAdmin: boolean }[] = [];

export const mockMembers: Member[] = [];

export const mockPendingRegistrations: PendingRegistration[] = [];

export const mockRSOReports: RSOReport[] = [];

export const mockActivePatrols: ActivePatrol[] = [];

export const mockRankingHoras: RankingEntry[] = [
  { id: '1', nome: 'Carlos Eduardo Almeida', patente: 'Coronel', valor: 320 },
  { id: '2', nome: 'Rafael Mendes Souza', patente: 'Tenente-Coronel', valor: 290 },
  { id: '3', nome: 'Diego Fernandes Lima', patente: 'Major', valor: 275 },
  { id: '8', nome: 'Henrique Alves Barbosa', patente: 'Subtenente', valor: 255 },
  { id: '4', nome: 'André Costa Silva', patente: 'Capitão', valor: 240 },
  { id: '5', nome: 'Bruno Oliveira Rocha', patente: '1º Tenente', valor: 210 },
  { id: '6', nome: 'Felipe Santos Araújo', patente: '2º Tenente', valor: 195 },
  { id: '9', nome: 'Igor Ramos Cardoso', patente: '1º Sargento', valor: 185 },
  { id: '7', nome: 'Gabriel Martins Dias', patente: 'Aspirante', valor: 170 },
  { id: '10', nome: 'João Pedro Teixeira', patente: '2º Sargento', valor: 160 },
];

export const mockRankingApreensoes: RankingEntry[] = [
  { id: '1', nome: 'Carlos Eduardo Almeida', patente: 'Coronel', valor: 185000 },
  { id: '2', nome: 'Rafael Mendes Souza', patente: 'Tenente-Coronel', valor: 162000 },
  { id: '3', nome: 'Diego Fernandes Lima', patente: 'Major', valor: 148000 },
  { id: '8', nome: 'Henrique Alves Barbosa', patente: 'Subtenente', valor: 125000 },
  { id: '4', nome: 'André Costa Silva', patente: 'Capitão', valor: 131000 },
  { id: '5', nome: 'Bruno Oliveira Rocha', patente: '1º Tenente', valor: 112000 },
  { id: '6', nome: 'Felipe Santos Araújo', patente: '2º Tenente', valor: 98000 },
  { id: '9', nome: 'Igor Ramos Cardoso', patente: '1º Sargento', valor: 91000 },
  { id: '7', nome: 'Gabriel Martins Dias', patente: 'Aspirante', valor: 84000 },
  { id: '10', nome: 'João Pedro Teixeira', patente: '2º Sargento', valor: 76000 },
];

export const patenteOrder: string[] = [
  'General', 'Coronel', 'Tenente-Coronel', 'Major', 'Capitão',
  '1º Tenente', '2º Tenente', 'Aspirante', 'Subtenente',
  '1º Sargento', '2º Sargento', '3º Sargento', 'Cabo', 'Soldado', 'Recruta',
];

export const regulamentoDocs = [
  {
    id: 'cap1',
    titulo: 'Capítulo I — Disposições Gerais',
    secoes: [
      { subtitulo: 'Art. 1º', texto: 'O presente Regulamento disciplina a organização, o funcionamento e a disciplina dos membros do 1º Batalhão de Choque da ROTA no servidor Jaguaré RP.' },
      { subtitulo: 'Art. 2º', texto: 'A ROTA tem por finalidade o policiamento ostensivo, a repressão qualificada e a manutenção da ordem pública em todo o território do servidor.' },
      { subtitulo: 'Art. 3º', texto: 'Todo integrante da ROTA está sujeito às normas contidas neste Regulamento, sem prejuízo de demais legislações aplicáveis do servidor.' },
    ],
  },
  {
    id: 'cap2',
    titulo: 'Capítulo II — Hierarquia e Disciplina',
    secoes: [
      { subtitulo: 'Art. 4º', texto: 'A hierarquia militar é a base da disciplina. A subordinação aos superiores hierárquicos é dever absoluto.' },
      { subtitulo: 'Art. 5º', texto: 'Nenhum militar pode se recusar a cumprir ordem direta de superior hierárquico, salvo se manifestamente ilegal.' },
      { subtitulo: 'Art. 6º', texto: 'O descumprimento de ordens de serviço sujeita o infrator a sanções disciplinares previstas neste Regulamento.' },
    ],
  },
  {
    id: 'cap3',
    titulo: 'Capítulo III — Deveres e Proibições',
    secoes: [
      { subtitulo: 'Art. 7º', texto: 'São deveres do militar: comparecer pontualmente às escalas, portar-se com urbanidade, zelar pelo armamento e viatura, e comunicar irregularidades.' },
      { subtitulo: 'Art. 8º', texto: 'É proibido ao militar: usar de violência desnecessária, praticar atos de corrupção, abandonar o posto sem ordem, e divulvar informações internas.' },
    ],
  },
  {
    id: 'cap4',
    titulo: 'Capítulo IV — Patrulhamento Ostensivo',
    secoes: [
      { subtitulo: 'Art. 9º', texto: 'Todo patrulhamento deve ser registrado via Bate-Ponto no painel interno, indicando a viatura e a composição da barca.' },
      { subtitulo: 'Art. 10º', texto: 'Ao final do turno, o militar deve transmitir o Relatório de Serviço Ostensivo (RSO) com todos os dados da patrulha.' },
      { subtitulo: 'Art. 11º', texto: 'O abandono de patrulha sem encerramento formal constitui infração gravíssima, sujeita a demissão sumária.' },
    ],
  },
  {
    id: 'cap5',
    titulo: 'Capítulo V — Sanções Disciplinares',
    secoes: [
      { subtitulo: 'Art. 12º', texto: 'As sanções aplicáveis são: advertência verbal, repreensão, suspensão, perda de patente e demissão.' },
      { subtitulo: 'Art. 13º', texto: 'A aplicação de sanções compete ao Comandante Geral e, em sua ausência, ao Subcomandante.' },
    ],
  },
];

export const historiaRota = [
  { titulo: 'Origens', texto: 'A Rondas Ostensivas Tobias de Aguiar (ROTA) foi criada em 1970 como uma unidade de elite da Polícia Militar do Estado de São Paulo (PMESP), com o objetivo de realizar policiamento ostensivo fardado e repressão qualificada em áreas de maior incidência criminal.' },
  { titulo: 'Diferencial Tático', texto: 'A ROTA opera com a filosofia de policiamento em duplas e trios, utilizando viaturas equipadas para resposta rápida. Seu modelo operacional tornou-se referência em policiamento ostensivo no Brasil.' },
  { titulo: 'No Jaguaré RP', texto: 'No servidor Jaguaré RP, o 1º Batalhão de Choque reproduz com fidelidade a estrutura e o operacional da ROTA. Os membros passam por curso de formação, são avaliados continuamente e sobem na hierarquia por mérito e tempo de serviço.' },
  { titulo: 'Valores', texto: 'Disciplina, hierarquia, honra e compromisso com a ordem pública. Cada operador da ROTA Jaguaré veste o fardamento com orgulho e atua com profissionalismo em todas as ocorrências.' },
];
