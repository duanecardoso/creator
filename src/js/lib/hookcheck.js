// Revisor local de ganchos: aponta padrões que você pediu para evitar.
// Não "aprova" um gancho — só sinaliza riscos para você decidir.

const RULES = [
  { re: /^\s*(oi|olá|ola|e a[ií])\s*(gente|pessoal|galera|amores|meninas)/i, msg: 'Começa com saudação. Os primeiros segundos ficam sem informação.' },
  { re: /\b(voc[eê]|vc) sabia\b/i, msg: '"Você sabia" é um dos ganchos mais gastos.' },
  { re: /ningu[eé]m (te )?(fala|conta|comenta)/i, msg: '"Ninguém fala sobre" é clichê e costuma prometer mais do que entrega.' },
  { re: /\b(pare|para) de\b/i, msg: '"Pare de..." soa como bronca e virou fórmula.' },
  { re: /\b\d+\s+(dicas?|erros?|segredos?|truques?|passos?|motivos?)\b/i, msg: 'Lista numerada genérica. Funciona melhor quando a situação é específica.' },
  { re: /\b(o|um) segredo\b|\ba verdade (sobre|que)\b/i, msg: '"O segredo / a verdade sobre" promete revelação; só use se houver uma.' },
  { re: /n[aã]o vai acreditar|mudou (a )?minha vida|chocad[ao]/i, msg: 'Exagero de efeito. Tende a soar artificial.' },
  { re: /(assist[ae]|fica|fique) at[eé] o final/i, msg: '"Assista até o final" pede atenção sem dar motivo.' },
  { re: /\bse voc[eê] (quer|n[aã]o|tamb[eé]m)\b/i, msg: '"Se você..." é uma abertura muito comum. Tente começar pela situação.' },
  { re: /acredit[ea] em voc[eê]|voc[eê] [eé] capaz|nunca desista|gratid[aã]o|foco no|seja a sua melhor vers[aã]o/i, msg: 'Frase motivacional genérica.' },
  { re: /\b(aprenda|vou te ensinar|guia definitivo)\b/i, msg: 'Tom de aula. Funciona melhor mostrando o que você faz ("a rotina que segurou meu loiro").' },
  { re: /\b(dicas? para criadores|como crescer no|algoritmo)\b/i, msg: 'Conteúdo para criadores. Verifique se é mesmo o público desejado.' },
  { re: /\b(incr[ií]vel|revolucion[aá]ri[oa]|perfeit[oa]|melhor do mundo)\b/i, msg: 'Adjetivo vago. Mostre o detalhe concreto que justifica a opinião.' },
];

export function checkHook(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const issues = RULES.filter((r) => r.re.test(t)).map((r) => r.msg);
  const words = t.split(/\s+/).length;
  if (words > 22) issues.push(`Gancho com ${words} palavras. Para a abertura falada, costuma caber em uma frase curta.`);
  if (/[!]{2,}|[?]{2,}/.test(t)) issues.push('Pontuação exagerada (!!, ??).');
  return issues;
}

// Empacotamento da legenda: 1ª linha com o tema (busca do Instagram) e 3 a 5 hashtags de nicho.
const GENERIC_TAGS = /^#(viral|fy|fyp|foryou|foryoupage|explore|explorepage|explorar|meme|memes|reels|reelsinstagram|instagood|trend|trending|tbt|love|insta)$/i;
const STOP = new Set(['para', 'como', 'que', 'com', 'sem', 'uma', 'meu', 'minha', 'isso', 'essa', 'esse', 'você', 'depois', 'antes', 'mais', 'muito', 'quando', 'porque', 'eu', 'não']);
const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z]{4,}/g) || [];

export function checkCaption({ caption = '', theme = '', title = '' } = {}) {
  const t = String(caption || '').trim();
  if (!t || /#publi(cidade)?\b/i.test(t)) return []; // publi: a legenda vem do briefing
  const issues = [];
  const tags = t.match(/#[\p{L}\d_]+/gu) || [];
  const generic = tags.filter((x) => GENERIC_TAGS.test(x));
  if (generic.length) issues.push(`${generic.join(' ')} não diz ao Instagram do que é o vídeo. Troque por hashtags do tema (ex.: #cabeloloiro #treinofeminino).`);
  if (tags.length > 5) issues.push(`${tags.length} hashtags. Use de 3 a 5, de nicho.`);
  const topic = new Set([...words(theme), ...words(title)].filter((w) => !STOP.has(w)));
  const first = t.split('\n')[0];
  if (topic.size && !words(first).some((w) => topic.has(w))) issues.push('A 1ª linha não fala do tema. Comece pela palavra-chave para ser achada na busca.');
  return issues;
}
