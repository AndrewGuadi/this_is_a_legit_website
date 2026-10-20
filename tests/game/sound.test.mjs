// Supplemental verification of the implemented audio adapter; not retrospective RED evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../../static/neon-breaker/view.mjs';
function audioFixture(){
 const notes=[];let created=0;
 class AudioContext{
  constructor(){created++;this.state='suspended';this.currentTime=1;this.destination={};}
  async resume(){this.state='running';}async suspend(){this.state='suspended';}
  createOscillator(){const node={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}};notes.push(node);return node;}
  createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 return{AudioContext,notes,created:()=>created};
}
test('sound begins silent, reuses one context, and muted events never create notes',async()=>{
 const fixture=audioFixture();globalThis.window={AudioContext:fixture.AudioContext};
 try{const sound=new Sound();sound.play('brick');assert.equal(fixture.created(),0);assert.equal(fixture.notes.length,0);
  await sound.toggle();assert.equal(sound.muted,false);assert.equal(fixture.created(),1);assert.equal(fixture.notes.length,1);
  sound.context.currentTime+=1;sound.play('brick');assert.equal(fixture.notes.length,2);
  await sound.toggle();for(const event of ['brick','paddle','launch','life-lost','stage-clear','complete','gameover'])sound.play(event);assert.equal(fixture.notes.length,2);assert.equal(sound.context.state,'suspended');
  sound.context.currentTime+=1;await sound.toggle();assert.equal(fixture.created(),1);assert.equal(sound.muted,false);
 }finally{delete globalThis.window;}
});
test('audio construction or resume failure stays silent without rejecting UI activation',async()=>{
 for(const AudioContext of [class{constructor(){throw Error('denied');}},class{async resume(){throw Error('denied');}}]){
  globalThis.window={AudioContext};const sound=new Sound();await sound.toggle();assert.equal(sound.muted,true);assert.equal(sound.failed,true);sound.play('brick');
 }delete globalThis.window;
});
test('rapid effects are bounded by a minimum note interval',async()=>{
 const fixture=audioFixture();globalThis.window={AudioContext:fixture.AudioContext};try{const sound=new Sound();await sound.toggle();for(let i=0;i<1000;i++)sound.play('brick');assert.equal(fixture.notes.length,1);}finally{delete globalThis.window;}
});
