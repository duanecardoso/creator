// Briefings de treino: um "job" de UGC simulado, com prazos de verdade, para manter o perfil ativo
// e o portfólio atualizado quando não há marca. Nunca é parceria: fica marcado como treino.
// Funções puras (sem DOM), testadas em tests/unit/briefs.test.js.
import { addDays } from './insights.js';

// Nichos do portfólio (duanecardoso/ugc).
export const NICHES = [
  { id: 'haircare', label: 'Haircare', area: 'Beleza', emoji: '💇‍♀️' },
  { id: 'skincare', label: 'Skincare', area: 'Beleza', emoji: '🧴' },
  { id: 'bodycare', label: 'Bodycare', area: 'Beleza', emoji: '🫧' },
  { id: 'moda', label: 'Moda e acessórios', area: 'Moda', emoji: '👜' },
  { id: 'fitness', label: 'Fitness', area: 'Fitness', emoji: '🏋️‍♀️' },
  { id: 'tech', label: 'Tech e apps', area: 'Tech', emoji: '📱' },
];
export const nicheLabel = (id) => NICHES.find((n) => n.id === id)?.label || 'Outro';

// Tipos de produto por nicho, para briefings de produto inventado.
const PRODUCTS = {
  haircare: ['óleo finalizador para pontas', 'máscara de hidratação', 'leave-in com proteção térmica', 'shampoo e condicionador', 'spray texturizador', 'creme de pentear'],
  skincare: ['protetor solar com cor', 'sérum facial', 'hidratante facial em gel', 'esfoliante facial', 'água micelar', 'hidratante labial'],
  bodycare: ['óleo corporal', 'desodorante', 'body splash', 'hidratante corporal', 'esfoliante corporal', 'sabonete líquido'],
  moda: ['bolsa transversal', 'bolsa de ombro', 'kit de brincos e colares', 'óculos de sol', 'relógio', 'presilhas e scrunchies'],
  fitness: ['macaquinho fitness', 'conjunto top e legging', 'garrafa térmica', 'tapete de yoga', 'elásticos de resistência', 'tênis de treino'],
  tech: ['aplicativo de organização ou finanças', 'bastão de LED', 'pistola de massagem', 'fone sem fio', 'tripé com controle', 'carregador portátil'],
};

const AUDIENCE = {
  haircare: 'Mulheres de 20 a 35 anos que querem um cabelo bonito sem rotina longa.',
  skincare: 'Mulheres de 20 a 35 anos começando ou simplificando a rotina de skincare.',
  bodycare: 'Mulheres de 20 a 35 anos que gostam de autocuidado no dia a dia.',
  moda: 'Mulheres de 20 a 35 anos que querem peças práticas para usar no dia a dia.',
  fitness: 'Mulheres que treinam (ou querem voltar a treinar) e querem conforto.',
  tech: 'Pessoas de 20 a 40 anos que querem praticidade na rotina.',
};

const NICHE_DOS = {
  haircare: 'Mostre o cabelo antes e depois de aplicar, na mesma luz.',
  skincare: 'Mostre a textura na mão e na pele, bem de perto.',
  bodycare: 'Mostre a textura e o momento de uso (pós-banho, antes de sair).',
  moda: 'Mostre a peça no corpo e em movimento, com um look completo.',
  fitness: 'Mostre a peça em movimento: agachamento, alongamento, caminhada.',
  tech: 'Mostre a tela ou o produto funcionando, sem cortes que escondam o uso.',
};
const NICHE_DONTS = {
  haircare: 'Não prometa resultado de tratamento (queda, crescimento, reconstrução).',
  skincare: 'Não prometa resultado clínico (manchas, acne, rugas) nem fale de FPS sem conferir na embalagem.',
  bodycare: 'Não fale de duração (48h, 72h) sem conferir na embalagem.',
  moda: 'Não esconda defeitos reais da peça; se algo te incomodou, diga.',
  fitness: 'Não fale de emagrecimento ou resultado físico.',
  tech: 'Não fale de especificações (bateria, potência) sem conferir.',
};

