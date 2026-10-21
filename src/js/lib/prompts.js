// Prompts para usar no Claude.ai (ou outro assistente). O site não guarda chave de IA:
// você copia o prompt, cola no chat e cola a resposta de volta, que vira ideias/roteiros.

const LABELS = {
  goal: { alcance: 'Alcance', conexao: 'Conexão', comunidade: 'Crescimento da comunidade', marcas: 'Atração de marcas', vendas: 'Vendas' },
  audience: { marcas: 'Marcas', consumidores: 'Consumidores finais', criadores: 'Outros criadores', comunidade: 'Minha comunidade' },
};
const lbl = (g, v) => (v && LABELS[g]?.[v]) || v || '';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const bullet = (s) => lines(s).map((x) => `- ${x}`).join('\n');

export function systemPrompt(profile) {
  return `Você é parceira de criação de uma criadora de conteúdo brasileira (Instagram e TikTok). Escreva sempre em português do Brasil.

## Quem ela é (informado por ela)
${profile.summary || ''}
${profile.name ? `Nome: ${profile.name}` : ''}
${profile.experience ? `Experiência: ${profile.experience}` : ''}

Objetivos:
${bullet(profile.goals)}

Nichos de portfólio:
${bullet(profile.portfolioNiches)}

Temas que quer explorar:
${bullet(profile.exploreNiches)}

Pilares editoriais:
${bullet(profile.pillars)}

## Estilo
${profile.style || ''}

## Evitar
${bullet(profile.avoid)}

## Regras de trabalho
- Não invente números, resultados, experiências, depoimentos, tendências, preços, campanhas atuais ou benefícios de produtos. Quando algo depender de informação que você não tem, diga o que precisa ser confirmado.
- Ela prefere mostrar o que está fazendo, testando e descobrindo, em vez de ensinar. Não transforme tudo em dica para criadores.
- Ganchos devem soar como fala real dela: específicos, concretos, sem "Você sabia", "Ninguém fala sobre", "Pare de...", "Oi gente", "Assista até o final" ou promessa vaga.
- Escreva como gente fala. Nada de jargão de marketing, emojis em excesso ou frases de efeito vazias.
- Não concorde automaticamente. Se a premissa ou o pedido for fraco, diga por que com argumentos concretos e proponha um caminho melhor.
- Considere alcance, mas pese também seguidores alinhados, comunidade e oportunidades comerciais.`;
}

function referencesBlock(refs) {
  if (!refs?.length) return '';
  return `\n## Referências que ela salvou (estude o princípio, NÃO copie o conteúdo)
${refs.map((r, i) => `${i + 1}. ${r.title || r.url || 'Referência'}
   - Gancho usado: ${r.hook || '—'}
   - O que chamou atenção: ${r.attention || '—'}
   - Estrutura a estudar: ${r.structure || '—'}
   - Como ela quer adaptar: ${r.adaptation || '—'}`).join('\n')}`;
}

function brandBlock(brand) {
  if (!brand) return '';
  const group = (cat, status) =>
    (brand.insights || []).filter((i) => i.category === cat && (!status || i.status === status))
      .map((i) => `- ${i.text}${i.source ? ` (fonte: ${i.source})` : ''}`).join('\n') || '- (nada registrado)';
  const hyp = (brand.insights || []).filter((i) => i.status !== 'confirmado').map((i) => `- [${i.category}] ${i.text}`).join('\n') || '- (nenhuma)';
  return `\n## Pesquisa da marca: ${brand.name || 'sem nome'}
Produto: ${brand.product || '—'}
Público (resumo): ${brand.audience || '—'}
Objetivo comercial: ${brand.commercialGoal || '—'}

FATOS CONFIRMADOS
Diferenciais e características confirmadas:
${group('diferencial', 'confirmado')}
Dores confirmadas:
${group('dor', 'confirmado')}
Objeções confirmadas:
${group('objecao', 'confirmado')}
Público confirmado:
${group('publico', 'confirmado')}
Concorrentes:
${group('concorrente')}
Campanhas observadas por ela:
${group('campanha')}

HIPÓTESES (ainda não verificadas — não trate como fato)
${hyp}

Anotações: ${brand.notes || '—'}`;
}

