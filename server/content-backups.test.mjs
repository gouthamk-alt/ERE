import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createContentHandler, initialContent, migrateImageUrls } from './content.mjs';
import { createContentBackups } from './content-backups.mjs';
import { createLocalContentStore } from './local-content-store.mjs';
import { createLocalEnquiryStore } from './local-enquiry-store.mjs';
import imageMigration from './image-migration.json' with {type:'json'};

async function fixture(t){
  const dir=await mkdtemp(path.join(tmpdir(),'ere-recovery-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const store=createLocalContentStore(dir),archive=createLocalEnquiryStore(path.join(dir,'backups'));
  const backups=createContentBackups(archive);
  const handler=createContentHandler({store,backups,authorize:async request=>request.headers.get('x-test-admin')==='yes'?null:Response.json({error:'Sign in'},{status:401})});
  const call=(endpoint,body,extra={})=>handler(new Request(`https://ere.example/api/admin/${endpoint}`,{method:body?'POST':'GET',headers:{'x-test-admin':'yes',Origin:'https://ere.example','Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})}));
  const content=async()=> (await call('content')).json();
  return {store,archive,backups,handler,call,content};
}
test('pre-change snapshots survive restarts, restore is revision-checked and itself reversible',async t=>{
  const f=await fixture(t),before=await f.content();
  const edited={...before.blogPosts[0],title:'Locally edited headline'};
  assert.equal((await f.call('content',{action:'update',collection:'blogPosts',item:edited,revision:before.revision})).status,200);
  const items=await createContentBackups(f.archive).list();assert.equal(items.length,1);
  const old=await f.backups.get(items[0].id);assert.equal(old.content.blogPosts[0].title,before.blogPosts[0].title);
  assert.equal((await f.call('backups',{action:'restore',id:old.id,revision:before.revision})).status,409);
  const current=await f.content();
  assert.equal((await f.call('backups',{action:'restore',id:old.id,revision:current.revision})).status,200);
  assert.equal((await f.content()).blogPosts[0].title,before.blogPosts[0].title);
  assert.ok((await f.backups.list()).some(item=>item.id!==old.id));
});
test('failed backup prevents overwrite; public users cannot list or download private snapshots',async t=>{
  const f=await fixture(t),before=await f.content();
  const broken=createContentHandler({store:f.store,backups:{snapshot:async()=>{throw Error('unavailable');}},authorize:async()=>null});
  const response=await broken(new Request('https://ere.example/api/admin/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',collection:'blogPosts',id:before.blogPosts[0].id,revision:before.revision})}));
  assert.equal(response.status,503);assert.equal((await f.content()).revision,before.revision);
  for(const url of ['backups','backups?id=abcd'])assert.equal((await f.handler(new Request(`https://ere.example/api/admin/${url}`))).status,401);
  assert.equal((await f.call('backups',{action:'create'},{Origin:'https://other.example'})).status,403);
});
test('manual backups deduplicate and corrupt recovery records cannot replace content',async t=>{
  const f=await fixture(t),before=await f.content();
  const backup=(await (await f.call('backups',{action:'create'})).json()).backup;
  await f.call('backups',{action:'create'});assert.equal((await f.backups.list()).length,1);
  await f.archive.setJSON(`snapshots/${backup.id}`,{...backup,content:{...initialContent,listings:[{id:'invalid'}]}});
  assert.equal((await f.call('backups',{action:'restore',id:backup.id,revision:before.revision})).status,400);
  assert.equal((await f.content()).revision,before.revision);
});
test('known Zenu links migrate in galleries and rich HTML without changing other content; every target exists',async()=>{
  for(const [url,target] of Object.entries(imageMigration)){
    assert.equal(migrateImageUrls({gallery:[url],html:`<img src="${url}">`,title:'Keep text'}).gallery[0],target);
    assert.equal(migrateImageUrls(`<img src="${url}">`),`<img src="${target}">`);
    await access(path.resolve('public',target.slice(1)));
  }
  assert.equal(JSON.stringify(migrateImageUrls(initialContent)).includes('images.zenu.com.au'),false);
});
