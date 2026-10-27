import fs from 'node:fs';
import crypto from 'node:crypto';
const root=process.argv[2];
const {createCity,advanceMonth,measure,applyAction}=await import(root+'/static/cmd-city/core.mjs');
const {capacity}=await import(root+'/static/cmd-city/content.mjs');
const {createHouseholds}=await import(root+'/static/cmd-city/households.mjs');
const {createFuture}=await import(root+'/static/cmd-city/future.mjs');
const {createServices}=await import(root+'/static/cmd-city/services.mjs');
function town() {
  const c = createCity({ starter: false, seed: 505, sandbox: true });
  for (const t of c.tiles)
    Object.assign(t, {
      terrain: "land",
      type: "empty",
      occupancy: 0,
      resource: null,
      reserve: 0,
    });
  for (let x = 0; x < 30; x++) c.tiles[640 + x].type = "avenue";
  for (const [type, x, occupancy] of [
    ["tower", 2, 180],
    ["residential", 4, 100],
    ["commercial", 6, 12],
    ["industrial", 8, 18],
    ["academy", 10, 0],
    ["consortium", 12, 0],
    ["wind", 14, 0],
    ["water", 16, 0],
  ])
    Object.assign(c.tiles[600 + x], {
      type,
      occupancy,
      level: type === "residential" ? 3 : 1,
    });
  c.cash = 100000000;
  c.inventory.goods = 100000;
  c.inventory.oil = 100;
  c.inventory.ore = 100;
  c.research.completed = ["cleanEnergy", "vertical"];
  c.households = createHouseholds(c);
  c.services = createServices(c);
  c.future = createFuture(c);
  return c;
}
const rows=[];
for(const kind of ['mixed-tower']){
const s=town(); for(const use of ['shops','offices','power','water','school']) { const r=applyAction(s,{type:'future',action:{type:'addFloor',index:602,use}}); if(!r.ok)throw Error(r.message); }
if(kind==='dense'){let c=0;for(let i=0;i<s.tiles.length;i++){let t=s.tiles[i],x=i%40,y=Math.floor(i/40);t.terrain='land';if(x%4===0||y%4===0)t.type='avenue';else{const k=c++;t.type=k<30?'wind':k<60?'water':k<90?'sewage':k<120?'landfill':k%4===0?'industrial':k%4===1?'commercial':'residential';t.level=3;t.occupancy=capacity(t);}}s.tiles[640].type='road';s.households=createHouseholds(s);s.services=createServices(s);s.future=createFuture(s);}
for(let month=0;month<120;month++){if(month===10)s.tiles[644].enabled=false; if(month===20)s.tiles[644].enabled=true; const m=advanceMonth(s);rows.push(JSON.parse(JSON.stringify({s,m})));}
}
console.log(JSON.stringify(rows));
