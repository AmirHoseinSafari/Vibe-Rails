import { load, save } from './storage';

test('saved data comes back after a reload, and a missing or damaged value falls back', () => {
  expect(load('things', [])).toEqual([]);
  save('things', [{ name: 'one' }]);
  expect(load('things', [])).toEqual([{ name: 'one' }]);
  localStorage.setItem('{{slug}}:broken', '{not json');
  expect(load('broken', 'fallback')).toBe('fallback');
});
