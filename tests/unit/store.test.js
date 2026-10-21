import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, MemoryStorage, contentsToCsv } from '../../src/js/lib/store.js';

const fresh = () => {
  const s = new Store(new MemoryStorage());
  s.load();
  return s;
};

test('criar, editar, recarregar e apagar', () => {
  const s = fresh();
  const c = s.create('contents', { title: 'A', id: 'x' });
  assert.notEqual(c.id, 'x');
  s.update('contents', c.id, { status: 'postado' });
  const again = new Store(s.storage);
  again.load();
  assert.equal(again.get('contents', c.id).status, 'postado');
  again.remove('contents', c.id);
  assert.equal(again.list('contents').length, 0);
});

test('apagar marca limpa o vínculo no conteúdo', () => {
  const s = fresh();
  const b = s.create('brands', { name: 'B' });
  const c = s.create('contents', { title: 'C', brandId: b.id });
  s.remove('brands', b.id);
  assert.equal(s.get('contents', c.id).brandId, null);
});

test('dados danificados não são apagados', () => {
  const st = new MemoryStorage();
  st.setItem('creator:db', '{x');
  assert.throws(() => new Store(st).load(), /danificados/);
  assert.equal(st.getItem('creator:db'), '{x');
});

test('importar backup', () => {
  const s = fresh();
  s.create('contents', { title: 'a' });
  assert.equal(s.importAll({ contents: [{ id: 'z', title: 'b' }] }, 'merge').contents, 2);
  assert.equal(s.importAll({ contents: [] }, 'replace').contents, 0);
  assert.throws(() => s.importAll({ contents: 'x' }), /lista/);
});

test('perfil padrão tem meta semanal', () => {
  assert.equal(fresh().db.profile.weeklyGoal, 4);
});

test('CSV', () => {
  const csv = contentsToCsv([{ title: 'a;b', platforms: ['instagram', 'tiktok'], results: { views: 10 } }]);
  assert.ok(csv.startsWith('﻿Título;'));
  assert.ok(csv.includes('"a;b"') && csv.includes('instagram+tiktok'));
});
