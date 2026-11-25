import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cleanRichText } from './rich-text.mjs';
import { syncBrevoContact, createBrevoCampaign, cleanCampaignHtml } from './brevo.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const emailValid = email => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const text = (value, limit = 300) => { if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Please check the text fields.'); return value.trim(); };
const uuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
export function contactRecord(input, previous, now) {
  const item = { id: input.id, name: text(input.name, 150), email: text(input.email).toLowerCase(), phone: text(input.phone || '', 60), notes: text(input.notes || '', 3000), tags: text(input.tags || '', 300), subscription: input.subscription, consentSource: text(input.consentSource || '', 500), consentDate: text(input.consentDate || '', 40), updatedAt: new Date(now()).toISOString() };
  if (!uuid(item.id) || !item.name || !emailValid(item.email) || !['subscribed','unsubscribed','unknown'].includes(item.subscription)) throw new Error('Provide a name, valid email and subscription status.');
  if (item.subscription === 'subscribed' && (!item.consentSource || !/^\d{4}-\d{2}-\d{2}$/.test(item.consentDate) || new Date(item.consentDate).toISOString().slice(0,10)!==item.consentDate || item.consentDate>new Date(now()).toISOString().slice(0,10))) throw new Error('Record a valid source and past/current date of newsletter permission.');
  return { ...item, createdAt: previous?.createdAt || item.updatedAt };
}
export function newsletterRecord(input, previous, now) {
  const item = { id: input.id, title: text(input.title, 200), subject: text(input.subject, 200), preheader: text(input.preheader || '', 200), bodyHtml: cleanRichText(input.bodyHtml), attachmentUrl: text(input.attachmentUrl || '', 2048), updatedAt: new Date(now()).toISOString() };
  if (!uuid(item.id) || !item.title || !item.subject || !item.bodyHtml.trim() || /[\r\n]/.test(item.subject)) throw new Error('Provide a title, subject and newsletter content.');
  if (item.attachmentUrl && !/^\/api\/media\/[a-f0-9-]{36}$/.test(item.attachmentUrl)) throw new Error('Choose a stored PDF from the media library.');
  return { ...item, createdAt: previous?.createdAt || item.updatedAt };
}
export function createMarketingService({ store, authorize, preview = false, env = process.env, fetcher = fetch, now = Date.now, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const get = key => store.getWithMetadata(key, { type: 'json' });
  const configured = Boolean(env.NEWSLETTER_EMAIL_ENABLED === 'true' && env.RESEND_API_KEY && env.NEWSLETTER_FROM && env.NEWSLETTER_POSTAL_ADDRESS && env.NEWSLETTER_UNSUBSCRIBE_SECRET?.length >= 32 && /^https:\/\//.test(env.NEWSLETTER_SITE_URL || '') && env.NEWSLETTER_WEBHOOK_SECRET);
  const brevoConfigured = Boolean(!preview && env.BREVO_API_KEY && /^\d+$/.test(env.BREVO_LIST_ID || '') && Number(env.BREVO_LIST_ID) > 0);
  const brevoCampaignLists = [Number(env.BREVO_LIST_ID), Number(env.BREVO_LEGACY_LIST_ID || 7)];
  const brevoSender = env.BREVO_CAMPAIGN_SENDER || 'wendy@exceptionalrealestate.com.au';
  const brevoCampaignConfigured = brevoConfigured && brevoCampaignLists.every(id => Number.isSafeInteger(id) && id > 0);
  const queueBrevo = email => store.setJSON(`brevo-sync/${randomUUID()}`, { email, queuedAt: new Date(now()).toISOString() }, {onlyIfNew:true});
  const signature = id => createHmac('sha256', env.NEWSLETTER_UNSUBSCRIBE_SECRET || '').update(`unsubscribe:${id}`).digest('hex');
  async function readCollection(key) {
    let entry = await get(key);
    if (!entry) { await store.setJSON(key, { items: [] }, { onlyIfNew: true }); entry = await get(key); }
    if (!entry || !Array.isArray(entry.data.items)) throw new Error('Storage unavailable.');
    return entry;
  }
  async function eligible() {
    const contacts = (await readCollection('contacts')).data.items;
    const blocked = new Set((await store.list({prefix:'suppression/'})).blobs.map(blob=>blob.key));
    const results = contacts.filter(contact=>contact.subscription==='subscribed'&&contact.consentSource&&contact.consentDate&&!blocked.has(`suppression/${hash(contact.email)}`));
    return results.sort((a,b)=>a.id.localeCompare(b.id));
  }
  async function audience(id) {
    const draft = (await readCollection('newsletters')).data.items.find(item=>item.id===id);
    if (!draft) throw new Error('Newsletter not found.');
    const contacts = await eligible();
    return { draft, contacts, fingerprint: hash(JSON.stringify({ draft, contacts: contacts.map(item=>[item.id,item.email,item.updatedAt]) })) };
  }
  async function suppress(email, reason) { if(emailValid(email)) await store.setJSON(`suppression/${hash(email.toLowerCase())}`, { reason, at: new Date(now()).toISOString() }); }
  async function captureEnquiryContact(record, confirmed = false) {
    const enquiry=record.enquiry, email=enquiry.email.trim().toLowerCase();
    let savedContact;
    for(let attempt=0;attempt<6;attempt++){
      const entry=await readCollection('contacts'),previous=entry.data.items.find(item=>item.email===email);
      const suppressed=Boolean(await get(`suppression/${hash(email)}`));
      const contact=previous?{...previous}:{id:randomUUID(),name:enquiry.clientName,email,phone:enquiry.phone||'',tags:'Website enquiry',notes:`${enquiry.type}: ${enquiry.message}`.slice(0,3000),subscription:'unknown',consentSource:'',consentDate:'',createdAt:record.createdAt};
      if(!contact.phone&&enquiry.phone)contact.phone=enquiry.phone;
      contact.updatedAt=new Date(now()).toISOString();
      contact.lastEnquiryReference=record.reference;
      if(confirmed&&!suppressed&&contact.subscription!=='unsubscribed'&&contact.subscription!=='subscribed'){
        contact.subscription='subscribed';contact.consentDate=new Date(now()).toISOString().slice(0,10);contact.consentSource=`Website newsletter confirmation: ${record.reference}`;
      }
      if(suppressed)contact.subscription='unsubscribed';
      const items=previous?entry.data.items.map(item=>item.id===contact.id?contact:item):[contact,...entry.data.items];
      if(items.length>5000)throw new Error('Contact limit reached.');
      if((await store.setJSON('contacts',{items},{onlyIfMatch:entry.etag})).modified){savedContact=contact;break;}
    }
    if(!savedContact)throw new Error('Contact save could not be confirmed.');
    if(confirmed && savedContact.subscription==='subscribed') await queueBrevo(savedContact.email);
    if(confirmed&&savedContact.subscription==='subscribed'&&!brevoCampaignConfigured){
      const edition=await get('welcome-newsletter');
      if(edition){
        const id=hash(`welcome:${savedContact.id}`).slice(0,32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
        await store.setJSON(`campaigns/${id}`,{id,kind:'welcome',fingerprint:hash(`welcome:${savedContact.id}`),draft:edition.data.draft,recipients:[{id:savedContact.id,email:savedContact.email,status:'pending'}],status:preview?'preview':configured?'queued':'waiting-for-setup',createdAt:new Date(now()).toISOString(),leaseUntil:0},{onlyIfNew:true});
      }
    }
    return {subscribed:savedContact.subscription==='subscribed',suppressed:savedContact.subscription==='unsubscribed'};
  }
  function htmlEmail(draft, contact, site) {
    const tokenId=`${contact.id}-${hash(contact.email||'preview@example.com').slice(0,16)}`;
    const unsubscribe = `${site}/api/newsletter/unsubscribe?id=${tokenId}&token=${signature(tokenId)}`;
    const escape = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const body = cleanRichText(draft.bodyHtml).replace(/(src|href)="(\/[^"\s]*)"/g, (_match, attribute, path) => `${attribute}="${escape(new URL(path,site).href)}"`);
    const attachment = draft.attachmentUrl ? `<p><a href="${escape(new URL(draft.attachmentUrl,site).href)}">Download newsletter PDF</a></p>` : '';
    return { unsubscribe, tokenId, html: `<!doctype html><html><body style="margin:0;background:#ededed;color:#000;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(draft.preheader)}</div><div style="max-width:640px;margin:auto;padding:28px;background:#fff">${body}${attachment}<hr><p style="font-size:12px;color:#555">Exceptional Real Estate<br>${escape(env.NEWSLETTER_POSTAL_ADDRESS || 'Office address will be configured before sending.')}<br><a href="${escape(unsubscribe)}">Unsubscribe</a></p></div></body></html>` };
  }
  async function runCampaign(key) {
    let entry = await get(key); if (!entry || preview || !configured) return;
    let job = entry.data;
    if (job.status !== 'queued' || job.leaseUntil > now()) return;
    if (now()-Date.parse(job.createdAt)>18*3600000) { job.status='review'; await store.setJSON(key,job,{onlyIfMatch:entry.etag}); return; }
    let revision = (await store.setJSON(key,{...job,leaseUntil:now()+120000},{onlyIfMatch:entry.etag}));
    if (!revision.modified) return;
    job.leaseUntil=now()+120000;
    const started=Date.now(); let sent=0;
    for (const recipient of job.recipients) {
      if(recipient.status!=='pending' || sent>=20 || Date.now()-started>20000)continue;
      const latest=(await readCollection('contacts')).data.items.find(item=>item.id===recipient.id);
      if(!latest || latest.email!==recipient.email || latest.subscription!=='subscribed' || await get(`suppression/${hash(recipient.email)}`)){recipient.status='skipped';continue;}
      const {html,unsubscribe,tokenId}=htmlEmail(job.draft,latest,env.NEWSLETTER_SITE_URL.replace(/\/$/,''));
      await store.setJSON(`unsubscribe/${tokenId}`,{email:recipient.email},{onlyIfNew:true});
      // Freeze payload for retries so provider idempotency is preserved after a status-write failure.
      recipient.payload ??= { from:env.NEWSLETTER_FROM,to:[recipient.email],subject:job.draft.subject,html,headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'} };
      const frozen=await store.setJSON(key,job,{onlyIfMatch:revision.etag}); if(!frozen.modified)return; revision=frozen;
      try {
        const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`ere-newsletter/${job.id}/${recipient.id}`},body:JSON.stringify(recipient.payload)});
        if(response.status===429)break;
        if(!response.ok){if(response.status<500)recipient.status='review';break;}
        const result=await response.json(); if(!result.id)break;
        recipient.status='accepted'; recipient.providerId=result.id; delete recipient.payload; sent++;
      } catch { break; }
      const saved=await store.setJSON(key,job,{onlyIfMatch:revision.etag}); if(!saved.modified)return; revision=saved;
      await pause(600);
    }
    job.status=job.recipients.some(item=>item.status==='pending')?'queued':job.recipients.some(item=>item.status==='review')?'review':'complete'; job.leaseUntil=0;
    await store.setJSON(key,job,{onlyIfMatch:revision.etag});
  }
  async function worker() {
    if(brevoConfigured){
      const pending=(await store.list({prefix:'brevo-sync/'})).blobs.slice(0,20);
      for(const blob of pending){
        const job=await get(blob.key);if(!job)continue;
        const contact=(await readCollection('contacts')).data.items.find(item=>item.email===job.data.email);
        const blocked=Boolean(await get(`suppression/${hash(job.data.email)}`));
        try {
          const result=await syncBrevoContact({email:job.data.email,subscription:contact?.subscription==='subscribed'&&!blocked?'subscribed':'unsubscribed',apiKey:env.BREVO_API_KEY,listId:env.BREVO_LIST_ID,fetcher});
          if(result.status==='suppressed')await suppress(job.data.email,'brevo-opt-out');
          await store.delete(blob.key);
        }catch{continue;}
      }
    }
    if(preview||!configured)return;
    const {blobs}=await store.list({prefix:'campaigns/'});
    for(const blob of blobs){let entry=await get(blob.key);if(entry?.data.status==='waiting-for-setup'){const result=await store.setJSON(blob.key,{...entry.data,status:'queued',createdAt:new Date(now()).toISOString()},{onlyIfMatch:entry.etag});if(result.modified)entry=await get(blob.key);}if(entry?.data.status==='queued'){await runCampaign(blob.key);return;}}
  }
  async function publicRoute(request) {
    const url=new URL(request.url);
    if(url.pathname==='/api/newsletter/brevo-webhook') {
      if(request.method!=='POST')return reply({error:'Not allowed'},405);
      const supplied=request.headers.get('authorization')||'',expected=`Bearer ${env.BREVO_WEBHOOK_SECRET||''}`;
      if(!env.BREVO_WEBHOOK_SECRET||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return reply({error:'Not allowed'},403);
      const raw=await request.text();if(raw.length>100000)return reply({error:'Invalid event'},400);
      let event;try{event=JSON.parse(raw);}catch{return reply({error:'Invalid event'},400);}
      for(const item of Array.isArray(event)?event:[event]){
        if(['unsubscribe','spam','hard_bounce','hardBounce'].includes(item?.event)&&emailValid(item.email))await suppress(item.email,'brevo-'+item.event);
      }
      return reply({received:true});
    }
    if(url.pathname==='/api/newsletter/webhook') {
      if(request.method!=='POST')return reply({error:'Not allowed'},405);
      if(!env.NEWSLETTER_WEBHOOK_SECRET)return reply({error:'Unavailable'},503);
      const raw=await request.text(), id=request.headers.get('svix-id')||'', stamp=request.headers.get('svix-timestamp')||'';
      if(raw.length>100000||!id||!/^\d+$/.test(stamp)||Math.abs(now()/1000-Number(stamp))>300)return reply({error:'Invalid signature'},400);
      const key=Buffer.from(env.NEWSLETTER_WEBHOOK_SECRET.replace(/^whsec_/,''),'base64');
      const expected=createHmac('sha256',key).update(`${id}.${stamp}.${raw}`).digest();
      const valid=(request.headers.get('svix-signature')||'').split(' ').some(part=>{const [version,signature]=part.split(',');if(version!=='v1')return false;const actual=Buffer.from(signature||'','base64');return actual.length===expected.length&&timingSafeEqual(actual,expected);});
      if(!valid)return reply({error:'Invalid signature'},400);
      const event=JSON.parse(raw);
      if(['email.bounced','email.complained'].includes(event.type))for(const email of event.data?.to||[])await suppress(email,event.type);
      return reply({received:true});
    }
    const id=url.searchParams.get('id'),token=url.searchParams.get('token')||'';
    if(!env.NEWSLETTER_UNSUBSCRIBE_SECRET||!id||!/^[a-f0-9-]{36}-[a-f0-9]{16}$/.test(id)||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(token),Buffer.from(signature(id))))return reply({error:'Invalid unsubscribe link.'},400);
    if(request.method==='POST'){
      for(let attempt=0;attempt<5;attempt++){
        const target=await get(`unsubscribe/${id}`);
        if(!target)return reply({error:'Unsubscribe link not found.'},404);
        await suppress(target.data.email,'unsubscribe');
        const entry=await readCollection('contacts');
        const next={items:entry.data.items.map(item=>item.email===target.data.email?{...item,subscription:'unsubscribed',updatedAt:new Date(now()).toISOString()}:item)};
        if((await store.setJSON('contacts',next,{onlyIfMatch:entry.etag})).modified) { await queueBrevo(target.data.email); return new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribed</title><body style="background:#000;color:#fff;font-family:Arial;padding:40px"><h1>You’re unsubscribed.</h1><p>You will no longer receive our newsletters.</p></body>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store'}}); }
      }
      return reply({error:'Please try again.'},503);
    }
    if(request.method!=='GET')return reply({error:'Not allowed'},405);
    return new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribe</title><body style="background:#000;color:#fff;font-family:Arial;padding:40px"><h1>Exceptional Real Estate</h1><p>Stop receiving our newsletters?</p><form method="post"><button style="padding:12px">Unsubscribe</button></form></body>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  async function handle(request,context={}) {
    try {
      const url=new URL(request.url);
      if(url.pathname.startsWith('/api/newsletter/'))return await publicRoute(request);
      const denied=await authorize(request,context); if(denied)return denied;
      const collection=url.pathname.endsWith('/contacts')?'contacts':'newsletters';
      if(request.method==='GET'){
        const entry=await readCollection(collection);
        if(collection==='contacts'){
          const blocked=new Set((await store.list({prefix:'suppression/'})).blobs.map(blob=>blob.key));
          const pending=(await store.list({prefix:'brevo-sync/'})).blobs.length;
          return reply({items:entry.data.items.map(item=>({...item,suppressed:blocked.has(`suppression/${hash(item.email)}`)})),revision:entry.etag,brevoConfigured,brevoPending:pending});
        }
        const {blobs}=await store.list({prefix:'campaigns/'}), campaigns=[];
        for(const blob of blobs.slice(-100)){const record=await get(blob.key);if(record){const job=record.data;campaigns.push({id:job.id,title:job.draft.title,status:job.status,createdAt:job.createdAt,total:job.recipients.length,accepted:job.recipients.filter(item=>item.status==='accepted').length,skipped:job.recipients.filter(item=>item.status==='skipped').length});}}
        const welcome=await get('welcome-newsletter');
        const brevoDrafts=[];
        for(const blob of (await store.list({prefix:'brevo-campaigns/'})).blobs.slice(-50)){const record=await get(blob.key);if(record)brevoDrafts.push(record.data);}
        return reply({...entry.data,revision:entry.etag,campaigns,preview,configured,welcome:welcome?.data.draft.title||null,brevoCampaignConfigured,brevoDrafts,brevoCampaignLists});
      }
      if(request.method!=='POST'||request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'Request not allowed.'},403);
      const raw=await request.text(); if(raw.length>1500000)return reply({error:'Import is too large.'},413);
      const input=JSON.parse(raw);
      if(collection==='newsletters'&&input.action==='welcome'){
        const current=await readCollection('newsletters');if(input.revision!==current.etag)return reply({error:'Drafts changed. Refresh before selecting the automatic edition.'},409);
        const edition=current.data.items.find(item=>item.id===input.id);
        if(!edition)return reply({error:'Newsletter not found.'},404);
        await store.setJSON('welcome-newsletter',{draft:edition,selectedAt:new Date(now()).toISOString()});
        return reply({saved:true});
      }
      if(collection==='newsletters'&&input.action==='review'){
        if(brevoCampaignConfigured){
          const draft=(await readCollection('newsletters')).data.items.find(item=>item.id===input.id);
          if(!draft)return reply({error:'Newsletter not found.'},404);
          const site=/^https:\/\//.test(env.NEWSLETTER_SITE_URL||'')?env.NEWSLETTER_SITE_URL:'https://www.exceptionalrealestate.com.au';
          return reply({subject:draft.subject,html:cleanCampaignHtml(draft,site),fingerprint:hash(JSON.stringify({draft,lists:brevoCampaignLists})),brevo:true,lists:brevoCampaignLists});
        }
        const result=await audience(input.id);
        const site=preview?url.origin:env.NEWSLETTER_SITE_URL;
        return reply({count:result.contacts.length,fingerprint:result.fingerprint,subject:result.draft.subject,html:htmlEmail(result.draft,result.contacts[0]||{id:'00000000-0000-0000-0000-000000000000'},site||url.origin).html,preview,configured});
      }
      if(collection==='newsletters'&&input.action==='brevoDraft'){
        if(!brevoCampaignConfigured)return reply({error:'Brevo campaign publishing is not configured.'},503);
        if(!uuid(input.sendId))return reply({error:'Invalid draft request ID.'},400);
        const key=`brevo-campaigns/${input.sendId}`,existing=await get(key);
        if(existing){if(existing.data.fingerprint!==input.fingerprint)return reply({error:'Newsletter changed.'},409);return reply(existing.data);}
        const draft=(await readCollection('newsletters')).data.items.find(item=>item.id===input.id);
        if(!draft)return reply({error:'Newsletter not found.'},404);
        const fingerprint=hash(JSON.stringify({draft,lists:brevoCampaignLists}));
        if(fingerprint!==input.fingerprint)return reply({error:'Newsletter changed. Review it again.'},409);
        const site=/^https:\/\//.test(env.NEWSLETTER_SITE_URL||'')?env.NEWSLETTER_SITE_URL:'https://www.exceptionalrealestate.com.au';
        const campaignId=await createBrevoCampaign({apiKey:env.BREVO_API_KEY,draft,listIds:brevoCampaignLists,sender:brevoSender,site,fetcher});
        const record={id:input.sendId,newsletterId:draft.id,title:draft.title,fingerprint,campaignId,status:'draft',createdAt:new Date(now()).toISOString()};
        await store.setJSON(key,record,{onlyIfNew:true});
        return reply(record,201);
      }
      if(collection==='newsletters'&&input.action==='send'){
        if(brevoCampaignConfigured)return reply({error:'Prepare this campaign in Brevo and send it there.'},409);
        if(!uuid(input.sendId))return reply({error:'Invalid campaign ID.'},400);
        const key=`campaigns/${input.sendId}`, existing=await get(key);
        if(existing){if(existing.data.fingerprint!==input.fingerprint)return reply({error:'Campaign changed.'},409);return reply({id:existing.data.id,status:existing.data.status});}
        if(!preview&&!configured)return reply({error:'Configure the newsletter sending service, sender, address, unsubscribe and bounce handling before sending.'},503);
        const result=await audience(input.id);
        if(result.fingerprint!==input.fingerprint)return reply({error:'Content or recipients changed. Review again before sending.'},409);
        if(!result.contacts.length)return reply({error:'There are no eligible subscribers.'},400);
        const job={id:input.sendId,fingerprint:input.fingerprint,draft:result.draft,recipients:result.contacts.map(item=>({id:item.id,email:item.email,status:'pending'})),status:preview?'preview':'queued',createdAt:new Date(now()).toISOString(),leaseUntil:0};
        await store.setJSON(key,job,{onlyIfNew:true});
        return reply({id:job.id,status:job.status},201);
      }
      const entry=await readCollection(collection);
      if(input.revision!==entry.etag)return reply({error:'Records changed in another session. Refresh before saving.'},409);
      const validator=collection==='contacts'?contactRecord:newsletterRecord;
      let items=[...entry.data.items];
      if(input.action==='delete')items=items.filter(item=>item.id!==input.id);
      else if(input.action==='save'){
        const before=items.find(item=>item.id===input.item.id), item=validator(input.item,before,now);
        if(collection==='contacts'&&items.some(other=>other.email===item.email&&other.id!==item.id))return reply({error:'A contact with this email already exists.'},409);
        if(collection==='contacts'&&await get(`suppression/${hash(item.email)}`))item.subscription='unsubscribed';
        items=before?items.map(old=>old.id===item.id?item:old):[item,...items];
      } else if(collection==='contacts'&&input.action==='import') {
        if(!Array.isArray(input.items)||input.items.length>1000)return reply({error:'Import up to 1,000 contacts at a time.'},400);
        for(const value of input.items){const old=items.find(item=>item.email===String(value.email).toLowerCase().trim());if(old)continue;const item=validator(value,null,now);if(await get(`suppression/${hash(item.email)}`))item.subscription='unsubscribed';items.push(item);}
      } else return reply({error:'Invalid action.'},400);
      if(items.length>5000)return reply({error:'This collection has reached its initial limit of 5,000 records.'},400);
      if(!(await store.setJSON(collection,{items},{onlyIfMatch:entry.etag})).modified)return reply({error:'Another edit was saved. Refresh and try again.'},409);
      if(collection==='contacts'){
        for(const item of items){
          const before=entry.data.items.find(previous=>previous.id===item.id);
          if((item.subscription==='subscribed'||before?.subscription==='subscribed')&&(before?.subscription!==item.subscription||before?.email!==item.email)){
            if(before?.email&&before.email!==item.email)await queueBrevo(before.email);
            await queueBrevo(item.email);
          }
        }
        for(const old of entry.data.items)if(old.subscription==='subscribed'&&!items.some(item=>item.id===old.id))await queueBrevo(old.email);
      }
      return reply({saved:true});
    }catch(error){return reply({error:error.message?.includes('Storage')?'Storage is temporarily unavailable.':error.message||'Action failed.'},400);}
  }
  return {handle,worker,captureEnquiryContact};
}