// Ângulos clássicos de UGC (o "tipo de vídeo" que a marca pede).
export const ANGLES = [
  { id: 'unboxing', label: 'Unboxing e primeira impressão', objective: 'Gerar curiosidade e mostrar o produto chegando, com a reação real do primeiro uso.',
    script: ['Gancho: o produto na mão / a caixa abrindo', 'O que é e para quem é, em 1 frase', 'Primeiro uso na câmera: textura, cheiro, encaixe', 'Primeira impressão sincera (o que surpreendeu)', 'Chamada: "vou contar depois de uma semana"'],
    hooks: ['chegou e eu já vou abrir aqui', 'primeira impressão sincera de {p}', 'abrindo o {p} que todo mundo me perguntou'] },
  { id: 'problema', label: 'Problema → solução', objective: 'Mostrar uma dor do dia a dia e como o produto entra na rotina para resolver.',
    script: ['Gancho: a dor, com uma cena real', 'Por que isso incomoda (situação específica)', 'O produto entrando na cena', 'Uso na prática, mostrando o detalhe', 'Como ficou e para quem você indicaria'],
    hooks: ['se você também sofre com isso, assiste até o final', 'eu tinha esse problema todo santo dia', 'o que mudou minha rotina de {n}'] },
  { id: 'rotina', label: 'Rotina com o produto', objective: 'Mostrar o produto inserido de forma natural numa rotina real (manhã, treino, pós-banho).',
    script: ['Gancho: o começo da rotina', '2 ou 3 passos da rotina, rápidos', 'O momento do produto, mais lento e de perto', 'Resultado no fim da rotina', 'Frase final pessoal'],
    hooks: ['minha rotina de {n} em 30 segundos', 'arruma comigo usando só o essencial', 'o passo que eu não pulo mais'] },
  { id: 'depoimento', label: 'Depoimento (talking head)', objective: 'Passar confiança: você falando para a câmera, como se contasse para uma amiga.',
    script: ['Gancho falando direto para a câmera', 'Contexto: por que você foi atrás desse produto', '3 pontos que você notou usando', 'Um ponto de atenção (sinceridade)', 'Para quem vale a pena'],
    hooks: ['vou ser sincera sobre {p}', 'três coisas que ninguém te conta sobre {p}', 'vale a pena? minha opinião depois de usar'] },
  { id: 'tutorial', label: 'Tutorial de uso', objective: 'Ensinar a usar do jeito certo, com passo a passo claro.',
    script: ['Gancho: o erro mais comum ao usar', 'Passo 1 (de perto)', 'Passo 2', 'Passo 3 + dica sua', 'Resultado final'],
    hooks: ['você está usando {p} errado', 'o jeito certo de usar {p}', 'passo a passo que ninguém me ensinou'] },
  { id: 'motivos', label: '3 motivos', objective: 'Listar motivos concretos para escolher o produto, com uma cena para cada.',
    script: ['Gancho: "3 motivos pra…"', 'Motivo 1 com cena', 'Motivo 2 com cena', 'Motivo 3 com cena', 'Fechamento com o produto em destaque'],
    hooks: ['3 motivos pra eu não largar {p}', 'por que eu escolheria {p} de novo', 'se eu tivesse que indicar um só'] },
  { id: 'asmr', label: 'Estético / ASMR', objective: 'Vídeo visual, com sons do produto e takes bonitos, pouca fala.',
    script: ['Take de abertura bonito (luz natural)', 'Detalhes: textura, som, embalagem', 'Uso em takes curtos', 'Produto no cenário final', 'Texto na tela com 1 frase'],
    hooks: ['só o som disso já me acalma', 'take por take do meu momento {n}', 'POV: seu momento favorito do dia'] },
];

export const PACES = {
  curto: { label: 'Curto (4 dias)', days: [1, 2, 3, 3, 4] },
  normal: { label: 'Normal (1 semana)', days: [1, 3, 5, 6, 7] },
  folgado: { label: 'Folgado (2 semanas)', days: [2, 5, 9, 11, 13] },
};

// Etapas de um briefing de treino.
export const TRAINING_PIPELINE = [
  ['briefing', 'Briefing'], ['roteiro', 'Roteiro'], ['gravacao', 'Gravação'], ['edicao', 'Edição'],
  ['postado', 'Postado'], ['portfolio', 'No portfólio'], ['concluido', 'Concluído'],
];

