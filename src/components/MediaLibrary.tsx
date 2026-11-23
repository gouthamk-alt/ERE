import { useEffect, useState } from 'react';
import { adminApi, uploadMedia, errorMessage } from '../adminApi';

export function MediaLibrary({ onSelect, imagesOnly = false }: { onSelect?: (url: string) => void; imagesOnly?: boolean }) {
  const [items, setItems] = useState<any[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() { try { setItems((await adminApi('/api/admin/media')).items); } catch (e) { setError(errorMessage(e)); } }
  useEffect(() => { void refresh(); }, []);
  return <section className="space-y-4" aria-label="Media library">
    <div className="flex flex-wrap items-center gap-4"><h3 className="text-xl font-bold">Stored uploads</h3>
      <label className="admin-action">{busy ? 'Uploading…' : imagesOnly ? 'Upload image' : 'Upload image, PDF or font'}<input className="sr-only" type="file" disabled={busy} accept={imagesOnly ? 'image/jpeg,image/png,image/webp,image/avif' : 'image/jpeg,image/png,image/webp,image/avif,.pdf,.woff2'} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError('');
        try { const item = await uploadMedia(file); await refresh(); if (onSelect && item.kind === 'image') onSelect(item.url); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); e.target.value = ''; }
      }} /></label><button type="button" className="underline text-sm" onClick={() => void refresh()}>Refresh library</button></div>
    <p className="text-xs opacity-65">Up to 3 MB per file. Uploads used on the website or in newsletters are public. Custom WOFF2 fonts can be used on the website; email apps may substitute them.</p>
    {error && <p role="alert">{error}</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-auto">
      {items.filter((item: any) => !imagesOnly || item.kind === 'image').map((item: any) => <div key={item.id} className="border border-current/20 p-3 space-y-2 min-w-0">
        {item.kind === 'image' ? <img src={item.url} alt={item.name} className="w-full aspect-video object-cover" /> : <p className="font-bold py-5">{item.kind === 'font' ? 'FONT' : 'PDF'}</p>}
        <p className="text-xs truncate" title={item.name}>{item.name}</p>
        {onSelect && item.kind === 'image' ? <button type="button" className="underline text-sm" onClick={() => onSelect(item.url)}>Use image</button> : <button type="button" className="underline text-xs" onClick={() => { void navigator.clipboard.writeText(new URL(item.url, window.location.origin).href).then(() => setError('Link copied.')).catch(() => setError(item.url)); }}>Copy link</button>}
      </div>)}
    </div>
    {!items.length && <p className="text-sm opacity-65">No uploads yet.</p>}
  </section>;
}
