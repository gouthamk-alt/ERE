import { ConfirmAction } from './ConfirmAction';
import { useEffect, useState } from 'react';
import { adminApi, csvCell, downloadText, errorMessage } from '../adminApi';

export function parseCsv(source: string) {
  const rows: string[][] = []; let row: string[] = [], cell='', quoted=false;
  for(let index=0;index<source.length;index++){
    const char=source[index];
    if(char==='"'){if(quoted&&source[index+1]==='"'){cell+='"';index++;}else quoted=!quoted;}
    else if(char===','&&!quoted){row.push(cell);cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&source[index+1]==='\n')index++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';}
    else cell+=char;
  }
  if(quoted)throw new Error('CSV has an unclosed quoted field.');
  row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(value=>value.replace(/^\uFEFF/,'').trim());
  if(!headers.includes('email')||!headers.includes('name'))throw new Error('CSV needs name and email column headers.');
  if(rows.length>1000)throw new Error('Import up to 1,000 contacts at a time.');
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]||''])));
}
const blank=()=>({id:crypto.randomUUID(),name:'',email:'',phone:'',tags:'',notes:'',subscription:'unknown',consentSource:'',consentDate:''});
export function ContactsAdmin(){
  const [data,setData]=useState<any>({items:[],revision:''}),[form,setForm]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[imports,setImports]=useState<any[]>([]),[importConsent,setImportConsent]=useState(false),[source,setSource]=useState(''),[consentDate,setConsentDate]=useState('');
  async function refresh(){try{setData(await adminApi('/api/admin/contacts'));setError('');}catch(e){setError(errorMessage(e));}}
  useEffect(()=>{void refresh();},[]);
  async function mutate(action:string,extra:any){setBusy(true);setError('');try{await adminApi('/api/admin/contacts',{action,revision:data.revision,...extra});await refresh();return true;}catch(e){setError(errorMessage(e));return false;}finally{setBusy(false);}}
  const filtered=data.items.filter((item: any) =>`${item.name} ${item.email} ${item.phone} ${item.tags}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-6"><div className="flex flex-wrap gap-4 justify-between items-center"><h2 className="text-3xl font-bold">Contacts</h2><div className="flex flex-wrap gap-3"><button className="admin-action" onClick={()=>setForm(blank())}>Add contact</button><button className="admin-action" onClick={()=>{const columns=['name','email','phone','tags','subscription','consentSource','consentDate','notes'];downloadText('ere-contacts.csv','\uFEFF'+[columns.map(csvCell).join(','),...data.items.map((item: any) =>columns.map(key=>csvCell(item[key])).join(','))].join('\r\n'));}}>Export all contacts as CSV</button><label className="admin-action">Import CSV<input className="sr-only" type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1000000)throw new Error('Use a CSV under 1 MB.');setImports(parseCsv(await file.text()));setError('');}catch(error){setError(errorMessage(error));}finally{e.target.value='';}}}/></label><button className="underline" onClick={()=>void refresh()}>Refresh</button></div></div>
    <p className="text-sm opacity-65">Contacts are private. Only confirmed subscribers receive newsletters; unsubscribes and bounced addresses remain excluded.</p>
    <p className="text-sm opacity-65" role="status">Brevo website list: {data.brevoConfigured?'configured':'awaiting setup'}{data.brevoPending?` · ${data.brevoPending} contact update${data.brevoPending===1?'':'s'} pending`:''}. Campaigns and open/click reports are managed in Brevo.</p>
    {error&&<p role="alert" className="border border-white/30 p-4">{error}</p>}
    {imports.length>0&&<div className="border border-white/30 p-5 space-y-4"><h3 className="font-bold">Review CSV import: {imports.length} contacts</h3><p className="text-sm">Existing email addresses are skipped; nothing is overwritten.</p><div className="overflow-auto max-h-40 text-xs">{imports.slice(0,10).map((item,index)=><p key={index}>{item.name} · {item.email}</p>)}</div>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={importConsent} onChange={e=>setImportConsent(e.target.checked)}/>These contacts have recorded permission to receive newsletters</label>
      {importConsent&&<div className="grid sm:grid-cols-2 gap-4"><label className="admin-label">Permission record/source<input className="admin-input" value={source} onChange={e=>setSource(e.target.value)} placeholder="e.g. Existing client newsletter opt-in records"/></label><label className="admin-label">Permission record date<input type="text" placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" className="admin-input" value={consentDate} onChange={e=>setConsentDate(e.target.value)}/></label></div>}
      <div className="flex gap-4"><button disabled={busy||importConsent&&(!source||!consentDate)} className="admin-action" onClick={async()=>{const items=imports.map((item: any) =>({...blank(),name:item.name,email:item.email,phone:item.phone||'',tags:item.tags||'',notes:item.notes||'',subscription:item.subscription==='unsubscribed'?'unsubscribed':importConsent?'subscribed':'unknown',consentSource:importConsent?(item.consentSource||source):'',consentDate:importConsent?(item.consentDate||consentDate):''}));if(await mutate('import',{items}))setImports([]);}}>Confirm import</button><button onClick={()=>setImports([])}>Cancel import</button></div></div>}
    {form&&<form className="border border-white/30 p-5 grid sm:grid-cols-2 gap-4" onSubmit={async e=>{e.preventDefault();if(await mutate('save',{item:form}))setForm(null);}}>
      <h3 className="sm:col-span-2 font-bold">Contact details</h3>
      {['name','email','phone','tags','notes'].map(key=><label className="admin-label" key={key}>{key}<input className="admin-input" value={form[key]} type={key==='email'?'email':'text'} required={['name','email'].includes(key)} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      <label className="admin-label">Newsletter status<select className="admin-input" value={form.subscription} onChange={e=>setForm({...form,subscription:e.target.value})}><option value="unknown">Not subscribed / permission unknown</option><option value="subscribed">Confirmed subscriber</option><option value="unsubscribed">Unsubscribed</option></select></label>
      {form.subscription==='subscribed'&&<><label className="admin-label">Permission source / record<input className="admin-input" required value={form.consentSource} onChange={e=>setForm({...form,consentSource:e.target.value})}/></label><label className="admin-label">Permission date<input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" className="admin-input" required value={form.consentDate} onChange={e=>setForm({...form,consentDate:e.target.value})}/></label></>}
      <div className="sm:col-span-2 flex gap-4"><button disabled={busy} className="admin-action">Save contact</button><button type="button" onClick={()=>setForm(null)}>Cancel</button></div></form>}
    <input className="admin-input max-w-lg" aria-label="Search contacts" placeholder="Search name, email, phone or tags" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="overflow-auto"><table className="admin-table"><thead><tr><th>Name</th><th>Email / phone</th><th>Newsletter status</th><th>Actions</th></tr></thead><tbody>{filtered.map((item: any) =><tr key={item.id}><td>{item.name}<small className="block opacity-60">{item.tags}</small></td><td>{item.email}<small className="block opacity-60">{item.phone}</small></td><td>{item.subscription}{item.suppressed && <small className="block opacity-60">Delivery suppressed</small>}</td><td><button className="underline mr-4" onClick={()=>setForm(item)}>Edit {item.name}</button><ConfirmAction label="Delete" message={`Delete ${item.name}?`} onConfirm={()=>mutate('delete',{id:item.id})}/></td></tr>)}</tbody></table></div>
    {!data.items.length&&<p className="text-sm opacity-65">No contacts saved yet. Add a contact or import your existing list.</p>}
  </section>;
}
