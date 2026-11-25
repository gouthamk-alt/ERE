// Prepare a reviewable website catalogue from the agency's Ignite Listing Data export.
// This does not write to the live content store.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DOMParser } from '@xmldom/xmldom';
import sharp from 'sharp';
import { validateItem } from '../server/content.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = process.argv.slice(2).find(arg => !arg.startsWith('--')) || path.join(root, '.ere-data', 'rea-export-2026-11-25.xml');
const baseline = JSON.parse(await fs.readFile(path.join(root, 'staged', 'zenu-listings.json'), 'utf8'));
const xml = new DOMParser().parseFromString(await fs.readFile(sourcePath, 'utf8'), 'text/xml');
const children = node => Array.from(node?.childNodes || []).filter(child => child.nodeType === 1);
const child = (node, name) => children(node).find(item => item.tagName === name);
const value = (node, name) => child(node, name)?.textContent?.trim() || '';
const normalize = text => String(text || '').toLowerCase().replace(/\b(?:road|rd)\b/g, 'rd').replace(/\b(?:street|st)\b/g, 'st').replace(/[^a-z0-9]/g, '');
const capitalize = text => /^[A-Z\s&'-]+$/.test(text) ? text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) : text;
const kind = node => node.tagName === 'rental' ? 'lease' : node.tagName === 'commercial' ? 'commercial' : 'sale';
const siteKind = item => item.category === 'Residential Lease' || item.category === 'Leased' ? 'lease' : item.category === 'Commercial' ? 'commercial' : 'sale';
const siteUrlId = item => item.reaUrl?.match(/\d+\/?$/)?.[0]?.replace('/', '');
const number = text => Number.parseFloat(String(text || '').replace(/,/g, '')) || 0;
const agentNames = ['Wendy Chia', 'Calvin Liew', 'Bee Khaw', 'Tony Cai', 'Jacky Chan', 'Bima Putra', 'Jess Kaur'];
const warnings = [];
const assets = new Map();
const records = children(xml.documentElement);
if (records.some(node => value(node, 'agentID') !== 'GYTOPA')) throw new Error('The export contains a different agency ID.');

function addressOf(node) {
  const address = child(node, 'address');
  const unit = value(address, 'subNumber');
  const streetNumber = value(address, 'streetNumber');
  const street = capitalize(value(address, 'street'));
  const title = address?.getAttribute('display') === 'no' ? 'Address available on request' : `${unit && streetNumber ? `${unit}/` : unit ? `${unit} ` : ''}${streetNumber}${streetNumber ? ' ' : ''}${street}`.trim();
  const suburb = capitalize(value(address, 'suburb'));
  return { title, suburb, state: value(address, 'state'), postcode: value(address, 'postcode'), address: `${title}, ${suburb} ${value(address, 'state')} ${value(address, 'postcode')}` };
}

function locate(node, used) {
  const uniqueId = value(node, 'uniqueID');
  const listingId = value(node, 'listingId');
  const address = addressOf(node);
  const found = baseline.find(item => !used.has(item.id) && item.id === uniqueId)
    || baseline.find(item => !used.has(item.id) && siteUrlId(item) === listingId)
    || baseline.find(item => !used.has(item.id) && siteKind(item) === kind(node) && normalize(item.address).startsWith(normalize(`${address.title} ${address.suburb}`)));
  if (found) used.add(found.id);
  return found;
}

function statusOf(node) {
  if (value(node, 'listingId') === '445501472') return 'Leased'; // Office confirmed 2203/110 Plain Street has leased.
  if (node.getAttribute('status') === 'sold') return 'Sold';
  if (node.getAttribute('status') === 'leased') return 'Leased';
  if (node.getAttribute('status') === 'offmarket') return 'Off-Market';
  return child(node, 'underOffer')?.getAttribute('value') === 'yes' ? 'Under Offer' : 'Available';
}

function categoryOf(node, status) {
  if (status === 'Sold') return 'Sold';
  if (status === 'Leased') return 'Leased';
  if (kind(node) === 'commercial') return 'Commercial';
  return kind(node) === 'lease' ? 'Residential Lease' : 'Residential Sale';
}

function imagesOf(node, all) {
  const images = children(child(node, 'objects')).filter(item => item.tagName === 'img' && /^https?:\/\/i2\.au\.reastatic\.net\//.test(item.getAttribute('url') || ''));
  return (all ? images : images.slice(0, 1)).map(item => {
    const source = item.getAttribute('url').replace(/^http:/, 'https:');
    const hash = createHash('sha256').update(source).digest('hex').slice(0, 24);
    const url = `/assets/rea-import/${hash}.webp`;
    assets.set(hash, { hash, source, url });
    return url;
  });
}

function agentsOf(node) {
  const text = children(node).filter(item => item.tagName === 'listingAgent').map(item => value(item, 'name')).join(' ').toLowerCase();
  const names = agentNames.filter(name => text.includes(name.toLowerCase()));
  if (!names.length) warnings.push({ id: value(node, 'listingId'), issue: 'Agent not recognised; Wendy used' });
  return { agentId: `agent-${(names[0] || 'Wendy Chia').toLowerCase().replace(/\s+/g, '-')}`, ...(names[1] ? { coAgentId: `agent-${names[1].toLowerCase().replace(/\s+/g, '-')}` } : {}) };
}

function createListing(node, status) {
  const address = addressOf(node);
  const listingId = value(node, 'listingId');
  const images = imagesOf(node, status === 'Available' || status === 'Under Offer');
  const feature = child(node, 'features');
  const description = value(node, 'description');
  const rental = kind(node) === 'lease';
  const priceDisplay = rental ? `$${number(value(node, 'rent')).toLocaleString('en-AU')} per week` : value(node, 'priceView') || 'Contact Agent';
  const item = {
    id: value(node, 'uniqueID'), ...address, priceDisplay, numericPrice: 0,
    category: categoryOf(node, status), status,
    propertyType: kind(node) === 'commercial' ? 'Commercial Suite' : node.tagName === 'land' ? 'Vacant Land' : node.tagName === 'rural' ? 'Mixed Farming' : ({ House: 'House', Apartment: 'Apartment', Unit: 'Unit', Townhouse: 'Townhouse' })[child(node, 'category')?.getAttribute('name')] || 'Residential',
    bedrooms: number(value(feature, 'bedrooms')), bathrooms: number(value(feature, 'bathrooms')),
    carSpaces: number(value(feature, 'garages')) + number(value(feature, 'carports')) + number(value(feature, 'openSpaces')),
    landSizeSqm: number(value(child(node, 'landDetails'), 'area')),
    buildingAreaSqm: number(value(child(node, 'buildingDetails'), 'area')),
    imageUrl: images[0] || '', galleryUrls: images,
    ...agentsOf(node), featured: false, inspectionTime: '', headline: value(node, 'headline') || address.title,
    description, features: [], listedDate: '',
    reaUrl: `https://www.realestate.com.au/${listingId}`,
    badgeText: status === 'Available' ? rental ? 'For Lease' : 'For Sale' : status,
  };
  if (!item.imageUrl) warnings.push({ id: listingId, issue: 'No source photo' });
  if (!/^[\w-]{1,100}$/.test(item.id)) throw new Error(`Invalid uniqueID for ${listingId}`);
  return validateItem('listings', item);
}

const used = new Set();
const updated = new Map();
const added = [];
const currentUpdatedAt = new Map();
for (const node of records) {
  if (kind(node) === 'commercial') continue; // Commercial stock is managed separately from the REA agency page.
  const status = statusOf(node);
  const existing = locate(node, used);
  const listingId = value(node, 'listingId');
  if (status === 'Available' || status === 'Under Offer') {
    currentUpdatedAt.set(existing?.id || value(node, 'uniqueID'), node.getAttribute('modTime') || '');
  }
  if (existing) {
    const item = { ...existing, status, category: categoryOf(node, status), reaUrl: `https://www.realestate.com.au/${listingId}` };
    if (status === 'Available' || status === 'Under Offer') {
      item.priceDisplay = kind(node) === 'lease' ? `$${number(value(node, 'rent')).toLocaleString('en-AU')} per week` : value(node, 'priceView') || existing.priceDisplay;
      item.badgeText = status === 'Under Offer' ? 'Under Offer' : kind(node) === 'lease' ? 'For Lease' : kind(node) === 'commercial' ? 'Commercial' : 'For Sale';
    } else item.badgeText = status;
    updated.set(existing.id, validateItem('listings', item));
  } else {
    const item = createListing(node, status);
    if (baseline.some(existingItem => existingItem.id === item.id) || added.some(existingItem => existingItem.id === item.id)) {
      warnings.push({ id: listingId, issue: `Duplicate source uniqueID ${item.id}; REA listing ID added to website ID` });
      item.id = `${item.id}-${listingId}`;
    }
    added.push(validateItem('listings', item));
  }
}
for (const item of baseline) {
  if (updated.has(item.id) || ['Sold', 'Leased'].includes(item.status) || item.category === 'Commercial') continue;
  updated.set(item.id, validateItem('listings', { ...item, status: 'Off-Market', badgeText: 'Off-Market' }));
}
const listings = [...baseline.map(item => updated.get(item.id) || item), ...added];
const currentRank = item => item.status === 'Available' || item.status === 'Under Offer'
  ? item.category === 'Commercial' ? 1 : 0
  : 2;
listings.sort((a, b) => currentRank(a) - currentRank(b)
  || (currentRank(a) === 0 ? (currentUpdatedAt.get(b.id) || '').localeCompare(currentUpdatedAt.get(a.id) || '') : 0));
if (new Set(listings.map(item => item.id)).size !== listings.length) {
  const seen = new Set();
  throw new Error(`Duplicate listing IDs after import: ${listings.filter(item => seen.has(item.id) || (seen.add(item.id), false)).map(item => `${item.id} ${item.address}`).join('; ')}`);
}
const output = path.join(root, 'staged', 'rea-listings-preview.json');
await fs.writeFile(output, JSON.stringify(listings, null, 2));
await fs.writeFile(path.join(root, 'staged', 'rea-import-review.json'), JSON.stringify({
  source: path.basename(sourcePath), count: listings.length,
  statusCounts: Object.fromEntries([...new Set(listings.map(item => item.status))].map(status => [status, listings.filter(item => item.status === status).length])),
  added: added.map(item => ({ id: item.id, address: item.address, status: item.status, category: item.category, reaUrl: item.reaUrl })),
  changed: [...updated.values()].filter(item => JSON.stringify(item) !== JSON.stringify(baseline.find(old => old.id === item.id))).map(item => ({ id: item.id, address: item.address, from: baseline.find(old => old.id === item.id).status, to: item.status, priceDisplay: item.priceDisplay })),
  warnings,
}, null, 2));
await fs.writeFile(path.join(root, '.ere-data', 'rea-asset-manifest.json'), JSON.stringify([...assets.values()], null, 2));
console.log(JSON.stringify({ total: listings.length, added: added.length, updated: updated.size, assets: assets.size, warnings: warnings.length }));

if (process.argv.includes('--download')) {
  const target = path.join(root, 'public', 'assets', 'rea-import');
  await fs.mkdir(target, { recursive: true });
  const pending = [...assets.values()];
  const errors = [];
  let saved = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    for (;;) {
      const asset = pending.shift();
      if (!asset) return;
      const filename = path.join(target, `${asset.hash}.webp`);
      try {
        if (!await fs.stat(filename).catch(() => null)) {
          const response = await fetch(asset.source, { signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const bytes = Buffer.from(await response.arrayBuffer());
          await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toFile(filename);
        }
        saved++;
      } catch (error) { errors.push({ source: asset.source, error: error.message }); }
    }
  }));
  await fs.writeFile(path.join(root, '.ere-data', 'rea-image-errors.json'), JSON.stringify(errors, null, 2));
  console.log(JSON.stringify({ saved, errors: errors.length }));
  if (errors.length) process.exitCode = 1;
}
