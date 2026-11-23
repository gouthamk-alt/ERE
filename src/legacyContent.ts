import { INITIAL_LISTINGS, INITIAL_BLOG_POSTS } from './data/initialData';
import type { BlogPost, PropertyListing } from './data/initialData';
import imageMigration from '../server/image-migration.json';

export type LegacyContent = { listings: PropertyListing[]; blogPosts: BlogPost[] };
const canonical = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
const IMPORTED = 'ere_shared_content_imported_v1';
export function getBrowserEdits() {
  try {
    const listings = JSON.parse(localStorage.getItem('exceptional_re_zenu_listings_v3') || 'null');
    const blogPosts = JSON.parse(localStorage.getItem('exceptional_re_zenu_blogs_v3') || 'null');
    let data: LegacyContent = {
      listings: Array.isArray(listings) ? listings : INITIAL_LISTINGS,
      blogPosts: Array.isArray(blogPosts) ? blogPosts : INITIAL_BLOG_POSTS,
    };
    let migrated=JSON.stringify(data);for(const [old,url] of Object.entries(imageMigration))migrated=migrated.split(old).join(url);data=JSON.parse(migrated);
    const changes: string[] = [];
    for (const [collection, original] of [['listings', INITIAL_LISTINGS], ['blogPosts', INITIAL_BLOG_POSTS]] as const) {
      const before = new Map<string, PropertyListing | BlogPost>(original.map((item) => [item.id, item]));
      const after = new Map<string, PropertyListing | BlogPost>(data[collection].map((item) => [item.id, item]));
      for (const [id, item] of after) if (canonical(item) !== canonical(before.get(id))) changes.push(`${before.has(id) ? 'Update' : 'Add'}: ${item.title}`);
      for (const [id, item] of before) if (!after.has(id)) changes.push(`Delete: ${item.title}`);
    }
    if (!changes.length || localStorage.getItem(IMPORTED) === canonical(data)) return null;
    return { data, changes };
  } catch { return null; }
}
export function markBrowserEditsImported(data: LegacyContent) {
  try { localStorage.setItem(IMPORTED, canonical(data)); } catch { /* Original browser backup is retained. */ }
}
export function downloadBrowserBackup(data: LegacyContent) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ERE-browser-content-backup.json';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
