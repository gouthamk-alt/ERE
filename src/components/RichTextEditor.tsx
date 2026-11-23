import { useEffect, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import DOMPurify from 'dompurify';
import { adminApi, uploadMedia, errorMessage } from '../adminApi';
import { MediaLibrary } from './MediaLibrary';

export const paragraphsHtml = (paragraphs: string[]) => paragraphs.map(text => `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');
export function RichTextEditor({ value, onChange, label = 'Document editor' }: { value: string; onChange: (html: string, text: string) => void; label?: string }) {
  const [error, setError] = useState(''), [library, setLibrary] = useState(false), [fonts, setFonts] = useState<any[]>([]), [customFont, setCustomFont] = useState(''), [linkHref,setLinkHref]=useState('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), TextStyleKit, TextAlign.configure({ types: ['heading', 'paragraph'] }), Image, TableKit.configure({ table: { resizable: true } })],
    content: value || '<p></p>', editorProps: { attributes: { class: 'rich-document', role: 'textbox', 'aria-label': label, 'aria-multiline': 'true' } },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });
  useEditorState({ editor, selector: ({ editor }) => editor?.state });
  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(DOMPurify.sanitize(value || '<p></p>'), { emitUpdate: false }); }, [editor, value]);
  useEffect(() => { void adminApi('/api/admin/media').then(data => setFonts(data.items.filter((item: any) => item.kind === 'font'))).catch(() => {}); }, [library]);
  if (!editor) return <p>Loading editor…</p>;
  const command = (label: string, action: () => void, active = false) => <button type="button" key={label} aria-pressed={active} className="rich-tool" onClick={action}>{label}</button>;
  return <div className="rich-editor">
    <link rel="stylesheet" href={`/api/fonts.css?v=${fonts.length}`} />
    <div role="toolbar" aria-label={`${label} formatting`} className="rich-toolbar">
      <select aria-label="Paragraph style" value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'p'} onChange={e => e.target.value === 'p' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 }).run()}><option value="p">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select>
      <select aria-label="Font family" onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()} defaultValue="Arial"><option>Arial</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Tahoma</option><option>Courier New</option>{fonts.map(font => <option key={font.id} value={font.family}>{font.name}</option>)}</select>
      <select aria-label="Font size" onChange={e => editor.chain().focus().setFontSize(`${e.target.value}px`).run()} defaultValue="16">{[10,12,14,16,18,20,24,28,32,36,48,64,72,96].map(size => <option key={size}>{size}</option>)}</select>
      {command('Bold', () => { editor.chain().focus().toggleBold().run(); }, editor.isActive('bold'))}
      {command('Italic', () => { editor.chain().focus().toggleItalic().run(); }, editor.isActive('italic'))}
      {command('Underline', () => { editor.chain().focus().toggleUnderline().run(); }, editor.isActive('underline'))}
      {command('Strike', () => { editor.chain().focus().toggleStrike().run(); })}
      <label className="rich-tool">Text colour<input type="color" aria-label="Text colour" defaultValue="#000000" onChange={e => editor.chain().focus().setColor(e.target.value).run()} /></label>
      <label className="rich-tool">Highlight<input type="color" aria-label="Highlight colour" defaultValue="#ffffff" onChange={e => editor.chain().focus().setBackgroundColor(e.target.value).run()} /></label>
      {['left','center','right','justify'].map(align => command(align, () => { editor.chain().focus().setTextAlign(align).run(); }))}
      {command('Bullets', () => { editor.chain().focus().toggleBulletList().run(); })}
      {command('Numbered list', () => { editor.chain().focus().toggleOrderedList().run(); })}
      {command('Quote', () => { editor.chain().focus().toggleBlockquote().run(); })}
      <input aria-label="Link address" placeholder="https://…" className="rich-tool max-w-36" value={linkHref} onChange={e=>setLinkHref(e.target.value)}/>{command('Add link',()=>{if(/^https?:\/\//i.test(linkHref))editor.chain().focus().setLink({href:linkHref}).run();})}{command('Remove link',()=>{editor.chain().focus().unsetLink().run();})}
      {command('Insert table', () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); })}
      {command('Add row', () => { editor.chain().focus().addRowAfter().run(); })}
      {command('Add column', () => { editor.chain().focus().addColumnAfter().run(); })}
      {command('Delete table', () => { editor.chain().focus().deleteTable().run(); })}
      {command('Undo', () => { editor.chain().focus().undo().run(); })}{command('Redo', () => { editor.chain().focus().redo().run(); })}
      {command('Clear formatting', () => { editor.chain().focus().unsetAllMarks().clearNodes().run(); })}
      <button type="button" className="rich-tool" onClick={() => setLibrary(!library)}>Image library</button>
      <label className="rich-tool">Upload image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; try { const asset = await uploadMedia(file); editor.chain().focus().setImage({ src: asset.url, alt: file.name }).run(); setError(''); } catch (error) { setError(errorMessage(error)); } finally { e.target.value = ''; }
      }} /></label>
      <label className="rich-tool">Import Word / HTML<input className="sr-only" type="file" accept=".docx,.html,.htm,.txt" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        try {
          if (file.size > 3 * 1024 * 1024) throw new Error('Use a document under 3 MB.');
          let html: string;
          if (/\.docx$/i.test(file.name)) { const mammoth = await import('mammoth/mammoth.browser'); html = (await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value; }
          else if (/\.txt$/i.test(file.name)) html = paragraphsHtml((await file.text()).split(/\n\s*\n/));
          else html = await file.text();
          // Word images are imported as inline data; upload them before storing the document.
          const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(html), 'text/html');
          for (const image of [...parsed.images]) if (image.src.startsWith('data:')) {
            const blob = await (await fetch(image.src)).blob();
            const asset = await uploadMedia(new File([blob], 'word-image.png', { type: blob.type })); image.setAttribute('src', asset.url);
          }
          editor.commands.setContent(DOMPurify.sanitize(parsed.body.innerHTML)); setError('');
        } catch (error) { setError(errorMessage(error)); } finally { e.target.value = ''; }
      }} /></label>
    </div>
    <div className="flex flex-wrap gap-2 p-2 border-b border-black/15"><input aria-label="Custom font name" placeholder="Other installed font name" value={customFont} onChange={e => setCustomFont(e.target.value)} className="border p-1 text-xs" /><button type="button" className="rich-tool" onClick={() => { if (/^[\w -]{1,80}$/.test(customFont)) editor.chain().focus().setFontFamily(customFont).run(); }}>Apply font</button><span className="text-xs text-black/60 self-center">Upload WOFF2 fonts in Media for website use.</span></div>
    {error && <p role="alert" className="p-3 text-black">{error}</p>}
    {library && <div className="p-4"><MediaLibrary imagesOnly onSelect={url => { editor.chain().focus().setImage({ src: url, alt: '' }).run(); setLibrary(false); }} /></div>}
    <EditorContent editor={editor} />
    <p className="text-xs text-black/60 p-3 border-t">Word-style editing. Imported documents may need layout adjustments; unsupported email fonts use fallbacks.</p>
  </div>;
}
