import test from 'node:test';
import assert from 'node:assert/strict';
import { displayListingBadge, displayListingStatus, displayPropertyPrice } from '../src/propertyPresentation.ts';
import { testimonialStart } from '../src/testimonials.ts';

test('public sections start with distinct testimonials when enough reviews exist', () => {
  const pages = ['home','listings','list-with-us','team','team-profile','careers','videos','blog'];
  assert.equal(new Set(pages.map(page => testimonialStart(page, 8))).size, 8);
  assert.equal(testimonialStart('home', 0), 0);
  assert.equal(testimonialStart('blog:article-one', 1), 0);
});

test('residential weekly rents use grouped amounts and a clear time period', () => {
  for (const priceDisplay of ['$1550', '$1,550', '$1,550 pw', '$1550/week', '$1,550 per week']) {
    assert.equal(displayPropertyPrice({ category: 'Residential Lease', priceDisplay }), '$1,550 per week');
  }
  assert.equal(displayPropertyPrice({ category: 'Leased', priceDisplay: '$750/wk' }), '$750 per week');
});

test('sale and commercial quotes never acquire a weekly rent label', () => {
  for (const category of ['Residential Sale', 'Commercial', 'Sold']) {
    assert.equal(displayPropertyPrice({ category, priceDisplay: '$1550' }), '$1550');
  }
});

test('explicit alternative periods, price ranges and agent instructions remain intact', () => {
  for (const priceDisplay of ['$4,000 per month', '$20,000 per annum', '$900 - $1000', 'From $900', 'Contact Agent']) {
    assert.equal(displayPropertyPrice({ category: 'Residential Lease', priceDisplay }), priceDisplay);
  }
});

test('formatting is display-only and does not alter stored listing data', () => {
  const listing = Object.freeze({ category: 'Residential Lease', priceDisplay: '$1550' });
  assert.equal(displayPropertyPrice(listing), '$1,550 per week');
  assert.equal(listing.priceDisplay, '$1550');
});

test('under contract appears on listing cards and preserves earlier contract labels', () => {
  assert.equal(displayListingBadge({ status: 'Under Contract', badgeText: 'Just Listed', category: 'Residential Sale' }), 'Under Contract');
  assert.equal(displayListingStatus({ status: 'Under Contract', badgeText: 'Just Listed' }), 'Under Contract');
  assert.equal(displayListingBadge({ status: 'Under Offer', badgeText: 'Under Contract', category: 'Residential Sale' }), 'Under Contract');
  assert.equal(displayListingBadge({ status: 'Available', badgeText: 'Just Listed', category: 'Residential Sale' }), 'Just Listed');
});