// ---------- Formato de resposta ----------
// Gera um exemplo de JSON a partir do esquema, para o assistente responder num formato que o site lê.
function example(schema) {
  if (schema.type === 'array') return [example(schema.items)];
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, v.desc ? v.desc : example(v)]));
  return schema.desc || '...';
}

function answerFormat(schema) {
  return `\n\n## Formato da resposta (importante)
Responda APENAS com um bloco JSON válido, sem texto antes ou depois, exatamente com estas chaves (os textos de exemplo explicam o conteúdo de cada campo):

\`\`\`json
${JSON.stringify(example(schema), null, 2)}
\`\`\``;
}

const s = (desc) => ({ type: 'string', desc });
const list = (desc) => ({ type: 'array', items: s(desc) });
const obj = (properties) => ({ type: 'object', properties });

export const IDEAS_SCHEMA = obj({
  critique: s('avaliação honesta do briefing e da premissa dela (vazio se nada relevante)'),
  ideas: {
    type: 'array',
    items: obj({
      title: s('título'),
      concept: s('conceito'),
      hook: s('gancho falado/escrito nos primeiros segundos'),
      development: s('desenvolvimento'),
      strategicGoal: s('objetivo estratégico'),
      rationale: s('por que funciona para o objetivo, sem estatística inventada'),
      cta: s('chamada para ação'),
      visuals: s('sugestões visuais (pode ser vazio)'),
      platform: s('Instagram ou TikTok'),
      format: s('Reels, carrossel, Stories, foto...'),
      approach: s('storytelling, opinião, review, demonstrativo, bastidores, humor, tendência ou educativo'),
      audience: s('marcas, consumidores, criadores ou comunidade'),
      needsVerification: list('o que confirmar antes de gravar'),
    }),
  },
});

export const SCRIPT_SCHEMA = obj({
  title: s('título'),
  summary: s('resumo em uma frase'),
  hook: s('gancho'),
  openingVariations: list('abertura alternativa'),
  scenes: { type: 'array', items: obj({ timing: s('0–3s'), setting: s('cenário/enquadramento'), action: s('ação'), speech: s('fala'), onScreenText: s('texto na tela'), editing: s('sugestão de edição') }) },
  slides: { type: 'array', items: obj({ headline: s('título do slide'), body: s('texto'), visual: s('visual') }) },
  screens: { type: 'array', items: obj({ content: s('conteúdo da tela'), visual: s('visual'), interactive: s('enquete, caixa de perguntas... ou vazio') }) },
  caption: s('legenda'),
  cta: s('CTA'),
  editingNotes: s('notas de edição'),
  warnings: list('ponto fraco que ela deveria repensar'),
  claimsToVerify: list('afirmação que precisa de confirmação'),
});

export const BRAND_SCHEMA = obj({
  critique: s('limites da pesquisa atual'),
  missingInfo: list('o que falta pesquisar'),
  concepts: {
    type: 'array',
    items: obj({
      title: s('título'),
      angle: s('ângulo'),
      format: s('formato'),
      hook: s('gancho'),
      concept: s('conceito'),
      audience: s('público'),
      cta: s('CTA'),
      basedOnFacts: list('item de FATOS CONFIRMADOS usado'),
      hypothesesToVerify: list('suposição ainda não verificada'),
    }),
  },
});

const wrap = (profile, user, schema) => `${systemPrompt(profile)}\n\n---\n\n${user}${answerFormat(schema)}`;

