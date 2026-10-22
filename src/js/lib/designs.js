// Modelos de telas (slides) para carrossel e estático, no estilo da Duane:
// foto como fundo, título grande creme e elementos do iPhone colados por cima.
// Layouts: capa, grade (4 fotos), notas, baloes, lista (to do list), imessage, foto, cta.
// Os textos que dependem da sua experiência ficam vazios com uma dica ("hint"); nada é inventado.

export const LAYOUTS = {
  capa: 'Capa com foto',
  grade: 'Grade de 4 fotos',
  notas: 'Nota do iPhone',
  baloes: 'Balões',
  lista: 'To do list',
  imessage: 'Conversa',
  foto: 'Foto + local',
  cta: 'Final com perfil',
};

const capa = (title, extra = {}) => ({ layout: 'capa', title, kicker: '', photo: true, photoHint: 'Foto sua, luz natural', decor: 'estrelas', ...extra });
const nota = (title, hint, extra = {}) => ({ layout: 'notas', title, body: '', hint, ...extra });
const baloes = (title, n, hint) => ({ layout: 'baloes', title, items: Array.from({ length: n }, () => ({ text: '' })), photo: true, photoHint: 'Foto sua de corpo inteiro ou meio corpo', hint });
const grade = (title, hint, extra = {}) => ({ layout: 'grade', title, kicker: '', photo: true, photoHint: hint, items: [], ...extra });
const foto = (title, kicker, hint) => ({ layout: 'foto', title, kicker, photo: true, photoHint: hint });
const todo = (items) => items.map((text) => ({ text, done: true }));
const final = (goal) => ({
  layout: 'cta',
  title: goal === 'marcas' ? 'gostou desse tipo de conteúdo?' : 'agora que você já sabe um pouco sobre mim…',
  body: goal === 'marcas' ? 'faço isso para marcas também ✨' : 'acho que podemos ser amigas',
  photo: true,
  photoHint: 'Foto sua sorrindo',
});

export function slidesFor(formatId, type, { title = '', goal = '' } = {}) {
  if (type === 'estatico') {
    if (formatId === 'lembretes-lista') return [{ layout: 'lista', title, items: [{ text: '', done: false }], photo: true, photoHint: 'Foto sua num momento da rotina', hint: '4 a 7 itens curtos e específicos' }];
    if (formatId === 'opiniao-impopular') return [nota('opinião impopular:', 'Sua opinião em 3 a 5 frases curtas, com um motivo real', { body: '' })];
    return [nota(title, 'Escreva como se fosse uma nota só para você')];
  }
  if (type !== 'carrossel') return [];
  switch (formatId) {
    case 'review-honesto':
      return [capa(title, { photoHint: 'Você segurando o produto, luz natural' }),
        baloes('depois de usar *de verdade*', 4, 'Gostei, não gostei, pra quem é, pra quem não é'),
        nota('meu veredito', 'Sua opinião final em 2 ou 3 frases'), final(goal)];
    case 'testei-7-dias':
      return [capa(title, { photoHint: 'Foto sua com o produto no dia 1' }),
        grade('diário do *teste*', 'Uma foto por dia (1, 3, 5 e 7)', { items: todo(['dia 1', 'dia 3', 'dia 5', 'dia 7']) }),
        nota('vale ou não vale?', 'Vale ou não vale, e para quem'), final(goal)];
    case 'uso-todo-dia':
    case 'favoritos-mes':
      return [capa(title, { kicker: formatId === 'favoritos-mes' ? 'favoritos do mês' : 'o que eu uso de verdade', decor: 'dourada' }),
        grade('meus *favoritos*', 'Fotos dos produtos ou de você usando'),
        baloes('por que *ficaram*', 4, 'Um motivo curto para cada um'), final(goal)];
    case 'expectativa-realidade':
      return [capa(title), foto('expectativa', '', 'A foto "como eu achava que seria"'), foto('realidade', '', 'A foto "como é de verdade"'), nota('o que eu aprendi', 'O que mudou na sua cabeça')];
    case 'a-vs-b':
      return [capa(title), foto('opção A', '', 'Foto da primeira opção'), foto('opção B', '', 'Foto da segunda opção'), nota('meu veredito', 'Qual você escolheria e por quê')];
    case 'bastidores-ugc':
      return [capa(title, { kicker: 'bastidores de um UGC' }),
        grade('por *trás*', 'Fotos do processo: briefing, set, gravação, edição', { items: todo(['ler o briefing', 'roteiro', 'gravar', 'editar e entregar']) }),
        nota('o que ninguém vê', 'Um detalhe real do processo que pouca gente imagina'), final(goal)];
    case 'fotodump-historia':
      return [capa(title, { kicker: 'um pouco da rotina', decor: 'dourada' }),
        grade('segunda', 'Fotos reais do dia', { kicker: '' }), grade('terça', 'Fotos reais do dia'), nota('', 'O que esses dias tiveram de especial')];
    case 'conversa-imessage':
      return [capa(title, { kicker: 'a conversa' }),
        { layout: 'imessage', contact: '', messages: [{ me: false, text: '' }, { me: true, text: '' }, { me: false, text: '' }], hint: 'Mensagens reais ou recriadas, sem expor ninguém' },
        { layout: 'imessage', contact: '', messages: [{ me: true, text: '' }, { me: false, text: '' }] },
        nota('e aí?', 'O que aconteceu depois')];
    case 'carrossel-storytelling':
      return [capa(title, { kicker: 'uma história' }),
        nota('', 'Contexto: "Durante muito tempo eu…"'),
        nota('', 'Conflito: "Só que tinha uma coisa acontecendo…"'),
        nota('', 'A situação específica, com um detalhe real'),
        nota('foi aí que eu percebi', 'O momento da virada'),
        nota('', 'O que mudou no que você faz ou pensa'),
        nota('', 'Reflexão que também serve para quem está lendo'),
        { layout: 'cta', title: '', body: 'você também está nessa fase?', photo: true, photoHint: 'Foto sua sorrindo', hint: 'Frase final forte; a pergunta convida para os comentários' }];
    default:
      return [capa(title), nota('', 'Primeira parte'), nota('', 'Segunda parte'), final(goal)];
  }
}

// Quantas fotos cada tela usa.
export const photoSlots = (s) => (!s?.photo ? 0 : s.layout === 'grade' ? 4 : 1);
export const photoIdsOf = (s) => (s.layout === 'grade' ? (s.photoIds || []).slice(0, 4) : [s.photoId].filter(Boolean));
export const missingIn = (s) => Math.max(0, photoSlots(s) - photoIdsOf(s).filter(Boolean).length);

export const needsPhoto = (slides = []) => slides.some((s) => s.photo);

// Campos de texto ainda vazios (para avisar antes de exportar).
export function emptyFields(slide) {
  const out = [];
  if (slide.layout === 'notas' && !slide.body) out.push('texto');
  if (['lista', 'baloes'].includes(slide.layout) && !(slide.items || []).some((i) => i.text)) out.push('itens');
  if (slide.layout === 'widgets' && (slide.cells || []).some((c) => !c.value)) out.push('widgets');
  if (slide.layout === 'imessage' && (slide.messages || []).some((m) => !m.text)) out.push('mensagens');
  if (['capa', 'grade'].includes(slide.layout) && !slide.title) out.push('título');
  return out;
}
