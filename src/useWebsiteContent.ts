import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlogPost, PropertyListing } from './data/initialData';
import { getBrowserEdits, markBrowserEditsImported, type LegacyContent } from './legacyContent';

type Content = { listings: PropertyListing[]; blogPosts: BlogPost[]; revision: string };
type Operation = { collection: 'listings' | 'blogPosts'; action: 'add' | 'update' | 'delete'; item?: PropertyListing | BlogPost; id?: string }
  | { action: 'import'; legacy: LegacyContent };
async function readResponse(response: Response): Promise<Content> {
  let data;
  try { data = await response.json(); } catch { throw new Error('Website content is unavailable. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'Unable to load or save website content.');
  if (!Array.isArray(data.listings) || !Array.isArray(data.blogPosts) || typeof data.revision !== 'string') throw new Error('The website returned an invalid content response.');
  return data;
}

export function useWebsiteContent() {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [browserEdits, setBrowserEdits] = useState(getBrowserEdits);
  const current = useRef<Content | null>(null);
  const pending = useRef(false);
  const sequence = useRef(0);
  const accept = (data: Content) => { current.current = data; setContent(data); };
  const refresh = useCallback(async () => {
    if (pending.current) return false;
    const request = ++sequence.current;
    try {
      const data = await readResponse(await fetch('/api/content', { cache: 'no-store' }));
      if (request !== sequence.current) return false;
      accept(data);
      setError('');
      return true;
    } catch (err) {
      if (request === sequence.current) setError(err instanceof Error ? err.message : 'Unable to load website content.');
      return false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    // Editors refresh explicitly so an open form isn't silently replaced by another editor.
    if (/^\/admin\/?$/.test(window.location.pathname)) return;
    const revalidate = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(revalidate, 30_000);
    window.addEventListener('focus', revalidate);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', revalidate); };
  }, [refresh]);

  const save = useCallback(async (operation: Operation) => {
    if (pending.current) return false;
    if (!current.current) { setError('Load the website content before saving.'); return false; }
    pending.current = true;
    ++sequence.current;
    setSaving(true);
    setError('');
    try {
      const data = await readResponse(await fetch('/api/admin/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...operation, revision: current.current.revision }),
      }));
      accept(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your changes could not be confirmed. Reload the latest content before retrying.');
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, []);
  const importBrowserEdits = async () => {
    if (!browserEdits) return false;
    if (!await save({ action: 'import', legacy: browserEdits.data })) return false;
    markBrowserEditsImported(browserEdits.data);
    setBrowserEdits(null);
    return true;
  };
  return { listings: content?.listings || [], blogPosts: content?.blogPosts || [], ready: Boolean(content), error, saving, refresh, save, browserEdits, importBrowserEdits };
}
