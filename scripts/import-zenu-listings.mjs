// Build a local, reviewable import from listing pages captured in the ChatGPT browser.
// This script never connects to Zenu CRM or writes to the live website.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateItem } from '../server/content.mjs';

const sourceDirectory = path.resolve(process.argv.slice(2).find(arg => !arg.startsWith('--')) || '../output/zenu-import-2026-11-24');
const root = path.resolve(import.meta.dirname, '..');
const source = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'all-records.json'), 'utf8'));
const baseline = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'live-content-before.json'), 'utf8'));
const agentIds = Object.fromEntries(baseline.teamMembers.map(a => [a.name.toLowerCase(), a.id]));
const fallbackAgent = agentIds['wendy chia'];
const warnings = [];
const assets = new Map();
const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const date = text => {
  const match = text?.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d+)(?:st|nd|rd|th) (\w+) (\d{2})/);
  if (!match) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `20${match[3]}-${String(months.indexOf(match[2])+1).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
};
const linksFor = (summary, fragment) => [...summary.matchAll(/- link "([^"\n]+)":\n\s+- \/url: ([^\n]+)/g)].filter(m => m[2].includes(fragment)).map(m => m[1]);
const listings = source.map(d => {
  const p = d.public, s = d.summary;
  if (!p?.address || !p.description) throw new Error(`Incomplete public page: ${d.id}`);
  const parts = p.address.split('\n').map(clean).filter(Boolean);
  const title = parts[0], suburb = parts.at(-1);
  const postcode = p.url.match(/-wa-(\d{4})(?:[/?#]|$)/)?.[1] || '';
  if (!postcode) warnings.push({id:d.id,field:'postcode',note:'Not present in public URL'});
  const types = linksFor(s, '/modalForm/category');
  const categoryIndex = types.indexOf('Category');
  const sourceCategory = types[categoryIndex+1];
  const propertyType = types[types.indexOf('Property Type')+1] || 'Residential';
  const method = s.match(/- generic: Method\n- generic: ([^\n]+)/)?.[1] || '';
  const commercial = sourceCategory === 'Commercial';
  const rental = /lease/i.test(method) && !/sale or lease/i.test(method);
  const rawStatus = s.match(/- text: (On Market|Under Offer|Under Contract|Sold|Settled|Leased|Lease Pending|Pre-Sold)\n/)?.[1] || '';
  const status = d.group === 'sold' ? 'Sold' : d.group === 'leased' ? 'Leased' : /Under Offer|Under Contract|Pre-Sold|Lease Pending/.test(rawStatus) || /UNDER OFFER/i.test(p.price) ? 'Under Offer' : 'Available';
  const category = status === 'Sold' ? 'Sold' : status === 'Leased' ? 'Leased' : commercial ? 'Commercial' : rental ? 'Residential Lease' : 'Residential Sale';
  const priceLinks = linksFor(s, '/modalForm/price');
  const rentalIndex = priceLinks.indexOf('Rental');
  const displayIndex = priceLinks.indexOf('Display Price');
  let priceDisplay = rental && rentalIndex >= 0 ? priceLinks[rentalIndex+1] : displayIndex >= 0 ? priceLinks[displayIndex+1] : p.price || 'Contact Agent';
  if (/Price is hidden from web/.test(s)) priceDisplay = 'Contact Agent';
  if (rental && priceDisplay !== p.price) warnings.push({id:d.id,field:'price',note:`Used Zenu rental quote ${priceDisplay}; old public page showed ${p.price}`});
  const description = p.description.trim();
  const count = (kind, expression) => {
    const explicit = Number(s.match(new RegExp(`- link "${kind} (\\d+)"`))?.[1] || 0);
    if (explicit) return explicit;
    const described = description.match(expression);
    if (described) return Number(described[1]);
    if (kind === 'Car' && /\bdouble (?:remote )?garage\b/i.test(description)) return 2;
    if (!commercial && !/Land|Farming|Viticulture/.test(propertyType)) warnings.push({id:d.id,field:kind,note:'Not specified; zero used internally and hidden on cards'});
    return 0;
  };
  const bedrooms = count('bed', /\b(\d+)[ -](?:spacious |generous |large |sized )?bedrooms?\b/i);
  const bathrooms = count('Bath', /\b(\d+)[ -](?:modern |well[- ]appointed )?bathrooms?\b/i);
  const carSpaces = count('Car', /\b(\d+)[ -](?:car |secure )?(?:garage|car spaces|parking spaces)\b/i) || (/\bdouble (?:remote )?garage\b/i.test(description)?2:0);
  const landSizeSqm = s.match(/- link "plan ([\d.]+) HECTARE"/) ? Number(s.match(/- link "plan ([\d.]+) HECTARE"/)[1]) * 10000 : Number(s.match(/- link "plan ([\d.]+) SQM"/)?.[1] || description.match(/\b([\d,]+)\s*(?:sqm|sq\.m|m²)\s+(?:block|land)/i)?.[1]?.replaceAll(',','') || 0);
  const buildingAreaSqm = Number(description.match(/(?:approximately|approx\.?)\s*([\d,]+)\s*(?:sqm|m²)\s+(?:of )?(?:internal|living|building)/i)?.[1]?.replaceAll(',','') || 0);
  const sourceAgents = [...new Set(p.agents.map(a => clean(a.name)).filter(name => agentIds[name.toLowerCase()]))];
  const agentId = agentIds[sourceAgents[0]?.toLowerCase()] || fallbackAgent;
  const coAgentId = agentIds[sourceAgents[1]?.toLowerCase()];
  const knownPortraits = new Set(source.flatMap(x => x.public.images.filter(i => /^(Wendy Chia|Calvin Liew|Bee Khaw|Tony Cai|Jacky Chan|Bima Putra|Jess Kaur)$/i.test(i.alt)).map(i => i.src.split('/').pop())));
  const seen = new Set();
  const galleryUrls = p.images.slice(2).filter(i => /^https:\/\/images\.zenu\.com\.au\//.test(i.src) && !knownPortraits.has(i.src.split('/').pop())).flatMap(i => {
    const filename = new URL(i.src).pathname.split('/').pop();
    if (seen.has(filename)) return []; seen.add(filename);
    const id = createHash('sha256').update(filename).digest('hex').slice(0,24);
    const url = `/assets/zenu-import/${id}.webp`;
    if (!assets.has(id)) assets.set(id,{id,source:i.src,url,originalFilename:filename});
    return [url];
  });
  if (!galleryUrls.length) throw new Error(`No property photos: ${d.id}`);
  const reaUrl = [...d.reaLinks.map(l=>l.url),...(p.reaLinks||[])].find(url=>/^https:\/\/(www\.)?realestate\.com\.au\/(?:property-[^/]+-)?\d+\/?$/.test(url));
  const features = description.split('\n').map(x=>x.trim()).filter(x=>/^[*•-]\s+/.test(x)).map(x=>x.replace(/^[*•-]\s+/,''));
  const listedDate = date(s.match(/- generic: On Market Date\n- generic: ([^\n]+)/)?.[1] || types.find(x=>/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/.test(x)));
  const item = { id:d.id,title,address:`${title}, ${suburb} WA ${postcode}`.trim(),suburb,state:'WA',postcode,priceDisplay,numericPrice:0,category,status,propertyType,bedrooms,bathrooms,carSpaces,landSizeSqm,buildingAreaSqm,imageUrl:galleryUrls[0],galleryUrls,agentId,featured:false,inspectionTime:'',headline:p.headline||title,description,features,listedDate,...(coAgentId?{coAgentId}:{}),...(reaUrl?{reaUrl}:{}),badgeText:status === 'Sold' || status === 'Leased' ? status : status === 'Under Offer' ? rawStatus==='Lease Pending'?'Lease Pending':rawStatus==='Under Contract'?'Under Contract':'Under Offer':/ON HOLD/i.test(priceDisplay)?'On Hold':commercial?'Commercial':rental?'For Lease':'For Sale'};
  return validateItem('listings',item);
});

const order = [...baseline.listings.filter(x=>!['Sold','Leased'].includes(x.status)).map(x=>x.id)];
listings.sort((a,b)=>{
  const archive = x => x.status === 'Sold' || x.status === 'Leased';
  if (archive(a)!==archive(b)) return archive(a)?1:-1;
  const ai=order.indexOf(a.id),bi=order.indexOf(b.id);
  if(ai>=0||bi>=0)return (ai<0?999:ai)-(bi<0?999:bi);
  return b.listedDate.localeCompare(a.listedDate)||a.id.localeCompare(b.id);
});
for (const item of listings.filter(x=>!['Sold','Leased'].includes(x.status)).slice(0,6)) item.featured=true;
const content = {listings,blogPosts:baseline.blogPosts,teamMembers:baseline.teamMembers,testimonials:baseline.testimonials};
await fs.mkdir(path.join(root,'staged'),{recursive:true});
await fs.writeFile(path.join(root,'staged','zenu-listings.json'),JSON.stringify(listings,null,2));
await fs.writeFile(path.join(sourceDirectory,'content-preview.json'),JSON.stringify(content,null,2));
await fs.writeFile(path.join(sourceDirectory,'asset-manifest.json'),JSON.stringify([...assets.values()],null,2));
await fs.writeFile(path.join(sourceDirectory,'review-notes.json'),JSON.stringify(warnings,null,2));
await fs.mkdir(path.join(root,'.ere-data'),{recursive:true});
const old=await fs.readFile(path.join(root,'.ere-data','content.json'),'utf8').catch(()=>null);
if(old)await fs.writeFile(path.join(sourceDirectory,'local-content-before.json'),old,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
await fs.writeFile(path.join(root,'.ere-data','content.json'),JSON.stringify(content));
console.log(JSON.stringify({listings:listings.length,current:listings.filter(x=>!['Sold','Leased'].includes(x.status)).length,sold:listings.filter(x=>x.status==='Sold').length,leased:listings.filter(x=>x.status==='Leased').length,rea:listings.filter(x=>x.reaUrl).length,assets:assets.size,warnings:warnings.length}));

if(process.argv.includes('--download')) {
  const displayDirectory=path.join(root,'public','assets','zenu-import');
  const originalsDirectory=path.join(sourceDirectory,'original-images');
  await fs.mkdir(displayDirectory,{recursive:true});await fs.mkdir(originalsDirectory,{recursive:true});
  const pending=[...assets.values()];const errors=[];let complete=0;
  await Promise.all(Array.from({length:8},async()=>{for(;;){const asset=pending.shift();if(!asset)return;
    try{
      const output=path.join(displayDirectory,asset.id+'.webp');
      if(!await fs.stat(output).catch(()=>null)){
        const original=path.join(originalsDirectory,asset.originalFilename);
        let bytes=await fs.readFile(original).catch(()=>null);
        if(!bytes){const response=await fetch(asset.source,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(original,bytes);}
        await sharp(bytes).rotate().resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toFile(output);
      }
      if(++complete%50===0)console.log(`Photos saved: ${complete}/${assets.size}`);
    }catch(error){errors.push({source:asset.source,error:error.message});}
  }}));
  await fs.writeFile(path.join(sourceDirectory,'image-errors.json'),JSON.stringify(errors,null,2));
  console.log(JSON.stringify({photosSaved:complete,errors:errors.length}));
  if(errors.length)process.exitCode=1;
}
