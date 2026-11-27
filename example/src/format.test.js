import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice, formatProduct } from './format.js';

test('Türkçe ürün etiketini biçimlendirir', () => {
  assert.match(formatPrice(1250.5), /1\.250,50/);
  assert.equal(formatProduct({ name: 'Kahve', price: 99 }), 'Kahve · ₺99,00');
});
