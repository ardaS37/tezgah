const locale = 'tr-TR';

export function formatPrice(amount, currency = 'TRY') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatProduct(product) {
  const { name, price, currency } = product;

  return `${name} · ${formatPrice(price, currency)}`;
}