// "Marca | produto | nicho", um por linha. O nicho é opcional (o site tenta adivinhar).
const GUESS = [
  ['haircare', /cabel|shampoo|condicion|m[aá]scara cap|leave|finaliz|capilar|creme de pentear|fios|pontas/i],
  ['skincare', /facial|rosto|s[eé]rum|protetor|fps|micelar|labial|skin|olheira|t[oô]nico/i],
  ['bodycare', /corpo|corporal|desodorante|body|sabonete|banho|perfume|col[oô]nia/i],
  ['moda', /bolsa|brinco|colar|[oó]culos|rel[oó]gio|acess[oó]rio|roupa|vestido|cal[cç]a|sapato|t[eê]nis casual/i],
  ['fitness', /fitness|treino|legging|top |macaqu|academia|yoga|garrafa|whey|creatina/i],
  ['tech', /app|aplicativo|led|fone|carregador|celular|trip[eé]|massagem|gadget|tech/i],
];
export const guessNiche = (text) => GUESS.find(([, re]) => re.test(text || ''))?.[0] || '';

export function parseProducts(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [brand = '', product = '', niche = ''] = l.split('|').map((x) => x.trim());
    const n = NICHES.find((x) => x.id === niche.toLowerCase() || x.label.toLowerCase() === niche.toLowerCase())?.id;
    return { brand, product, niche: n || guessNiche(`${product} ${brand}`), line: l };
  }).filter((p) => p.brand || p.product);
}

export const briefKey = (b) => `${(b.brand || '').toLowerCase()}|${(b.product || '').toLowerCase()}`;

// Pequeno gerador previsível (mesma semente → mesmo briefing), para testes e para "outra sugestão".
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (list, r) => list[Math.floor(r() * list.length)];

// O nicho com menos briefings (e há mais tempo sem treino) vem primeiro.
export function nextNiche(trainings = []) {
  const stats = NICHES.map((n, i) => {
    const mine = trainings.filter((t) => t.niche === n.id && t.status !== 'cancelado');
    const last = mine.map((t) => t.start || t.createdAt || '').sort().pop() || '';
    return { id: n.id, count: mine.length, last, i };
  });
  stats.sort((a, b) => a.count - b.count || a.last.localeCompare(b.last) || a.i - b.i);
  return stats[0].id;
}

export function coverage(trainings = []) {
  return NICHES.map((n) => {
    const mine = trainings.filter((t) => t.niche === n.id && t.status !== 'cancelado');
    return { ...n, total: mine.length, done: mine.filter((t) => ['postado', 'portfolio', 'concluido'].includes(t.status)).length, last: mine.map((t) => t.start || '').sort().pop() || '' };
  });
}

// Prazos do briefing a partir do dia de início.
export function timeline(start, pace = 'normal') {
  const d = (PACES[pace] || PACES.normal).days;
  return {
    scriptDue: addDays(start, d[0]),
    deliverables: [
      { text: 'Roteiro + 3 ganchos alternativos', due: addDays(start, d[0]), done: false },
      { text: 'Gravação: vídeo + 5 fotos do produto (luz natural)', due: addDays(start, d[1]), done: false },
      { text: 'Edição: versão final 9:16 e versão sem legenda', due: addDays(start, d[2]), done: false },
      { text: 'Postar no perfil (Instagram e TikTok)', due: addDays(start, d[3]), done: false },
      { text: 'Subir no portfólio', due: addDays(start, d[4]), done: false },
    ],
    postDate: addDays(start, d[3]),
  };
}

const COMMON_DOS = ['Luz natural e fundo limpo.', 'Primeiros 3 segundos com o produto ou a dor aparecendo.', 'Fale só do que você sentiu usando de verdade.'];
const COMMON_DONTS = ['Não use #publi nem marque a marca como parceira: é um conteúdo autoral de treino.', 'Não invente resultado, número ou benefício.'];

/**
 * Gera um briefing completo.
 * source: 'tenho' (um produto da sua lista), 'inventado' (produto fictício do nicho) ou 'qualquer'.
 * exclude: chaves (marca|produto) e ângulos já recusados ("outra sugestão").
 */
