// Isolated CI runner. Uses only child processes it owns; fails if ports are occupied.
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const children=[];
const start=args=>{const p=spawn(process.execPath,args,{stdio:'inherit'});children.push(p);return p;};
const run=args=>new Promise((resolve,reject)=>{const p=start(args);p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${args.join(' ')} exited ${code}`)));});
async function ready(url,child){for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error('Preview service failed');try{if((await fetch(url)).ok)return;}catch{}await delay(100);}throw new Error(`Timeout: ${url}`);}
try {
  const match=start(['scripts/match-server.mjs']);
  await ready('http://127.0.0.1:8089/health',match);
  const game=start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5190','--strictPort']);
  await ready('http://127.0.0.1:5190',game);
  await run(['scripts/test-menu-browser.mjs']);
  await run(['scripts/test-online-browser.mjs']);
} finally { for(const child of children)if(child.exitCode===null)child.kill(); }
