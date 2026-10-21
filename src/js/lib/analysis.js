// Análise de desempenho. Funções puras (sem DOM) para poderem ser testadas.
// Princípios: campo vazio = "não informado" (diferente de zero); taxas só com os dados
// necessários; nada de conclusão forte com poucas publicações.

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export function metric(post, key) {
  return num(post?.metrics?.[key]);
}

export function hasMetrics(post) {
  const m = post?.metrics;
  if (!m) return false;
  return ['reach', 'views', 'likes', 'comments', 'saves', 'shares', 'profileVisits', 'follows', 'linkClicks', 'messages', 'commercialContacts']
    .some((k) => num(m[k]) !== null);
}

// Base de cálculo das taxas: alcance; se não houver, visualizações (comum no TikTok).
export function base(post) {
  const reach = metric(post, 'reach');
  if (reach) return { value: reach, kind: 'alcance' };
  const views = metric(post, 'views');
  if (views) return { value: views, kind: 'visualizações' };
  return { value: null, kind: null };
}

const ratio = (a, b, mult = 1) => (a === null || !b ? null : (a / b) * mult);

export const INDICATORS = {
  base: { label: 'Alcance (ou visualizações)', fmt: 'num', compute: (p) => base(p).value },
  engagement: {
    label: 'Interações por alcance',
    hint: '(curtidas + comentários + salvamentos + compartilhamentos) ÷ alcance',
    fmt: 'pct',
    compute: (p) => {
      const parts = ['likes', 'comments', 'saves', 'shares'].map((k) => metric(p, k));
      if (parts.some((x) => x === null)) return null;
      return ratio(parts.reduce((a, b) => a + b, 0), base(p).value);
    },
  },
  comments: { label: 'Comentários por alcance', fmt: 'pct', compute: (p) => ratio(metric(p, 'comments'), base(p).value) },
  saves: { label: 'Salvamentos por alcance', fmt: 'pct', compute: (p) => ratio(metric(p, 'saves'), base(p).value) },
  shares: { label: 'Compartilhamentos por alcance', fmt: 'pct', compute: (p) => ratio(metric(p, 'shares'), base(p).value) },
  follows: { label: 'Seguidores a cada mil alcançados', fmt: 'per1k', compute: (p) => ratio(metric(p, 'follows'), base(p).value, 1000) },
  profileConversion: {
    label: 'Visitas ao perfil que viraram seguidores',
    fmt: 'pct',
    compute: (p) => ratio(metric(p, 'follows'), metric(p, 'profileVisits')),
  },
  commercial: {
    label: 'Mensagens + contatos comerciais',
    fmt: 'num',
    compute: (p) => {
      const m = metric(p, 'messages');
      const c = metric(p, 'commercialContacts');
      return m === null && c === null ? null : (m ?? 0) + (c ?? 0);
    },
  },
  clicks: { label: 'Cliques a cada mil alcançados', fmt: 'per1k', compute: (p) => ratio(metric(p, 'linkClicks'), base(p).value, 1000) },
};

// O que observar para cada objetivo. A primeira métrica é a principal.
export const GOAL_INDICATORS = {
  alcance: { main: 'base', also: ['shares'], why: 'Alcance mostra distribuição; compartilhamentos mostram se ela veio de pessoas indicando o conteúdo.' },
  conexao: { main: 'comments', also: ['saves', 'engagement'], why: 'Comentários e salvamentos indicam identificação mais do que curtidas.' },
  comunidade: { main: 'follows', also: ['profileConversion'], why: 'Seguidores por alcance mostram se o conteúdo atrai gente que quer acompanhar você.' },
  marcas: { main: 'commercial', also: ['profileConversion'], why: 'O que importa é contato de marca e visita qualificada ao perfil, não views.' },
  vendas: { main: 'clicks', also: ['commercial'], why: 'Cliques e mensagens são sinais de intenção de compra.' },
};

