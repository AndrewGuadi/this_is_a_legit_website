import fs from 'node:fs';
import crypto from 'node:crypto';
const root=process.argv[2];
const {createCity,advanceMonth,measure,action}=await import(root+'/static/cmd-city/core.mjs');
const {capacity}=await import(root+'/static/cmd-city/content.mjs');
const {createHouseholds}=await import(root+'/static/cmd-city/households.mjs');
const {createServices}=await import(root+'/static/cmd-city/services.mjs');
const rows=[];
for(const kind of ['starter','dense']){
const s=createCity({starter:kind==='starter',seed:42});
if(kind==='dense'){let c=0;for(let i=0;i<s.tiles.length;i++){let t=s.tiles[i],x=i%40,y=Math.floor(i/40);t.terrain='land';if(x%4===0||y%4===0)t.type='avenue';else{const k=c++;t.type=k<30?'wind':k<60?'water':k<90?'sewage':k<120?'landfill':k%4===0?'industrial':k%4===1?'commercial':'residential';t.level=3;t.occupancy=capacity(t);}}s.tiles[640].type='road';s.households=createHouseholds(s);s.services=createServices(s);}
for(let month=0;month<120;month++){const m=advanceMonth(s);rows.push(crypto.createHash('sha256').update(JSON.stringify({s,m})).digest('hex'));}
}
console.log(JSON.stringify(rows));
