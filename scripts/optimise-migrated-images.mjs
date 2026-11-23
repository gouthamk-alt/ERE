import { readFile, writeFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';
const map=JSON.parse(await readFile('server/image-migration.json','utf8'));
let originals;try{originals=JSON.parse(await readFile('server/image-originals.json','utf8'));}catch{originals={...map};}
const replacements={};
for(const [source,original] of Object.entries(originals)){
  const bytes=await readFile(`public${original}`);
  const target=original.replace(/\.[^.]+$/, '-display.webp');
  const optimised=await sharp(bytes,{limitInputPixels:80000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();
  await writeFile(`public${target}`,optimised);
  replacements[map[source]]=target;map[source]=target;
}
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(item.name==='generated')continue;const file=`${dir}/${item.name}`;if(item.isDirectory())await walk(file);else if(/\.(tsx?|css|json)$/.test(file)&&!file.includes('image-migration')&&!file.includes('image-originals')){let raw=await readFile(file,'utf8'),next=raw;for(const [old,url]of Object.entries(replacements))next=next.split(old).join(url);if(raw!==next)await writeFile(file,next);}}}
await walk('src');await walk('server');
try{let raw=await readFile('.ere-data/content.json','utf8');for(const [old,url]of Object.entries(replacements))raw=raw.split(old).join(url);await writeFile('.ere-data/content.json',raw);}catch{}
await writeFile('server/image-originals.json',JSON.stringify(originals,null,2)+'\n');
await writeFile('server/image-migration.json',JSON.stringify(map,null,2)+'\n');
console.log(`Created ${Object.keys(map).length} display copies. Original files retained unchanged.`);
