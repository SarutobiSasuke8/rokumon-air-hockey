import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const Phaser={Scene:class {},Math:{Clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))}};
function load(path,imports={}) {
 const exports={}; const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>name==="phaser"?Phaser:imports[name]}); return exports;
}
const constants=load("src/game/constants.ts");const {TABLE,PADDLE,PUCK,AI}=constants;
const {GameScene}=load("src/scenes/GameScene.ts",{"../game/constants.js":constants,"../integrations/hub.js":{hub:{score(){},gameOver(){},event(){}}},"../systems/audio.js":{sfx:{matchEnd(){},paddleHit(){}}}});
for(const scorer of ["player","ai"]) {
 const state={status:"playing",playerScore:0,aiScore:0,elapsedMs:100};
 const scene={state,game:{events:{emit(){}}},juiceGoal(){},queueServe(){state.status="serving"},puck:{setVelocity(){},setPosition(){}},time:{delayedCall(){}}};
 for(let goal=1;goal<=7;goal++) {state.status="playing";GameScene.prototype.onGoal.call(scene,scorer);assert.equal(state[scorer==="player"?"playerScore":"aiScore"],goal);assert.equal(state.status,goal===7?"complete":"serving");}
 assert.equal(state.winner,scorer);
 GameScene.prototype.onGoal.call(scene,scorer);assert.equal(state[scorer==="player"?"playerScore":"aiScore"],7,"overlap cannot count a terminal goal twice");
}
const paddle=(x,y)=>({x,y,setPosition(x,y){this.x=x;this.y=y},body:{updateFromGameObject(){}}});
for(const x of [-10000,0,TABLE.centerX,10000])for(const y of [-10000,0,TABLE.centerY,10000]) {
 const player=paddle(700,285); const scene={playerPaddle:player,actions:{keyboardVector:()=>({x:0,y:0}),pointerTarget:()=>({x,y})}};
 GameScene.prototype.updatePlayerPaddle.call(scene,16);
 assert.ok(player.x>=TABLE.centerX+PADDLE.radius+4 && player.x<=TABLE.x1-PADDLE.radius);
 assert.ok(player.y>=TABLE.y0+PADDLE.radius && player.y<=TABLE.y1-PADDLE.radius);
 const cpu=paddle(200,285);const cpuScene={aiPaddle:cpu,aiTarget:{x,y},aiSampleAccumMs:0,puck:{x,y},state:{status:"playing"},aiHomeX:()=>TABLE.x0+AI.homeXInset};
 GameScene.prototype.updateAiPaddle.call(cpuScene,1000);
 assert.ok(cpu.x>=TABLE.x0+PADDLE.radius && cpu.x<=TABLE.centerX-PADDLE.radius-4,"CPU stays in its half");
 assert.ok(cpu.y>=TABLE.y0+PADDLE.radius && cpu.y<=TABLE.y1-PADDLE.radius);
}
for(const velocity of [{x:0,y:0},{x:300,y:-500},{x:10000,y:10000}]) {
 const puck={body:{velocity:{...velocity}},setVelocity(x,y){this.body.velocity={x,y}}};
 GameScene.prototype.onPaddleHit.call({},puck,{x:900,y:500},{x:100,y:100});
 assert.ok(Math.hypot(puck.body.velocity.x,puck.body.velocity.y)<=PUCK.maxSpeed+1e-9,"collision transfer respects puck speed cap");
}
console.log("First-to-7 on both sides, duplicate-goal guard, 16 player/CPU bounds and 3 collision caps passed");
