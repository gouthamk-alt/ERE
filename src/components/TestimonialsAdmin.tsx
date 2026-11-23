import { useState } from 'react';
import type { Testimonial } from '../testimonials';
import { ConfirmAction } from './ConfirmAction';

type Props = {
  items: Testimonial[];
  onSave: (item: Testimonial, existing: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReorder: (ids: string[]) => Promise<boolean>;
};
const empty = (): Testimonial => ({ id: crypto.randomUUID(), clientName: '', quote: '', context: '', rating: null, visible: false });
export function TestimonialsAdmin({ items, onSave, onDelete, onReorder }: Props) {
  const [form, setForm] = useState<Testimonial | null>(null), [existing, setExisting] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  async function perform(action: () => Promise<boolean>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try { const saved = await action(); if (saved) setMessage(success); else setError('Not saved. Check the content message above, reload if needed, then try again.'); return saved; }
    catch { setError('Could not save this change. Please try again.'); return false; }
    finally { setBusy(false); }
  }
  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (busy || target < 0 || target >= items.length) return;
    const ids = items.map(item => item.id); [ids[index], ids[target]] = [ids[target], ids[index]];
    void perform(() => onReorder(ids), 'Testimonial order saved.');
  };
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-3xl font-bold">Testimonials</h2><button disabled={busy} className="admin-action" onClick={() => { setForm(empty()); setExisting(false); setError(''); setMessage(''); }}>Add testimonial</button></div>
    <p className="text-sm text-white/65">Manage the carousel shown at the end of every public page, including the homepage. Each page starts at a different review where possible. Only reviews marked Visible appear publicly.</p>
    <p className="text-sm text-white/65">Use genuine client feedback approved for publication. New testimonials start hidden.</p>
    <p role="status" aria-live="polite">{message}</p>{error && <p role="alert">{error}</p>}
    {form && <form className="border border-white/25 p-5 sm:p-7 space-y-5" onSubmit={async event => { event.preventDefault(); if (await perform(() => onSave(form, existing), 'Testimonial saved.')) setForm(null); }}>
      <h3 className="text-xl font-bold">{existing ? 'Edit testimonial' : 'New testimonial'}</h3>
      <div className="grid sm:grid-cols-2 gap-5"><label className="admin-label">Client display name<input required maxLength={150} className="admin-input" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Use the name approved by the client" /></label>
      <label className="admin-label">Client type, property or suburb (optional)<input maxLength={250} className="admin-input" value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} placeholder="e.g. Seller · Applecross" /></label></div>
      <label className="admin-label">Client review<textarea required rows={6} maxLength={2000} className="admin-input" value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })} /></label>
      <label className="admin-label max-w-sm">Rating (optional)<select className="admin-input" value={form.rating ?? ''} onChange={e => setForm({ ...form, rating: e.target.value ? Number(e.target.value) : null })}><option value="">No rating displayed</option>{[1,2,3,4,5].map(rating => <option key={rating} value={rating}>{rating} out of 5</option>)}</select></label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.visible} onChange={e => setForm({ ...form, visible: e.target.checked })} />Show this testimonial on the website</label>
      <div className="flex gap-4"><button disabled={busy} className="admin-action">{busy ? 'Saving…' : 'Save testimonial'}</button><button type="button" disabled={busy} onClick={() => setForm(null)}>Cancel</button></div>
    </form>}
    {!items.length && !form && <p className="border border-dashed border-white/20 p-8 text-white/60">No testimonials yet. Add the first approved client review to start the carousel.</p>}
    <div className="space-y-4">{items.map((item, index) => <article key={item.id} className="border border-white/20 p-5 sm:p-7 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl font-bold">{item.clientName}</h3><span className="text-sm text-white/60">Position {index + 1} · {item.visible ? 'Visible' : 'Hidden'}</span></div>
      <p className="text-sm text-white/60">{item.context}{item.rating !== null ? ` · ${item.rating}/5 stars` : ''}</p><blockquote className="whitespace-pre-line break-words leading-relaxed">{item.quote}</blockquote>
      <div className="flex flex-wrap gap-3 items-center"><button disabled={busy} className="admin-action" onClick={() => { setForm(item); setExisting(true); setError(''); }}>Edit {item.clientName}</button>
        <button disabled={busy} className="admin-action" aria-label={`${item.visible ? 'Hide' : 'Show'} testimonial by ${item.clientName}`} onClick={() => void perform(() => onSave({ ...item, visible: !item.visible }, true), item.visible ? 'Testimonial hidden.' : 'Testimonial visible.')}>{item.visible ? 'Hide' : 'Show'}</button>
        <button disabled={busy || index === 0} className="admin-action disabled:opacity-35" aria-label={`Move testimonial by ${item.clientName} up`} onClick={() => move(index, -1)}>Move up</button>
        <button disabled={busy || index === items.length - 1} className="admin-action disabled:opacity-35" aria-label={`Move testimonial by ${item.clientName} down`} onClick={() => move(index, 1)}>Move down</button>
        {!busy && <ConfirmAction label="Delete" message={`Delete the testimonial by ${item.clientName}?`} onConfirm={() => perform(() => onDelete(item.id), 'Testimonial deleted.')} />}
      </div>
    </article>)}</div>
  </section>;
}
