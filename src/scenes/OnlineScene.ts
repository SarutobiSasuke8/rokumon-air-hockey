import Phaser from 'phaser';
import { drawArena } from '../art/table.js';
import { online, type MatchSnapshot } from '../systems/online.js';
import { createPlayerActions } from '../systems/input.js';
import { sfx } from '../systems/audio.js';
import { TABLE, PADDLE } from '../game/constants.js';
import { clampMallet } from '../game/physics.js';
import { hub } from '../integrations/hub.js';

export class OnlineScene extends Phaser.Scene {
  constructor() { super('Online'); }
  create(data: { world: MatchSnapshot }): void {
    drawArena(this);
    let world = data.world;
    let ended = false;
    let lastInput = 0;
    const side = online.side;
    hub.ready();
    const player = this.add.image(world.player.x, world.player.y, 'tex-paddle-player').setDisplaySize(58,58).setDepth(11);
    const opponent = this.add.image(world.ai.x, world.ai.y, 'tex-paddle-ai').setDisplaySize(58,58).setDepth(11);
    const puck = this.add.image(world.puck.x, world.puck.y, 'tex-puck').setDisplaySize(30,30).setDepth(10);
    const label = this.add.text(480,28,'',{fontFamily:'Arial',fontSize:22,color:'#eaf7ff'}).setOrigin(.5);
    const note = this.add.text(480,520,`Room ${online.code} · You are ${side === 'player' ? 'CYAN / RIGHT' : 'CORAL / LEFT'} · First to 7`,{fontFamily:'Arial',fontSize:14,color:'#b5d5e5'}).setOrigin(.5);
    const leave = this.add.text(48,24,'LEAVE',{fontSize:16,color:'#a8d6e5'}).setInteractive({useHandCursor:true});
    leave.on('pointerdown',()=>{online.close();this.scene.start('Menu');});
    const mute = this.add.text(912,24,sfx.muted?'SOUND OFF':'SOUND ON',{fontSize:16,color:'#a8d6e5'}).setOrigin(1,0).setInteractive({useHandCursor:true});
    mute.on('pointerdown',()=>{sfx.unlock();sfx.toggleMute();mute.setText(sfx.muted?'SOUND OFF':'SOUND ON');});
    const banner = this.add.rectangle(480,270,700,180,0x071522,.96).setDepth(100).setVisible(false);
    const result = this.add.text(480,225,'',{fontSize:28,color:'#f0faff',align:'center',wordWrap:{width:650}}).setOrigin(.5).setDepth(101).setVisible(false);
    const rematch = this.add.text(480,310,'REMATCH',{fontSize:24,color:'#71dfeb'}).setOrigin(.5).setDepth(101).setInteractive({useHandCursor:true}).setVisible(false);
    rematch.on('pointerdown',()=>{online.send({type:'rematch'});rematch.setText('WAITING FOR OPPONENT');});
    const showResult = (message:string, retry:boolean) => {banner.setVisible(true);result.setText(message).setVisible(true);rematch.setVisible(retry);};
    const actions = createPlayerActions(this);
    this.input.on('pointerdown', () => sfx.unlock());
    this.input.keyboard?.on('keydown', () => sfx.unlock());
    online.listener = message => {
      if (message.type === 'state' && message.world) {
        world = message.world;
        label.setText(`${side === 'ai' ? 'YOU' : 'OPPONENT'}  ${world.run.aiScore}     :     ${world.run.playerScore}  ${side === 'player' ? 'YOU' : 'OPPONENT'}`);
        for (const event of message.events || []) {
          if(event.type==='mallet') sfx.paddleHit(event.speed || 300);
          if(event.type==='wall') sfx.wallHit(event.speed || 300);
          if(event.type==='goal') { sfx.goal(); hub.score(side === 'player' ? world.run.playerScore : world.run.aiScore); }
        }
        if (world.run.status === 'complete') {
          if (!ended) {
            const ownScore = side === 'player' ? world.run.playerScore : world.run.aiScore;
            hub.gameOver(ownScore, world.run.elapsedMs);
            if (world.run.winner === side) hub.event('match-won', { playerScore: ownScore, opponentScore: side === 'player' ? world.run.aiScore : world.run.playerScore, mode: 'online', seconds: Math.round(world.run.elapsedMs / 1000) });
          }
          ended=true; showResult(world.run.winner === side ? 'YOU WIN' : 'OPPONENT WINS',true);
        }
        else if (ended) { ended=false; banner.setVisible(false);result.setVisible(false);rematch.setVisible(false).setText('REMATCH'); }
      }
      if(message.type==='closed'||message.type==='error') {
        online.close();
        const reasons: Record<string,string> = { 'opponent-disconnected':'Your opponent left the match.', 'room-expired':'This room has expired.', 'server-shutdown':'The match service has stopped.' };
        ended=true;showResult(message.message || reasons[message.reason || ''] || message.reason || 'Connection ended',false);note.setText('Use LEAVE to return to the menu.');
      }
    };
    const update = (time:number,delta:number) => {
      const blend = 1-Math.exp(-delta/30);
      for(const [sprite,target] of [[player,world.player],[opponent,world.ai],[puck,world.puck]] as const) sprite.setPosition(Phaser.Math.Linear(sprite.x,target.x,blend),Phaser.Math.Linear(sprite.y,target.y,blend));
      if(ended||time-lastInput<33) return;
      const kb=actions.keyboardVector(); const own=side==='player'?world.player:world.ai;
      const pointer=actions.pointerTarget();
      const target=kb.x||kb.y?{x:own.x+kb.x*PADDLE.keyboardSpeed*.05,y:own.y+kb.y*PADDLE.keyboardSpeed*.05}:pointer;
      if(target){const clipped=clampMallet(side==='player'?'right':'left',target.x,target.y);online.send({type:'input',...clipped});}
      lastInput=time;
    };
    this.events.on('update',update);
    this.events.once('shutdown',()=>{online.listener=null;this.events.off('update',update);});
  }
}
