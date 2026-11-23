// Copies original bytes without changing photographs, crops or watermarks.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import path from 'node:path';
const root = process.cwd();
async function walk(folder) {
  const result=[];
  for(const item of await readdir(folder,{withFileTypes:true})) {
    if(item.name==='generated'||/^image-(migration|originals)\.json$/.test(item.name))continue;
    const file=path.join(folder,item.name);
    if(item.isDirectory())result.push(...await walk(file));
    else if(/\.(tsx?|css|json)$/.test(item.name))result.push(file);
  }
  return result;
}
const files=[...await walk('src'),...await walk('server')];
const texts=await Promise.all(files.map(file=>readFile(file,'utf8')));
const localFile=path.join(root,'.ere-data/content.json');
let local='';try{local=await readFile(localFile,'utf8');}catch{}
const live=await fetch('https://exceptionalrealestate.netlify.app/api/content',{signal:AbortSignal.timeout(20000)});
if(!live.ok)throw new Error('Could not inventory current public content');
const liveContent=await live.text();
const urls=[...new Set([...texts,local,liveContent].flatMap(text=>text.match(/https:\/\/images\.zenu\.com\.au\/[a-zA-Z0-9_./%-]+/g)||[]))].filter(url=>/\.(jpg|jpeg|png|webp|avif)$/i.test(url));
await mkdir('public/assets/migrated',{recursive:true});
let map={};try{map=JSON.parse(await readFile('server/image-migration.json','utf8'));}catch{}
for(const url of urls){
  if(map[url])continue;
  const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Image download failed: ${url}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>20*1024*1024)throw new Error('Image exceeds migration limit');
  const metadata=await sharp(bytes,{limitInputPixels:80000000}).metadata();
  const extension={jpeg:'jpg',png:'png',webp:'webp',avif:'avif'}[metadata.format];
  if(!extension)throw new Error('Unsupported image format');
  const filename=`${createHash('sha256').update(bytes).digest('hex').slice(0,24)}.${extension}`;
  await writeFile(`public/assets/migrated/${filename}`,bytes);
  map[url]=`/assets/migrated/${filename}`;
  console.log(`Copied ${filename} (${bytes.length} bytes)`);
}
await writeFile('server/image-migration.json',JSON.stringify(map,null,2)+'\n');
function replace(text){for(const [old,url] of Object.entries(map))text=text.split(old).join(url);return text;}
for(let i=0;i<files.length;i++)if(replace(texts[i])!==texts[i])await writeFile(files[i],replace(texts[i]));
// The ignored local preview only. No writes to Netlify or GitHub.
if(local)await writeFile(localFile,replace(local));
console.log(`Migrated ${Object.keys(map).length} image URLs. Live content was read only.`);