export function ideasPrompt({ briefing = {}, profile, references, brand, existingTitles = [] }) {
  const b = briefing;
  const qty = Math.min(Math.max(Number(b.quantity) || 4, 1), 8);
  const user = `Gere ${qty} ideias de conteúdo.

## Briefing
- Objetivo: ${lbl('goal', b.goal) || 'livre'}
- Nicho: ${b.niche || 'livre'}
- Assunto: ${b.subject || 'livre'}
- Plataforma: ${b.platform || 'livre'}
- Formato: ${b.format || 'livre (sugira o mais adequado para cada ideia)'}
- Público prioritário: ${lbl('audience', b.audience) || 'livre'}
- Abordagem: ${b.approach || 'variada'}
${b.premise ? `\n## Premissa/ideia dela (avalie com honestidade antes)\n${b.premise}` : ''}
${b.extra ? `\n## Observações\n${b.extra}` : ''}
${referencesBlock(references)}
${brandBlock(brand)}
${existingTitles.length ? `\n## Ideias que ela já tem (não repita, nem com outra roupagem)\n${existingTitles.slice(0, 40).map((t) => `- ${t}`).join('\n')}` : ''}

## Como responder
- As ideias precisam ter ângulos, formatos ou abordagens realmente diferentes entre si. Não troque só o tema mantendo a mesma estrutura.
- Se um campo do briefing estiver fixo (ex.: formato), varie o ângulo, a situação e a estrutura narrativa.
- Em "critique": avalie a premissa dela (se houver) e o próprio briefing. Aponte fraquezas concretas.
- Em "rationale": explique por que a ideia serve ao objetivo, sem citar estatísticas inventadas.`;
  return wrap(profile, user, IDEAS_SCHEMA);
}

export function scriptPrompt({ request = {}, profile, idea, references, brand }) {
  const r = request;
  const kind = r.type || 'video';
  const typeRules = {
    video: 'Roteiro de VÍDEO. Preencha "scenes" (tempo, cenário, ação, fala, texto na tela, edição) e 3 "openingVariations" realmente diferentes. Deixe "slides" e "screens" como listas vazias.',
    carrossel: 'CARROSSEL. Preencha "slides" (um item por slide; o primeiro é o gancho). Deixe "scenes" e "screens" vazios. "openingVariations" = 3 alternativas para o slide 1.',
    stories: 'Sequência de STORIES. Preencha "screens" na ordem, com recurso interativo só quando fizer sentido. Deixe "scenes" e "slides" vazios. "openingVariations" = 3 alternativas para a primeira tela.',
    foto: 'POST DE FOTO. Use "scenes" com 1 a 3 itens descrevendo a foto. Capriche na legenda. "openingVariations" = 3 alternativas de primeira linha da legenda.',
  }[kind];
  const ugc = r.ugc && Object.values(r.ugc).some(Boolean)
    ? `\n## Briefing UGC
- Produto: ${r.ugc.product || '—'}
- Público: ${r.ugc.audience || '—'}
- Dores: ${r.ugc.pains || '—'}
- Objeções: ${r.ugc.objections || '—'}
- Características CONFIRMADAS (use só estas como afirmação): ${r.ugc.features || '—'}
- Objetivo comercial: ${r.ugc.goal || '—'}
Regra: não prometa resultado, não invente benefício nem comparação. Qualquer afirmação além das características confirmadas vai para "claimsToVerify".`
    : '';
  const ideaBlock = idea ? `\n## Ideia base
Título: ${idea.title}
Conceito: ${idea.concept || '—'}
Gancho: ${idea.hook || '—'}
Desenvolvimento: ${idea.development || '—'}
Objetivo estratégico: ${idea.strategicGoal || '—'}
CTA: ${idea.cta || '—'}
Plataforma/formato: ${idea.platform || '—'} / ${idea.format || '—'}` : '';
  const user = `Transforme isto em um conteúdo pronto para produzir.
${ideaBlock}
${r.topic ? `\n## Tema/pedido\n${r.topic}` : ''}
${ugc}
${referencesBlock(references)}
${brandBlock(brand)}

## Parâmetros
- Tipo: ${kind}
- Plataforma: ${r.platform || idea?.platform || 'Instagram'}
- Duração alvo: ${r.duration || 'a que fizer mais sentido'}
- Tom: ${r.tone || 'natural, com personalidade'}
- Nível de detalhe: ${r.detail || 'padrão'} (enxuto = só o essencial; detalhado = falas completas e marcações de edição)
${r.extra ? `- Observações: ${r.extra}` : ''}

## Regras
${typeRules}
- Falas no jeito dela de falar: frases curtas, naturais, com opinião. Nada de "oi gente".
- "warnings": pontos fracos que ela deveria repensar (seja direta).`;
  return wrap(profile, user, SCRIPT_SCHEMA);
}

export function brandPrompt({ brand, profile, quantity = 4 }) {
  const user = `Com base na pesquisa abaixo, proponha ${quantity} oportunidades de conteúdo e conceitos de vídeo UGC para essa marca, que também sirvam para o portfólio dela.
${brandBlock(brand)}

## Como responder
- Cada conceito com ângulo diferente (objeção respondida, demonstração em uso real, bastidor de teste, opinião honesta...), sem repetir estrutura.
- Em "basedOnFacts" cite somente itens de FATOS CONFIRMADOS.
- Em "hypothesesToVerify" liste tudo que o conceito assume e ainda não foi verificado.
- Não invente anúncios, preços, promoções, números ou benefícios.`;
  return wrap(profile, user, BRAND_SCHEMA);
}

// ---------- Leitura da resposta colada ----------
export function parseAnswer(text, kind) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Cole a resposta do assistente.');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Não encontrei um bloco JSON na resposta. Peça ao assistente: "responda só com o JSON no formato pedido".');
  candidate = candidate.slice(start, end + 1);
  let data;
  try {
    data = JSON.parse(candidate);
  } catch {
    throw new Error('O JSON colado está incompleto ou com erro. Copie a resposta inteira (às vezes ela é cortada) e tente de novo.');
  }
  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const arr = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : v ? [str(v)] : []);
  const objs = (v, keys) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').map((x) => Object.fromEntries(keys.map((k) => [k, str(x[k])]))) : []);
  if (kind === 'ideas') {
    if (!Array.isArray(data.ideas) || !data.ideas.length) throw new Error('A resposta não tem a lista "ideas".');
    return {
      critique: str(data.critique),
      ideas: data.ideas.filter((i) => i && typeof i === 'object').map((i) => ({
        ...Object.fromEntries(['title', 'concept', 'hook', 'development', 'strategicGoal', 'rationale', 'cta', 'visuals', 'platform', 'format', 'approach', 'audience'].map((k) => [k, str(i[k])])),
        needsVerification: arr(i.needsVerification),
      })),
    };
  }
  if (kind === 'script') {
    if (!data.hook && !data.scenes && !data.slides && !data.screens) throw new Error('A resposta não parece um roteiro (faltam gancho e cenas/slides/telas).');
    return {
      ...Object.fromEntries(['title', 'summary', 'hook', 'caption', 'cta', 'editingNotes'].map((k) => [k, str(data[k])])),
      openingVariations: arr(data.openingVariations),
      warnings: arr(data.warnings),
      claimsToVerify: arr(data.claimsToVerify),
      scenes: objs(data.scenes, ['timing', 'setting', 'action', 'speech', 'onScreenText', 'editing']),
      slides: objs(data.slides, ['headline', 'body', 'visual']),
      screens: objs(data.screens, ['content', 'visual', 'interactive']),
    };
  }
  if (kind === 'brand') {
    if (!Array.isArray(data.concepts) || !data.concepts.length) throw new Error('A resposta não tem a lista "concepts".');
    return {
      critique: str(data.critique),
      missingInfo: arr(data.missingInfo),
      concepts: data.concepts.filter((c) => c && typeof c === 'object').map((c) => ({
        ...Object.fromEntries(['title', 'angle', 'format', 'hook', 'concept', 'audience', 'cta'].map((k) => [k, str(c[k])])),
        basedOnFacts: arr(c.basedOnFacts),
        hypothesesToVerify: arr(c.hypothesesToVerify),
      })),
    };
  }
  throw new Error('Tipo de resposta desconhecido.');
}
