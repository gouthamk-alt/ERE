import type { PropertyListing } from './data/initialData';

export function propertyImageVariant(url: string, variant: 'card' | 'thumb') {
  return /^\/assets\/zenu-import\/[a-f0-9]{24}\.webp$/.test(url) ? url.replace(/\.webp$/, `-${variant}.webp`) : url;
}

export function reaListingUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['realestate.com.au', 'www.realestate.com.au'].includes(url.hostname) && !url.username && !url.password && !url.port && /^\/(?:property-[^/]+-)?\d+\/?$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

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
