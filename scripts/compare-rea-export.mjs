// Compare an Ignite Listing Data export with the website catalogue without changing either.
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';

const root = path.resolve(import.meta.dirname, '..');
const exportPath = process.argv[2] || path.join(root, '.ere-data', 'rea-export-2026-11-25.xml');
const site = JSON.parse(fs.readFileSync(path.join(root, 'staged', 'zenu-listings.json'), 'utf8'));
const xml = new DOMParser().parseFromString(fs.readFileSync(exportPath, 'utf8'), 'text/xml');
const elements = node => Array.from(node.childNodes).filter(child => child.nodeType === 1);
const child = (node, name) => elements(node).find(item => item.tagName === name);
const value = (node, name) => child(node, name)?.textContent?.trim() || '';
const norm = text => String(text || '').toLowerCase().replace(/\b(?:road|rd)\b/g, 'rd').replace(/\b(?:street|st)\b/g, 'st').replace(/[^a-z0-9]/g, '');
const kind = node => node.tagName === 'rental' ? 'lease' : node.tagName === 'commercial' ? 'commercial' : 'sale';
const siteKind = listing => listing.category === 'Residential Lease' || listing.category === 'Leased' ? 'lease' : listing.category === 'Commercial' ? 'commercial' : 'sale';
const address = node => {
  const place = child(node, 'address');
  return ['subNumber', 'streetNumber', 'street', 'suburb'].map(name => value(place, name)).filter(Boolean).join(' ');
};
const records = elements(xml.documentElement).map(node => ({
  kind: kind(node), status: node.getAttribute('status'), underOffer: child(node, 'underOffer')?.getAttribute('value') === 'yes',
  uniqueId: value(node, 'uniqueID'), listingId: value(node, 'listingId'), address: address(node), node,
}));
const byId = new Map(site.map(item => [String(item.id), item]));
const used = new Set();
const matches = records.map(record => {
  let siteItem = byId.get(record.uniqueId);
  let via = siteItem ? 'uniqueID' : '';
  if (!siteItem) {
    siteItem = site.find(item => !used.has(item) && item.reaUrl?.match(/\d+\/?$/)?.[0]?.replace('/', '') === record.listingId);
    via = siteItem ? 'REA URL' : '';
  }
  if (!siteItem) {
    siteItem = site.find(item => !used.has(item) && siteKind(item) === record.kind && norm(item.address).startsWith(norm(record.address)));
    via = siteItem ? 'address' : '';
  }
  if (siteItem) used.add(siteItem);
  return { ...record, siteItem, via };
});
const counts = records.reduce((result, record) => {
  const key = `${record.kind}:${record.status}`;
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});
console.log('REA export:', records.length, counts);
console.log('Website:', site.length);
for (const status of ['current', 'offmarket', 'sold', 'leased']) {
  const rows = matches.filter(item => item.status === status);
  console.log(`\n${status.toUpperCase()} (${rows.length}):`);
  for (const row of rows) {
    const outcome = row.siteItem ? `${row.via}; site ${row.siteItem.status}` : 'MISSING';
    console.log(`${row.kind.padEnd(10)} ${row.address.padEnd(52)} ${row.listingId.padEnd(10)} ${outcome}`);
  }
}
console.log('\nSITE ONLY:', site.filter(item => !used.has(item)).map(item => `${item.category} / ${item.status}: ${item.address}`).join('\n'));
