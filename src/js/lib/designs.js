// Modelos de telas (slides) para carrossel e estático, no estilo iOS.
// Layouts: capa, notas (app Notas), lista (Lembretes), imessage, widgets, foto, cta.
// Os textos que dependem da sua experiência ficam vazios com uma dica ("hint"); nada é inventado.

export const LAYOUTS = {
  capa: 'Capa',
  notas: 'Notas',
  lista: 'Lembretes',
  imessage: 'iMessage',
  widgets: 'Widgets',
  foto: 'Foto',
  cta: 'Final',
};

const cta = (goal) => ({
  layout: 'cta',
  title: goal === 'marcas' ? 'Faço esse tipo de conteúdo para marcas' : goal === 'comunidade' ? 'E você, como faz?' : 'Salva para ver depois',
  body: goal === 'marcas' ? 'contato na bio' : goal === 'comunidade' ? 'me conta nos comentários' : '',
});
const foto = (hint, extra = {}) => ({ layout: 'foto', photo: true, photoHint: hint, title: '', ...extra });
const empty = (n) => Array.from({ length: n }, () => ({ text: '', done: false }));

export function slidesFor(formatId, type, { title = '', goal = '' } = {}) {
  const capa = (extra = {}) => ({ layout: 'capa', kicker: '', title, ...extra });
  if (type === 'estatico') {
    if (formatId === 'lembretes-lista') return [{ layout: 'lista', title, items: empty(5), hint: '4 a 7 itens curtos e específicos' }];
    if (formatId === 'opiniao-impopular') return [{ layout: 'notas', kicker: 'opinião impopular', title, body: '', hint: 'Sua opinião em 3 a 5 frases curtas, com um motivo real' }];
    return [{ layout: 'notas', title, body: '', hint: 'Escreva como se fosse uma nota só para você' }];
  }
  if (type !== 'carrossel') return [];
  switch (formatId) {
    case 'review-honesto':
      return [capa({ kicker: 'review honesto', photo: true, photoHint: 'Você segurando o produto, luz natural, fundo neutro' }),
        { layout: 'widgets', title: 'Depois de usar de verdade', cells: [{ label: 'Gostei', value: '' }, { label: 'Não gostei', value: '' }, { label: 'Pra quem é', value: '' }, { label: 'Pra quem não é', value: '' }] },
        { layout: 'notas', title: 'Veredito', body: '', hint: 'Sua opinião final em 2 ou 3 frases' }, cta(goal)];
    case 'testei-7-dias':
      return [capa({ kicker: '7 dias testando', photo: true, photoHint: 'Foto sua com o produto no dia 1' }),
        { layout: 'widgets', title: 'Diário do teste', cells: [{ label: 'Dia 1', value: '' }, { label: 'Dia 3', value: '' }, { label: 'Dia 5', value: '' }, { label: 'Dia 7', value: '' }] },
        { layout: 'notas', title: 'Veredito', body: '', hint: 'Vale ou não vale, e para quem' }, cta(goal)];
    case 'uso-todo-dia':
    case 'favoritos-mes':
      return [capa({ kicker: formatId === 'favoritos-mes' ? 'favoritos do mês' : 'uso todo dia', photo: true, photoHint: 'Todos os itens juntos, vistos de cima' }),
        foto('Item 1 em uso, na sua mão ou no seu espaço', { title: '' }), foto('Item 2 em uso'), foto('Item 3 em uso'), cta(goal)];
    case 'a-vs-b':
      return [capa({ kicker: 'comparei', photo: true, photoHint: 'Os dois produtos lado a lado, mesma luz' }),
        { layout: 'widgets', title: 'Lado a lado', cells: [{ label: 'Primeiro', value: '' }, { label: 'Segundo', value: '' }, { label: 'Diferença que vi', value: '' }, { label: 'Eu escolho', value: '' }] },
        { layout: 'notas', title: 'Para quem é cada um', body: '', hint: 'Uma frase para cada' }, cta(goal)];
    case 'fotodump-historia':
      return [foto('Foto 1: a mais forte (seu rosto ou um momento)'), foto('Foto 2: um detalhe'), foto('Foto 3: o ambiente'), foto('Foto 4: você fazendo algo'), foto('Foto 5: um momento engraçado ou real')];
    case 'bastidores-ugc':
      return [capa({ kicker: 'bastidores ugc', photo: true, photoHint: 'Seu setup de gravação de longe (luz, tripé, produto)' }),
        foto('Print ou foto do vídeo final'), { layout: 'lista', title: 'O que eu usei', items: empty(4), hint: 'Equipamentos e truques reais' }, cta(goal)];
    case 'expectativa-realidade':
      return [foto('A versão idealizada (expectativa)', { kicker: 'expectativa' }), foto('A sua versão real', { kicker: 'realidade' })];
    case 'conversa-imessage':
      return [capa({ kicker: 'a conversa' }),
        { layout: 'imessage', messages: [{ me: false, text: '' }, { me: true, text: '' }, { me: false, text: '' }], hint: 'Mensagens reais ou recriadas, sem expor ninguém' },
        { layout: 'imessage', messages: [{ me: true, text: '' }, { me: false, text: '' }] },
        { layout: 'notas', title: 'Desfecho', body: '', hint: 'O que aconteceu depois' }];
    case 'carrossel-storytelling': {
      const parte = (t, hint) => ({ layout: 'notas', title: t, body: '', hint });
      return [capa({ kicker: 'uma história' }),
        parte('', 'Contexto: "Durante muito tempo eu…"'),
        parte('', 'Conflito: "Só que tinha uma coisa acontecendo…"'),
        parte('', 'A situação específica, com um detalhe real'),
        parte('Foi aí que eu percebi', 'O momento da virada'),
        parte('', 'O que mudou no que você faz ou pensa'),
        parte('', 'Reflexão que também serve para quem está lendo'),
        { layout: 'cta', title: '', body: 'você também está nessa fase?', hint: 'Frase final forte; a pergunta convida para os comentários' }];
    }
    default:
      return [capa(), { layout: 'notas', title: '', body: '', hint: 'Primeira parte' }, { layout: 'notas', title: '', body: '', hint: 'Segunda parte' }, cta(goal)];
  }
}

export const needsPhoto = (slides = []) => slides.some((s) => s.photo);

// Campos de texto ainda vazios (para avisar antes de exportar).
export function emptyFields(slide) {
  const out = [];
  if (slide.layout === 'notas' && !slide.body) out.push('texto');
  if (slide.layout === 'lista' && !(slide.items || []).some((i) => i.text)) out.push('itens');
  if (slide.layout === 'widgets' && (slide.cells || []).some((c) => !c.value)) out.push('widgets');
  if (slide.layout === 'imessage' && (slide.messages || []).some((m) => !m.text)) out.push('mensagens');
  if (slide.layout === 'capa' && !slide.title) out.push('título');
  return out;
}
