import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, MemoryStorage, postsToCsv } from '../../src/js/lib/store.js';

const fresh = () => {
  const storage = new MemoryStorage();
  const s = new Store(storage);
  s.load();
  return { s, storage };
};

test('CRUD e persistência (recarregar lê o que foi salvo)', () => {
  const { s, storage } = fresh();
  const p = s.create('posts', { title: 'A', id: 'forjado' });
  assert.notEqual(p.id, 'forjado');
  s.update('posts', p.id, { status: 'publicado' });
  const again = new Store(storage);
  again.load();
  assert.equal(again.get('posts', p.id).status, 'publicado');
  again.remove('posts', p.id);
  assert.equal(again.list('posts').length, 0);
  assert.throws(() => again.update('posts', p.id, {}), /não encontrado/);
});

test('excluir remove vínculos', () => {
  const { s } = fresh();
  const r = s.create('references', { title: 'R' });
  const i = s.create('ideas', { title: 'I', referenceIds: [r.id], brandId: null });
  const b = s.create('brands', { name: 'B' });
  s.update('ideas', i.id, { brandId: b.id });
  s.remove('references', r.id);
  s.remove('brands', b.id);
  assert.deepEqual(s.get('ideas', i.id).referenceIds, []);
  assert.equal(s.get('ideas', i.id).brandId, null);
});

test('dados danificados não são sobrescritos', () => {
  const storage = new MemoryStorage();
  storage.setItem('estudio:db', '{quebrado');
  assert.throws(() => new Store(storage).load(), /danificados/);
  assert.equal(storage.getItem('estudio:db'), '{quebrado');
  assert.equal(storage.getItem('estudio:db:danificado'), '{quebrado');
});

test('importar mesclando e substituindo; rejeita formato errado', () => {
  const { s } = fresh();
  s.create('brands', { name: 'X' });
  assert.equal(s.importAll({ brands: [{ id: 'b2', name: 'Y' }] }, 'merge').brands, 2);
  assert.equal(s.importAll({ brands: [] }, 'replace').brands, 0);
  assert.throws(() => s.importAll({ ideas: 'x' }), /lista/);
});

test('cópia diária permite desfazer', () => {
  const { s } = fresh();
  s.create('ideas', { title: 'antes' });
  // simula que a cópia é de "ontem"
  const snap = JSON.parse(s.storage.getItem('estudio:snapshot'));
  s.storage.setItem('estudio:snapshot', JSON.stringify({ ...snap, day: '2000-01-01' }));
  s.create('ideas', { title: 'depois' }); // guarda o estado atual como cópia do dia
  s.remove('ideas', s.list('ideas')[0].id);
  s.restoreSnapshot();
  assert.equal(s.list('ideas').length, 1);
});

test('erro de espaço vira mensagem clara', () => {
  const { s } = fresh();
  s.storage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  assert.throws(() => s.create('ideas', { title: 'x' }), /espaço do navegador/);
});

test('CSV com ; e BOM', () => {
  const csv = postsToCsv([{ title: 'a;b', metrics: { reach: 5, source: 'instagram_api' } }]);
  assert.ok(csv.startsWith('﻿Título;'));
  assert.ok(csv.includes('"a;b"'));
  assert.ok(csv.includes('instagram_api'));
});
