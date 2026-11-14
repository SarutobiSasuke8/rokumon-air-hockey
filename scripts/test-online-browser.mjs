import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const origin = process.env.GAME_URL || 'http://127.0.0.1:5190';
const browser = await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
await mkdir('docs/evidence/online-20261114',{recursive:true});
try {
  const errors=[];
  const clients=[];
  for(let i=0;i<2;i++){
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage(); const packets=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('websocket',socket=>socket.on('framereceived',frame=>{try{packets.push(JSON.parse(String(frame.payload)));}catch{}}));
    await page.goto(origin);await page.waitForFunction(()=>window.__GAME_DEBUG__?.snapshotState().scenes.includes('Menu'));
    const box=await page.locator('canvas').boundingBox();
    const point=(x,y)=>({x:box.x+x*box.width/960,y:box.y+y*box.height/540});
    const tap=async(x,y)=>{const p=point(x,y);await page.mouse.click(p.x,p.y);};
    await tap(416,412);
    await page.getByRole('button',{name:'Create a room',exact:true}).waitFor();
    clients.push({context,page,packets,tap,point});
  }
  const [host,guest]=clients;
  await host.page.getByRole('button',{name:'Create a room',exact:true}).click();
  await host.page.waitForFunction(()=>document.querySelector('[data-status]')?.textContent.includes('Share this code'));
  const room=host.packets.find(p=>p.type==='room'); assert(room?.code);
  await guest.page.getByRole('textbox',{name:'Room code'}).fill(room.code);
  await guest.page.getByRole('button',{name:'Join room',exact:true}).click();
  for(const c of clients) await c.page.waitForFunction(()=>window.__GAME_DEBUG__?.snapshotState().scenes.includes('Online'));
  await host.page.mouse.move(...Object.values(host.point(720,180)));
  await guest.page.mouse.move(...Object.values(guest.point(220,400)));
  await host.page.waitForTimeout(700);
  for(const c of clients){const state=c.packets.filter(p=>p.type==='state').at(-1);assert(Math.abs(state.world.player.x-720)<3);assert(Math.abs(state.world.ai.x-220)<3);assert(Math.abs(state.world.ai.y-400)<3);}
  // Snapshots with the same sequence must contain identical authoritative puck/score data.
  const hostStates=host.packets.filter(p=>p.type==='state');
  const guestStates=guest.packets.filter(p=>p.type==='state');
  const common=hostStates.findLast(p=>guestStates.some(q=>q.seq===p.seq));
  assert(common && common.seq!==undefined,'shared snapshot sequence');
  assert.deepEqual(common.world,guestStates.find(q=>q.seq===common.seq).world);
  await host.page.screenshot({path:'docs/evidence/online-20261114/host.png'});
  await guest.page.screenshot({path:'docs/evidence/online-20261114/guest.png'});
  await guest.tap(65,30);
  await host.page.waitForTimeout(400);
  assert(host.packets.some(p=>p.type==='closed'),'other player receives disconnect');
  await host.page.screenshot({path:'docs/evidence/online-20261114/opponent-left.png'});
  await host.tap(65,30);
  await host.page.waitForFunction(()=>window.__GAME_DEBUG__?.snapshotState().scenes.includes('Menu'));
  assert.deepEqual(errors,[]);
  console.log('Two-browser private room, shared authoritative snapshots, independent mouse controls, disconnect and menu return passed.');
} finally { await browser.close(); }