export function generateBrief({ niche, source = 'qualquer', products = [], exclude = [], start, pace = 'normal', seed = '' } = {}) {
  const r = rng(`${seed}|${niche}|${source}|${exclude.join(',')}`);
  const nicheId = NICHES.some((n) => n.id === niche) ? niche : NICHES[0].id;
  const skip = new Set(exclude);
  const owned = products.filter((p) => p.niche === nicheId && !skip.has(briefKey(p)));
  const useOwned = source === 'tenho' || (source === 'qualquer' && owned.length && r() < 0.6);
  let brand;
  let product;
  let fictional;
  let note = '';
  if (useOwned && owned.length) {
    const p = pick(owned, r);
    brand = p.brand || 'Produto que você tem';
    product = p.product || `um produto de ${nicheLabel(nicheId).toLowerCase()} da ${p.brand}`;
    fictional = false;
  } else {
    const kinds = PRODUCTS[nicheId].filter((k) => !skip.has(briefKey({ brand: 'Marca fictícia', product: k })));
    product = pick(kinds.length ? kinds : PRODUCTS[nicheId], r);
    brand = 'Marca fictícia';
    fictional = true;
    if (source === 'tenho') note = 'Você não tem produtos desse nicho na sua lista, então veio um produto inventado.';
  }
  const angles = ANGLES.filter((a) => !skip.has(`angulo:${a.id}`));
  const angle = pick(angles.length ? angles : ANGLES, r);
  const fill = (s) => s.replace(/\{p\}/g, product).replace(/\{n\}/g, nicheLabel(nicheId).toLowerCase());
  const t = timeline(start, pace);
  return {
    niche: nicheId,
    brand,
    product,
    fictional,
    note,
    angle: angle.id,
    angleLabel: angle.label,
    objective: angle.objective,
    audience: AUDIENCE[nicheId],
    keyMessages: fictional
      ? ['Praticidade: cabe na rotina real.', 'Como é a textura / o uso na prática.', 'Para quem esse produto faz sentido.']
      : ['O que você notou usando (textura, cheiro, conforto, praticidade).', 'Em que momento da rotina ele entra.', 'Para quem você indicaria. Confira na embalagem antes de citar qualquer benefício.'],
    dos: [...COMMON_DOS, NICHE_DOS[nicheId], ...(fictional ? ['Use um produto parecido que você tenha e esconda o rótulo, ou mostre sem marca.'] : [])],
    donts: [...COMMON_DONTS, NICHE_DONTS[nicheId]],
    format: '1 vídeo vertical 9:16 de 30 a 45 segundos, com legenda na tela.',
    hooks: angle.hooks.map(fill),
    script: angle.script,
    usage: 'Seu perfil (Instagram e TikTok) e seu portfólio UGC. Conteúdo autoral, sem pagamento e sem parceria.',
    start,
    pace,
    ...t,
    source: 'local',
  };
}

// Junta a resposta do Claude com os prazos calculados aqui (as datas nunca vêm do Claude).
export function briefFromAi(ai, { niche, start, pace = 'normal' }) {
  const base = generateBrief({ niche, start, pace, seed: 'ai' });
  const list = (v, fb) => (Array.isArray(v) && v.length ? v.map((x) => String(x).trim()).filter(Boolean) : fb);
  const s = (v, fb) => (typeof v === 'string' && v.trim() ? v.trim() : fb);
  return {
    ...base,
    brand: s(ai.brand, base.brand),
    product: s(ai.product, base.product),
    fictional: ai.fictional === undefined ? base.fictional : Boolean(ai.fictional),
    angle: 'claude',
    angleLabel: s(ai.angle, 'Sugestão do Claude'),
    objective: s(ai.objective, base.objective),
    audience: s(ai.audience, base.audience),
    keyMessages: list(ai.keyMessages, base.keyMessages),
    dos: list(ai.dos, base.dos),
    donts: [...new Set([...COMMON_DONTS, ...list(ai.donts, base.donts)])],
    format: s(ai.format, base.format),
    hooks: list(ai.hooks, base.hooks),
    script: list(ai.script, base.script),
    caption: s(ai.caption, ''),
    note: '',
    source: 'claude',
  };
}

// Texto do briefing para copiar (WhatsApp, Notas, e-mail).
export function briefText(b) {
  const lines = (title, items) => (items?.length ? `\n${title}\n${items.map((x) => `• ${x}`).join('\n')}` : '');
  const dates = (b.deliverables || []).map((d) => `${d.due ? d.due.split('-').reverse().slice(0, 2).join('/') : '—'} · ${d.text}`);
  return `BRIEFING DE TREINO (simulado, não é parceria)
${b.brand}${b.fictional ? ' (marca fictícia)' : ''} · ${b.product}
Nicho: ${nicheLabel(b.niche)} · Tipo de vídeo: ${b.angleLabel}

Objetivo: ${b.objective}
Público: ${b.audience}
Formato: ${b.format}${lines('Mensagens-chave', b.keyMessages)}${lines('Faça', b.dos)}${lines('Evite', b.donts)}${lines('Ganchos', b.hooks)}${lines('Roteiro', b.script)}${b.caption ? `\n\nLegenda: ${b.caption}` : ''}${lines('Prazos', dates)}

Uso: ${b.usage}`;
}
