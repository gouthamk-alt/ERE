import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac, createHash } from 'node:crypto';
import sharp from 'sharp';
import { createMediaHandler } from './media.mjs';
import { createMarketingService } from './marketing.mjs';
import { cleanRichText } from './rich-text.mjs';
import { createContentHandler, initialContent } from './content.mjs';
import { createEnquiryService } from './enquiries.mjs';

const origin='https://ere.example', now=()=>Date.parse('2026-11-22T10:00:00Z');
function memory(){const entries=new Map();let version=0;return{entries,async getWithMetadata(key){return structuredClone(entries.get(key)||null);},async setJSON(key,data,options={}){const old=entries.get(key);if((options.onlyIfNew&&old)||(options.onlyIfMatch&&old?.etag!==options.onlyIfMatch))return{modified:false};const etag=String(++version);entries.set(key,{data:structuredClone(data),etag});return{modified:true,etag};},async list({prefix}){return{blobs:[...entries.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))};},async delete(key){entries.delete(key);}};}
const request=(path,data,extra={})=>new Request(origin+path,data===undefined?{headers:extra}:{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
const deny=async()=>Response.json({error:'Sign in'},{status:401});
const subscriber=(extra={})=>({id:randomUUID(),name:'Test contact',email:`test-${randomUUID()}@example.com`,phone:'0400000000',tags:'Buyer',notes:'',subscription:'subscribed',consentSource:'Client permission records',consentDate:'2026-11-01',...extra});
const newsletter=(extra={})=>({id:randomUUID(),title:'Test newsletter',subject:'Perth update',preheader:'News from our team',bodyHtml:'<h1 style="font-family:Georgia;color:#333333">Perth update</h1><p>Hello <strong>Perth</strong>.</p><img src="/api/media/00000000-0000-0000-0000-000000000000">',attachmentUrl:'',...extra});
function marketing(options={}){
 const store=options.store||memory(),sent=[];
 const env={NEWSLETTER_EMAIL_ENABLED:'true',RESEND_API_KEY:'fake-key',NEWSLETTER_FROM:'ERE <news@example.com>',NEWSLETTER_SITE_URL:origin,NEWSLETTER_POSTAL_ADDRESS:'Test agency address',NEWSLETTER_UNSUBSCRIBE_SECRET:'test-secret-'.repeat(4),NEWSLETTER_WEBHOOK_SECRET:'whsec_'+Buffer.from('fake-webhook-secret').toString('base64'),...options.env};
 const service=createMarketingService({store,authorize:async()=>null,preview:options.preview??false,env,now,pause:async()=>{},fetcher:async(_url,init)=>{sent.push({payload:JSON.parse(init.body),headers:init.headers});return Response.json({id:'accepted-'+sent.length});},...options});
 const read=async collection=>(await service.handle(request('/api/admin/'+collection))).json();
 const save=async(collection,item)=>service.handle(request('/api/admin/'+collection,{action:'save',item,revision:(await read(collection)).revision}));
 const review=async draft=>(await service.handle(request('/api/admin/newsletters',{action:'review',id:draft.id}))).json();
 const queue=async(draft,review,sendId=randomUUID())=>service.handle(request('/api/admin/newsletters',{action:'send',id:draft.id,fingerprint:review.fingerprint,sendId}));
 return{store,service,sent,env,read,save,review,queue};
}

test('rich text strips scripts, unsafe URLs and CSS while preserving formatting and tables',()=>{
 const html=cleanRichText('<script>alert(1)</script><p onclick="alert(1)" style="font-family:Georgia;font-size:24px;color:#123456;background-image:url(https://tracker.example)">Hello <strong>team</strong><a href="javascript:alert(1)">link</a></p><table><tr><td>Cell</td></tr></table><img src="data:text/html,evil">');
 assert.doesNotMatch(html,/script|onclick|javascript:|background-image|data:text/i);assert.match(html,/font-family:Georgia/);assert.match(html,/<table>/);assert.match(html,/<strong>team/);
});

test('only admins upload/list media; images are decoded and optimised, public files survive handler restarts',async()=>{
 const store=memory(),image=await sharp({create:{width:8,height:6,channels:4,background:'#ffffff'}}).png().toBuffer();
 const blocked=createMediaHandler({store,authorize:deny});
 assert.equal((await blocked(request('/api/admin/media'))).status,401);
 assert.equal((await blocked(request('/api/admin/media',{name:'test.png',base64:image.toString('base64')}))).status,401);
 const handler=createMediaHandler({store,authorize:async()=>null});
 const response=await handler(request('/api/admin/media',{name:'test.png',base64:image.toString('base64')}));
 assert.equal(response.status,201);const {item}=await response.json();
 const saved=await blocked(request(item.url));assert.equal(saved.headers.get('content-type'),'image/webp');
 const metadata=await sharp(Buffer.from(await saved.arrayBuffer())).metadata();assert.equal(metadata.width,8);assert.equal(metadata.height,6);
 assert.equal((await(await handler(request('/api/admin/media'))).json()).items.length,1);
});

test('rejects fake images/fonts, oversized uploads and cross-origin writes; PDFs download rather than execute',async()=>{
 const handler=createMediaHandler({store:memory(),authorize:async()=>null});
 for(const data of [{base64:Buffer.from('<svg onload="alert(1)">').toString('base64')},{kind:'font',base64:Buffer.from('fake WOFF2 font').toString('base64')}])assert.equal((await handler(request('/api/admin/media',data))).status,400);
 assert.equal((await handler(request('/api/admin/media',{base64:'a'.repeat(4300001)}))).status,413);
 assert.equal((await handler(request('/api/admin/media',{}, {Origin:'https://attacker.example'}))).status,403);
 const upload=await handler(request('/api/admin/media',{kind:'pdf',name:'newsletter.pdf',base64:Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}));
 const item=(await upload.json()).item;assert.match((await handler(request(item.url))).headers.get('content-disposition'),/attachment/);
});

test('legacy website content gains editable team profiles without replacing existing listings/blog edits',async()=>{
 const store=memory();await store.setJSON('website-content-v1',{listings:initialContent.listings,blogPosts:[{...initialContent.blogPosts[0],title:'Existing live edit'}]});
 const handler=createContentHandler({store,authorize:async()=>null});
 let data=await(await handler(request('/api/content'))).json();assert.equal(data.blogPosts[0].title,'Existing live edit');assert.equal(data.teamMembers.length,7);
 const member={...data.teamMembers[0],id:randomUUID(),name:'Test Agent',email:'agent@example.com'};
 let response=await handler(request('/api/admin/content',{collection:'teamMembers',action:'add',item:member,revision:data.revision}));assert.equal(response.status,200);data=await response.json();
 assert.equal(data.teamMembers[0].name,'Test Agent');
 response=await handler(request('/api/admin/content',{collection:'teamMembers',action:'delete',id:data.listings[0].agentId,revision:data.revision}));assert.equal(response.status,400);
});

test('contacts and newsletter drafts are private and concurrent edits cannot overwrite newer changes',async()=>{
 const t=marketing({authorize:deny});assert.equal((await t.service.handle(request('/api/admin/contacts'))).status,401);
 const active=marketing(),contact=subscriber();await active.save('contacts',contact);
 const data=await active.read('contacts');assert.equal(data.items.length,1);
 assert.equal((await active.service.handle(request('/api/admin/contacts',{action:'save',item:{...contact,name:'Changed'},revision:'stale'}))).status,409);
 assert.equal((await active.save('contacts',subscriber({email:contact.email})) ).status,409);
});

test('permission evidence is required; imports skip existing emails and preserve unsubscribe suppression',async()=>{
 const t=marketing();assert.equal((await t.save('contacts',subscriber({consentSource:''}))).status,400);
 const existing=subscriber();await t.save('contacts',existing);
 const data=await t.read('contacts');
 await t.service.handle(request('/api/admin/contacts',{action:'import',revision:data.revision,items:[subscriber({email:existing.email}),subscriber({subscription:'unknown',consentSource:'',consentDate:''})]}));
 assert.equal((await t.read('contacts')).items.length,2);
});

test('review includes only eligible subscribers and blocks stale content or changed recipient lists',async()=>{
 const t=marketing(),draft=newsletter();await t.save('newsletters',draft);await t.save('contacts',subscriber());await t.save('contacts',subscriber({subscription:'unknown',consentSource:'',consentDate:''}));await t.save('contacts',subscriber({subscription:'unsubscribed'}));
 const review=await t.review(draft);assert.equal(review.count,1);assert.match(review.html,/Unsubscribe/);assert.match(review.html,/https:\/\/ere.example\/api\/media/);
 await t.save('contacts',subscriber());assert.equal((await t.queue(draft,review)).status,409);
});

test('preview campaigns never call a real sending provider; production requires full configuration',async()=>{
 const t=marketing({preview:true}),draft=newsletter();await t.save('newsletters',draft);await t.save('contacts',subscriber());
 const response=await t.queue(draft,await t.review(draft));assert.equal((await response.json()).status,'preview');await t.service.worker();assert.equal(t.sent.length,0);
 const prod=marketing({env:{NEWSLETTER_EMAIL_ENABLED:'false'}});await prod.save('newsletters',draft);await prod.save('contacts',subscriber());assert.equal((await prod.queue(draft,await prod.review(draft))).status,503);
});

test('campaign sends individually, repeated queue requests are idempotent and recipients are not exposed to each other',async()=>{
 const t=marketing(),draft=newsletter();await t.save('newsletters',draft);await t.save('contacts',subscriber());await t.save('contacts',subscriber());
 const review=await t.review(draft),id=randomUUID();await t.queue(draft,review,id);await t.queue(draft,review,id);await t.service.worker();await t.service.worker();
 assert.equal(t.sent.length,2);assert.ok(t.sent.every(item=>item.payload.to.length===1));assert.notEqual(t.sent[0].payload.to[0],t.sent[1].payload.to[0]);assert.match(t.sent[0].payload.headers['List-Unsubscribe'],/\/api\/newsletter\/unsubscribe/);
});

test('signed unsubscribe supports confirmation and one-click; deleting/re-adding contact cannot bypass opt-out',async()=>{
 const t=marketing(),draft=newsletter(),contact=subscriber();await t.save('newsletters',draft);await t.save('contacts',contact);await t.queue(draft,await t.review(draft));await t.service.worker();
 const link=t.sent[0].payload.headers['List-Unsubscribe'].slice(1,-1);
 assert.equal((await t.service.handle(new Request(link))).status,200);assert.equal((await t.read('contacts')).items[0].subscription,'subscribed');
 let data=await t.read('contacts');await t.service.handle(request('/api/admin/contacts',{action:'delete',id:contact.id,revision:data.revision}));
 await t.save('contacts',subscriber({email:contact.email}));
 assert.equal((await t.service.handle(new Request(link,{method:'POST',body:'List-Unsubscribe=One-Click'}))).status,200);
 assert.equal((await t.read('contacts')).items[0].subscription,'unsubscribed');
 await t.save('contacts',(await t.read('contacts')).items.map(item=>({...item,subscription:'subscribed'}))[0]);assert.equal((await t.read('contacts')).items[0].subscription,'unsubscribed');
 assert.equal((await t.service.handle(new Request(link.replace(/token=[^&]+/,'token=invalid'),{method:'POST'}))).status,400);
});

test('unsubscribe after queueing is checked before each send',async()=>{
 const t=marketing(),draft=newsletter(),contact=subscriber();await t.save('newsletters',draft);await t.save('contacts',contact);await t.queue(draft,await t.review(draft));
 await t.save('contacts',{...contact,subscription:'unsubscribed'});await t.service.worker();assert.equal(t.sent.length,0);
 const data=await t.read('newsletters');assert.equal(data.campaigns[0].skipped,1);
});

test('bounce webhook requires signature and suppresses future campaigns',async()=>{
 const t=marketing(),contact=subscriber();await t.save('contacts',contact);
 const body=JSON.stringify({type:'email.bounced',data:{to:[contact.email]}}),stamp=String(now()/1000),id='test-event';
 const path='/api/newsletter/webhook';assert.equal((await t.service.handle(new Request(origin+path,{method:'POST',body}))).status,400);
 const signature=createHmac('sha256',Buffer.from(t.env.NEWSLETTER_WEBHOOK_SECRET.slice(6),'base64')).update(`${id}.${stamp}.${body}`).digest('base64');
 assert.equal((await t.service.handle(new Request(origin+path,{method:'POST',body,headers:{'svix-id':id,'svix-timestamp':stamp,'svix-signature':`v1,${signature}`}}))).status,200);
 assert.equal((await t.read('contacts')).items[0].suppressed,true);
 const draft=newsletter();await t.save('newsletters',draft);assert.equal((await t.review(draft)).count,0);
});

test('CSV export neutralises formulas and handles quotes/newlines',async()=>{
 const {csvCell}=await import('../src/adminApi.ts');
 assert.equal(csvCell('  =SUM(1,2)'), '"\'  =SUM(1,2)"');assert.equal(csvCell('a"b\nc'),'"a""b\nc"');
});

test('website enquiries automatically save one contact per email, without treating the default newsletter choice as consent',async()=>{
 const t=marketing({preview:true}),store=memory();
 const enquiries=createEnquiryService({store,sender:{ready:false},preview:true,now,captureContact:(record,confirmed)=>t.service.captureEnquiryContact(record,confirmed)});
 const data={requestId:`${now()}-${randomUUID()}`,type:'General Contact',clientName:'Preview Enquirer',email:'incoming@example.com',phone:'0400000000',message:'Please contact me.',newsletterOptIn:true};
 const first=await enquiries.submit(request('/api/enquiries',data));assert.equal(first.status,201);const receipt=await first.json();assert.ok(receipt.newsletter.token);
 await enquiries.submit(request('/api/enquiries',{...data,requestId:`${now()}-${randomUUID()}`,clientName:'Different submitted name'}));
 const contacts=await t.read('contacts');assert.equal(contacts.items.length,1);assert.equal(contacts.items[0].subscription,'unknown');assert.equal(contacts.items[0].name,'Preview Enquirer');
 assert.equal((await enquiries.submit(request('/api/enquiries/subscribe',{...receipt.newsletter,token:'0'.repeat(64)}))).status,400);
});

test('explicit signup queues the selected edition once and includes the contact in future campaigns',async()=>{
 const t=marketing({preview:true}),draft=newsletter();await t.save('newsletters',draft);
 const collection=await t.read('newsletters');assert.equal((await t.service.handle(request('/api/admin/newsletters',{action:'welcome',id:draft.id,revision:collection.revision}))).status,200);
 const enquiries=createEnquiryService({store:memory(),sender:{ready:false},preview:true,now,captureContact:(record,confirmed)=>t.service.captureEnquiryContact(record,confirmed)});
 const data={requestId:`${now()}-${randomUUID()}`,type:'General Contact',clientName:'New Subscriber',email:'new-subscriber@example.com',phone:'',message:'Please contact me.',newsletterOptIn:true};
 const receipt=await(await enquiries.submit(request('/api/enquiries',data))).json();
 const confirmed=await(await enquiries.submit(request('/api/enquiries/subscribe',receipt.newsletter))).json();assert.equal(confirmed.subscribed,true);
 await enquiries.submit(request('/api/enquiries/subscribe',receipt.newsletter));
 assert.equal((await t.read('contacts')).items[0].subscription,'subscribed');assert.equal((await t.review(draft)).count,1);
 assert.equal((await t.read('newsletters')).campaigns.length,1);assert.equal((await t.read('newsletters')).campaigns[0].status,'preview');assert.equal(t.sent.length,0);
});

test('another website enquiry cannot silently resubscribe an opted-out contact',async()=>{
 const t=marketing({preview:true}),contact=subscriber({email:'opted-out@example.com',subscription:'unsubscribed'});await t.save('contacts',contact);
 const record={id:randomUUID(),reference:'ERE-TEST',createdAt:new Date(now()).toISOString(),enquiry:{clientName:'Enquirer',email:contact.email,phone:'',type:'General Contact',message:'Hello'}};
 const result=await t.service.captureEnquiryContact(record,true);assert.equal(result.subscribed,false);assert.equal((await t.read('contacts')).items[0].subscription,'unsubscribed');
});
