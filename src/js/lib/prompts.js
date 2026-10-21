// Prompts para o Claude (copiar → colar no claude.ai → colar a resposta de volta).
import { FORMATS } from './formats.js';

function profileBlock(p) {
  return `Sou criadora de conteúdo brasileira (Instagram e TikTok).
Sobre mim: ${p.about || '—'}
Nichos: ${p.niches || '—'}
Meu jeito: ${p.style || '—'}
Evitar: ${p.avoid || '—'}

Regras: escreva em português do Brasil, como eu falaria. Não invente números, tendências, preços ou benefícios de produto; se algo precisar ser confirmado, diga. Se minha ideia for fraca, diga por quê e sugira algo melhor.`;
}

const formatBlock = (f) => `Formato: ${f.name}
Por que funciona: ${f.why}
Estrutura: ${f.structure.map((s, i) => `${i + 1}) ${s}`).join(' ')}
Ganchos-modelo: ${f.hooks.join(' | ')}`;

// Um conteúdo pronto para gravar a partir de um formato.
export function contentPrompt({ profile, format, topic, platform, hits = [] }) {
  return `${profileBlock(profile)}

Quero um conteúdo pronto para gravar hoje.
${format ? formatBlock(format) : ''}
Tema: ${topic || '(sugira um tema do meu nicho que combine com o formato)'}
Plataforma: ${platform || 'Instagram e TikTok'}
${hits.length ? `Conteúdos meus que funcionaram (use como referência de tom): ${hits.slice(0, 5).join('; ')}` : ''}

Responda SOMENTE com este JSON:
{"title": "título curto", "hook": "a frase dos primeiros 2 segundos", "hooks": ["2 ganchos alternativos"], "steps": ["cena/passo 1 com a fala", "passo 2", "..."], "caption": "legenda curta", "cta": "chamada final", "check": ["o que eu preciso confirmar antes de postar, se houver"], "critique": "1 frase honesta sobre o ponto fraco da ideia, se houver"}`;
}

// Várias ideias variando formatos.
export function ideasPrompt({ profile, topic, goal, count = 5, hits = [] }) {
  const list = FORMATS.map((f) => `${f.id}: ${f.name}`).join('\n');
  return `${profileBlock(profile)}

Me dê ${count} ideias de conteúdo ${goal ? `com foco em ${goal}` : 'variando entre ganhar seguidores, comunidade e atrair marcas'}${topic ? ` sobre: ${topic}` : ''}.
Use formatos DIFERENTES entre si, escolhidos desta lista (use o id):
${list}
${hits.length ? `\nConteúdos meus que funcionaram: ${hits.slice(0, 5).join('; ')}` : ''}

Responda SOMENTE com este JSON:
{"ideas": [{"title": "título", "formatId": "id da lista", "hook": "gancho", "why": "por que serve ao meu objetivo, em 1 frase"}]}`;
}

// ---------- Leitura da resposta ----------
function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const a = body.indexOf('{');
  const b = body.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try {
    return JSON.parse(body.slice(a, b + 1));
  } catch {
    return null;
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : v ? [str(v)] : []);

export function parseContent(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Nada para colar. Copie a resposta do Claude primeiro.');
  const d = extractJson(raw);
  if (!d) {
    // Sem JSON: guarda o texto como roteiro, para não perder nada.
    return { title: '', hook: '', hooks: [], steps: raw.split('\n').map((l) => l.trim()).filter(Boolean), caption: '', cta: '', check: [], critique: '', loose: true };
  }
  return {
    title: str(d.title),
    hook: str(d.hook),
    hooks: arr(d.hooks),
    steps: arr(d.steps),
    caption: str(d.caption),
    cta: str(d.cta),
    check: arr(d.check),
    critique: str(d.critique),
    loose: false,
  };
}

export function parseIdeas(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Nada para colar. Copie a resposta do Claude primeiro.');
  const d = extractJson(raw);
  if (!d || !Array.isArray(d.ideas)) throw new Error('Não encontrei a lista de ideias na resposta. Copie a resposta inteira do Claude.');
  const ids = new Set(FORMATS.map((f) => f.id));
  return d.ideas
    .filter((i) => i && typeof i === 'object' && str(i.title))
    .map((i) => ({ title: str(i.title), formatId: ids.has(str(i.formatId)) ? str(i.formatId) : '', hook: str(i.hook), why: str(i.why) }));
}
