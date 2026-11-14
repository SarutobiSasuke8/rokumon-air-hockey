import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const storage = new Map();
const listeners = new Map();
const contexts = [];
class Param { value=0; setValueAtTime(v){this.value=v} linearRampToValueAtTime(v){this.value=v} exponentialRampToValueAtTime(v){this.value=v} }
class Node { connections=[]; connect(n){this.connections.push(n);return n} disconnect(){this.connections=[]} }
class Gain extends Node { gain=new Param() }
class Source extends Node { playbackRate=new Param(); frequency=new Param(); loop=false; started=false; stopped=false; start(){this.started=true} stop(at){if(at===undefined){this.stopped=true;this.onended?.()}} }
class Context {
 state='running';currentTime=0;sampleRate=22050;destination=new Node();sources=[];gains=[];buffers=[];
 constructor(){contexts.push(this)}
 createGain(){const n=new Gain();this.gains.push(n);return n}
 createBufferSource(){const n=new Source();this.sources.push(n);return n}
 createOscillator(){return this.createBufferSource()}
 createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));const b={length,sampleRate,numberOfChannels:channels,getChannelData:i=>data[i]};this.buffers.push(b);return b}
 resume(){this.state='running';return Promise.resolve()}
 suspend(){this.state='suspended';return Promise.resolve()}
}
const document={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn)};
const window={AudioContext:Context,addEventListener:(name,fn)=>listeners.set(name,fn),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
const exports={};
const code=ts.transpileModule(readFileSync('src/systems/audio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{exports,window,document,console}); // No timer APIs: catches accidental timer scheduling.
const s=exports.sfx;
assert.equal(contexts.length,0,'No autoplay AudioContext before gesture');
s.unlock();const ctx=contexts[0];const live=()=>ctx.sources.filter(x=>x.started&&!x.stopped);
assert.equal(live().filter(x=>x.loop).length,1,'One music loop after unlock');
for(let i=0;i<25;i++)s.unlock();
assert.equal(live().filter(x=>x.loop).length,1,'Repeated gestures never stack music');
s.paddleHit(50);const soft=ctx.gains.at(-1).gain.value;s.paddleHit(1100);const hard=ctx.gains.at(-1).gain.value;
assert(hard>soft*1.7,'Faster collisions produce stronger clacks');
s.wallHit(600);assert.equal(ctx.sources.at(-1).buffer.length,Math.ceil(ctx.sampleRate*.075));
for(const buffer of ctx.buffers){for(let c=0;c<buffer.numberOfChannels;c++){const samples=buffer.getChannelData(c);assert(samples.every(Number.isFinite));assert(samples.some(x=>x!==0));assert(Math.max(...samples.subarray(0,16000).map(Math.abs))<1,'No source buffer clipping')}}
s.goal();s.matchEnd(true);s.toggleMute();assert.equal(live().length,0,'Master mute cancels impacts, jingles and music');assert.equal(ctx.gains[0].gain.value,0);
const count=ctx.sources.length;s.paddleHit(1000);s.goal();assert.equal(ctx.sources.length,count,'Muted calls create no voices');
s.toggleMusic();assert.equal(s.musicEnabled,false);s.toggleMute();assert.equal(live().length,0,'Master unmute respects separate music-off choice');
s.serve();assert.equal(live().length,1,'Music off still allows SFX');s.toggleMusic();assert.equal(live().filter(x=>x.loop).length,1);
document.hidden=true;listeners.get('visibilitychange')();assert.equal(live().length,0);assert.equal(ctx.state,'suspended');
document.hidden=false;listeners.get('visibilitychange')();assert.equal(live().length,0,'Returning to tab does not autoplay');s.unlock();await Promise.resolve();assert.equal(live().filter(x=>x.loop).length,1,'Next gesture resumes one loop');
for(let i=0;i<20;i++){s.toggleMusic();s.toggleMusic()}assert.equal(live().filter(x=>x.loop).length,1);
s.toggleMute();assert.equal(storage.get('rokumon-air-hockey:muted'),'1');assert.equal(storage.get('rokumon-air-hockey:music'),'1');
console.log('Audio lifecycle passed: gesture gate, velocity dynamics, finite buffers, one loop, immediate master mute, separate persisted music preference, background suspension and 20 toggle cycles.');
