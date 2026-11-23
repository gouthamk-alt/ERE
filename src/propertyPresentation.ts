import type { PropertyListing } from './data/initialData';

export function displayPropertyPrice(property: Pick<PropertyListing, 'category' | 'priceDisplay'>) {
  const price = property.priceDisplay.trim();
  if (!['Residential Lease', 'Leased'].includes(property.category)) return price;
  // Only infer a weekly rate from a single residential rent amount. Keep quoted
  // monthly/annual prices, ranges and agent instructions exactly as supplied.
  const weekly = price.match(/^\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:per\s+week|p\.?\s*w\.?|\/\s*(?:week|wk))?$/i);
  if (!weekly) return price;
  const amount = Number(weekly[1].replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount <= 0) return price;
  return `$${amount.toLocaleString('en-AU', { maximumFractionDigits: 2 })} per week`;
}
