import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..');
const listings=JSON.parse(await fs.readFile(path.join(root,'staged','zenu-listings.json'),'utf8'));
const fronts=new Set(listings.map(x=>path.basename(x.imageUrl)));
const directory=path.join(root,'public','assets','zenu-import');
const files=(await fs.readdir(directory)).filter(name=>/^[a-f0-9]{24}\.webp$/.test(name));
let pending=[...files];
await Promise.all(Array.from({length:6},async()=>{for(;;){const name=pending.shift();if(!name)return;const source=path.join(directory,name);
  const thumbnail=source.replace(/\.webp$/,'-thumb.webp');
  if(!await fs.stat(thumbnail).catch(()=>null))await sharp(source).resize({width:240,withoutEnlargement:true}).webp({quality:75}).toFile(thumbnail);
  if(fronts.has(name)){const card=source.replace(/\.webp$/,'-card.webp');if(!await fs.stat(card).catch(()=>null))await sharp(source).resize({width:800,withoutEnlargement:true}).webp({quality:82}).toFile(card);}
}}));
console.log(`Prepared ${files.length} thumbnails and ${fronts.size} listing card images.`);