export function formatValue(v, fmt) {
  if (v === null || v === undefined) return '—';
  if (fmt === 'pct') return `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  if (fmt === 'per1k') return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return Math.round(v).toLocaleString('pt-BR');
}

export function median(values) {
  const v = values.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function confidence(n) {
  if (n < 3) return { level: 0, label: 'Dados insuficientes' };
  if (n < 6) return { level: 1, label: 'Sinal fraco' };
  if (n < 15) return { level: 2, label: 'Indício' };
  return { level: 3, label: 'Padrão consistente' };
}

// Agrupa publicações por uma dimensão (formato, abordagem...) e calcula a mediana do indicador.
export function compareBy(posts, dimension, indicatorKey) {
  const ind = INDICATORS[indicatorKey];
  const groups = new Map();
  for (const p of posts) {
    const key = p[dimension] || '(sem definição)';
    const v = ind.compute(p);
    if (v === null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  const all = [...groups.values()].flat();
  const rows = [...groups.entries()]
    .map(([group, vals]) => ({ group, n: vals.length, median: median(vals), confidence: confidence(vals.length) }))
    .sort((a, b) => (b.median ?? -1) - (a.median ?? -1));
  return { rows, overall: { n: all.length, median: median(all) } };
}

// Compara uma publicação com as outras da mesma plataforma, no indicador do objetivo dela.
export function evaluatePost(post, posts) {
  const goal = GOAL_INDICATORS[post.goal];
  if (!goal) return { status: 'no-goal', text: 'Defina o objetivo da publicação para avaliá-la.' };
  const ind = INDICATORS[goal.main];
  const value = ind.compute(post);
  if (value === null) return { status: 'missing', indicator: goal.main, text: `Falta registrar dados para "${ind.label.toLowerCase()}".` };
  const peers = posts.filter((p) => p.id !== post.id && p.platform === post.platform).map(ind.compute).filter((v) => v !== null);
  const conf = confidence(peers.length);
  if (peers.length < 3) {
    return { status: 'few', indicator: goal.main, value, peers: peers.length, text: `Ainda há poucas publicações para comparar (${peers.length}).` };
  }
  const med = median(peers);
  const rel = med ? value / med : null;
  let verdict = 'na média';
  if (rel !== null && rel >= 1.3) verdict = 'acima da sua mediana';
  if (rel !== null && rel <= 0.7) verdict = 'abaixo da sua mediana';
  if (med === 0 && value > 0) verdict = 'acima da sua mediana';
  return {
    status: 'ok',
    indicator: goal.main,
    value,
    median: med,
    peers: peers.length,
    verdict,
    confidence: conf,
    text: `${formatValue(value, ind.fmt)} vs. mediana ${formatValue(med, ind.fmt)} (${peers.length} publicações comparáveis) — ${verdict}.`,
  };
}

// Procura diferenças relevantes entre grupos. Só fala quando há dados mínimos.
export function findPatterns(posts, dimensions, labelFor = (d, v) => v) {
  const out = [];
  const indicators = ['shares', 'saves', 'comments', 'follows', 'commercial'];
  for (const dim of dimensions) {
    for (const key of indicators) {
      const { rows, overall } = compareBy(posts, dim.key, key);
      if (overall.n < 6 || overall.median === null) continue;
      for (const r of rows) {
        if (r.n < 3 || r.group === '(sem definição)') continue;
        const others = posts
          .filter((p) => (p[dim.key] || '(sem definição)') !== r.group)
          .map(INDICATORS[key].compute)
          .filter((v) => v !== null);
        if (others.length < 3) continue;
        const om = median(others);
        if (om === null || r.median === null) continue;
        const rel = om === 0 ? (r.median > 0 ? Infinity : 1) : r.median / om;
        if (rel >= 1.5 || rel <= 0.6) {
          const ind = INDICATORS[key];
          const direction = rel > 1 ? 'acima' : 'abaixo';
          out.push({
            dimension: dim.label,
            group: labelFor(dim.key, r.group),
            indicator: ind.label,
            direction,
            strength: Math.abs(Math.log(rel === Infinity ? 10 : rel || 0.01)),
            confidence: confidence(Math.min(r.n, others.length)),
            text: `${dim.label} "${labelFor(dim.key, r.group)}": ${ind.label.toLowerCase()} com mediana ${formatValue(r.median, ind.fmt)} (n=${r.n}), ${direction} das demais (${formatValue(om, ind.fmt)}, n=${others.length}).`,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.confidence.level - a.confidence.level || b.strength - a.strength).slice(0, 12);
}

// Sugestões de teste: combinações pouco ou nada testadas e lacunas de registro.
export function testOpportunities(posts, { approaches, formats, goals }) {
  const tips = [];
  const measured = posts.filter(hasMetrics);
  const published = posts.filter((p) => p.status === 'publicado');
  const missing = published.filter((p) => !hasMetrics(p));
  if (missing.length) tips.push(`${missing.length} publicação(ões) publicada(s) sem métricas registradas. Sem elas, a análise fica parcial.`);
  const noFollows = measured.filter((p) => metric(p, 'follows') === null).length;
  if (noFollows) tips.push(`${noFollows} publicação(ões) sem "novos seguidores". Esse é o dado que mostra crescimento de comunidade — vale registrar quando a plataforma mostrar.`);
  const noGoal = posts.filter((p) => !p.goal).length;
  if (noGoal) tips.push(`${noGoal} publicação(ões) sem objetivo definido. Sem objetivo, não dá para saber se funcionou.`);

  const count = (key, value) => measured.filter((p) => p[key] === value).length;
  const untriedApproaches = approaches.filter((a) => count('approach', a.value) === 0).map((a) => a.label);
  if (measured.length >= 5 && untriedApproaches.length) {
    tips.push(`Abordagens ainda sem nenhum resultado medido: ${untriedApproaches.join(', ')}. Testar ao menos 3 de cada permite comparar.`);
  }
  const thin = formats.filter((f) => count('format', f.value) > 0 && count('format', f.value) < 3).map((f) => f.label);
  if (thin.length) tips.push(`Formatos com 1–2 publicações medidas (ainda não comparáveis): ${thin.join(', ')}.`);
  for (const g of goals) {
    const n = measured.filter((p) => p.goal === g.value).length;
    if (measured.length >= 5 && n === 0) tips.push(`Nenhuma publicação medida com objetivo "${g.label}".`);
  }
  return tips;
}
