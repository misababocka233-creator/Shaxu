'use strict';
// Світлі: 1, темні: -1. Дамки: 2 та -2. Порожнє поле: 0.
const DIRS=[[-1,-1],[-1,1],[1,-1],[1,1]];
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const side=p=>Math.sign(p);
const crown=(p,r)=>Math.abs(p)===1&&((p>0&&r===0)||(p<0&&r===7))?p*2:p;
function initialBoard(){return Array.from({length:64},(_,i)=>((Math.floor(i/8)+i%8)%2===0)?0:i<24?-1:i>=40?1:0);}
function legalMoves(board,turn){
 const captures=[];
 function walk(b,pos,p,path,taken){
  const r=pos>>3,c=pos%8;let found=false;
  for(const [dr,dc]of DIRS){
   let nr=r+dr,nc=c+dc;
   if(Math.abs(p)===1){
    if(!inside(nr,nc))continue;const mid=nr*8+nc;nr+=dr;nc+=dc;
    if(!inside(nr,nc)||side(b[mid])!==-turn||taken.includes(mid)||b[nr*8+nc])continue;
    const to=nr*8+nc,nb=b.slice(),np=crown(p,nr);nb[pos]=0;nb[to]=np;found=true;walk(nb,to,np,[...path,to],[...taken,mid]);
   }else{
    while(inside(nr,nc)&&!b[nr*8+nc]){nr+=dr;nc+=dc;}
    if(!inside(nr,nc))continue;const mid=nr*8+nc;
    if(side(b[mid])!==-turn||taken.includes(mid))continue;
    nr+=dr;nc+=dc;
    while(inside(nr,nc)&&!b[nr*8+nc]){const to=nr*8+nc,nb=b.slice();nb[pos]=0;nb[to]=p;found=true;walk(nb,to,p,[...path,to],[...taken,mid]);nr+=dr;nc+=dc;}
   }
  }
  if(!found&&taken.length)captures.push({from:path[0],path,taken,piece:p});
 }
 for(let i=0;i<64;i++)if(side(board[i])===turn)walk(board,i,board[i],[i],[]);
 if(captures.length)return captures;
 const moves=[];
 for(let i=0;i<64;i++){
  const p=board[i];if(side(p)!==turn)continue;
  for(const [dr,dc]of DIRS){if(Math.abs(p)===1&&dr!==-turn)continue;let r=(i>>3)+dr,c=i%8+dc;while(inside(r,c)&&!board[r*8+c]){moves.push({from:i,path:[i,r*8+c],taken:[],piece:crown(p,r)});if(Math.abs(p)===1)break;r+=dr;c+=dc;}}
 }
 return moves;
}
function applyMove(board,move){const next=board.slice();next[move.from]=0;for(const i of move.taken)next[i]=0;next[move.path.at(-1)]=move.piece;return next;}
function evaluate(board){return board.reduce((sum,p,i)=>sum+(p?side(p)*(Math.abs(p)===2?340:100+(p>0?7-(i>>3):i>>3)*5):0),0);}
function chooseAI(board,turn){const moves=legalMoves(board,turn);let best=-Infinity,choices=[];for(const m of moves){const next=applyMove(board,m),replies=legalMoves(next,-turn);let value;if(!replies.length)value=100000;else{value=Infinity;for(const reply of replies)value=Math.min(value,evaluate(applyMove(next,reply))*turn);}if(value>best){best=value;choices=[m];}else if(value===best)choices.push(m);}return choices[Math.floor(Math.random()*choices.length)];}
// Движок також доступний для перевірок у Node.js.
if(typeof module!=='undefined')module.exports={initialBoard,legalMoves,applyMove,chooseAI};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id),KEY='dudecCheckersV1';
 let board=initialBoard(),turn=1,mode='ai',quiet=0,history=[],positions=[],last=[],result='',selected=null,prefix=[],options=[],thinking=false,aiTimer=null,saveFailed=false;
 const key=()=>board.join(',')+'/'+turn;
 function snapshot(){return {board:board.slice(),turn,quiet,positions:positions.slice(),last:last.slice()};}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({board,turn,mode,quiet,history,positions,last}));}catch{saveFailed=true;}}
 function valid(s){return s&&Array.isArray(s.board)&&s.board.length===64&&s.board.every((v,i)=>[-2,-1,0,1,2].includes(v)&&(!v||((i>>3)+i%8)%2===1))&&[-1,1].includes(s.turn)&&Number.isInteger(s.quiet)&&s.quiet>=0&&Array.isArray(s.positions)&&s.positions.every(p=>typeof p==='string')&&Array.isArray(s.last)&&s.last.every(i=>Number.isInteger(i)&&i>=0&&i<64);}
 try{const s=JSON.parse(localStorage.getItem(KEY));if(valid(s)&&['ai','local'].includes(s.mode)){board=s.board;turn=s.turn;mode=s.mode;quiet=s.quiet;positions=s.positions;last=s.last;history=Array.isArray(s.history)?s.history.filter(valid).slice(-150):[];}}catch{}
 if(!positions.length)positions=[key()];$('mode').value=mode;
 function checkResult(){const moves=legalMoves(board,turn);if(!moves.length)return turn===1?'Темні перемогли! У світлих немає ходів.':'Світлі перемогли! У темних немає ходів.';if(positions.filter(p=>p===key()).length>=3)return 'Нічия: позиція повторилася тричі.';if(quiet>=80)return 'Нічия: 80 ходів без взяття чи нової дамки.';return '';}
 function clearSelection(){selected=null;prefix=[];options=[];}
 function preview(){const b=board.slice();if(prefix.length>1){let p=b[prefix[0]];b[prefix[0]]=0;for(const to of prefix.slice(1))p=crown(p,to>>3);b[prefix.at(-1)]=p;}return b;}
 function render(){
  result=checkResult();const moves=result?[]:legalMoves(board,turn),b=preview(),targets=selected===null?[]:[...new Set(options.map(m=>m.path[prefix.length]).filter(i=>i!==undefined))],taken=prefix.length>1?options[0].taken.slice(0,prefix.length-1):[];
  const boardEl=$('board'),focus=boardEl.contains(document.activeElement)?document.activeElement.dataset.index:null;boardEl.replaceChildren();
  for(let i=0;i<64;i++){
   const cell=document.createElement('button'),p=b[i],r=i>>3,c=i%8;cell.type='button';cell.dataset.index=i;cell.className='cell '+((r+c)%2?'deep':'pale');
   if(last.includes(i))cell.classList.add('last');if(prefix.at(-1)===i)cell.classList.add('selected');if(targets.includes(i))cell.classList.add('target');
   if(!thinking&&!result&&selected===null&&moves.some(m=>m.from===i))cell.classList.add('available');
   const label=String.fromCharCode(97+c)+(8-r);cell.setAttribute('aria-label',`${label}: ${p?(p>0?'світла':'темна')+(Math.abs(p)===2?' дамка':' шашка'):'порожньо'}${targets.includes(i)?', можливий хід':''}`);cell.setAttribute('aria-pressed',String(prefix.at(-1)===i));
   if(p){const piece=document.createElement('span');piece.className='piece '+(p>0?'white':'black')+(taken.includes(i)?' captured':'');piece.textContent=Math.abs(p)===2?'♛':'';cell.append(piece);}
   if(r===7||c===0){const small=document.createElement('span');small.className='coordinate';small.textContent=r===7?String.fromCharCode(97+c):8-r;cell.append(small);}
   cell.addEventListener('click',()=>clickCell(i));cell.addEventListener('keydown',e=>{const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8}[e.key];if(offset!==undefined){e.preventDefault();const to=i+offset;if(to>=0&&to<64&&(!(Math.abs(offset)===1)||to>>3===i>>3))boardEl.children[to].focus();}});boardEl.append(cell);
  }
  if(focus!==null)boardEl.children[Number(focus)]?.focus();
  $('white-count').textContent=board.filter(p=>p>0).length;$('black-count').textContent=board.filter(p=>p<0).length;
  $('white-turn').classList.toggle('hidden',turn!==1||!!result);$('black-turn').classList.toggle('hidden',turn!==-1||!!result);
  $('opponent').textContent=mode==='ai'?'Комп’ютер':'Гравець 2';$('you').textContent=mode==='ai'?'Ти':'Гравець 1';
  $('undo').disabled=!history.length&&prefix.length<2;
  $('status').textContent=(result||(thinking?'Комп’ютер обмірковує хід…':prefix.length>1?'Продовжуй взяття цією ж шашкою.':`${turn===1?'Хід світлих':'Хід темних'}${moves.some(m=>m.taken.length)?' · Взяття обов’язкове.':'. Обери шашку.'}`))+(saveFailed?' Прогрес не вдалося зберегти.':'');
 }
 function clickCell(i){if(thinking||result||(mode==='ai'&&turn===-1))return;
  if(selected!==null){const matching=options.filter(m=>m.path[prefix.length]===i);if(matching.length){prefix.push(i);options=matching;if(options.every(m=>m.path.length===prefix.length)){commit(options[0]);return;}render();return;}if(prefix.length>1)return;}
  const possible=legalMoves(board,turn).filter(m=>m.from===i);if(possible.length){selected=i;prefix=[i];options=possible;}else clearSelection();render();
 }
 function commit(move){history.push(snapshot());if(history.length>150)history.shift();const promoted=Math.abs(board[move.from])!==Math.abs(move.piece);board=applyMove(board,move);quiet=move.taken.length||promoted?0:quiet+1;turn=-turn;last=[move.from,move.path.at(-1)];positions.push(key());clearSelection();thinking=false;persist();render();scheduleAI();}
 function scheduleAI(){clearTimeout(aiTimer);if(mode==='ai'&&turn===-1&&!result){thinking=true;render();aiTimer=setTimeout(()=>{if($('confirm').open||$('rules-modal').open){scheduleAI();return;}const move=chooseAI(board,turn);if(move)commit(move);},450);}}
 function restart(){clearTimeout(aiTimer);thinking=false;board=initialBoard();turn=1;quiet=0;history=[];last=[];positions=[key()];clearSelection();persist();render();}
 $('undo').onclick=()=>{clearTimeout(aiTimer);thinking=false;if(prefix.length>1){clearSelection();render();return;}if(!history.length)return;let s=history.pop();if(mode==='ai'&&s.turn===-1&&history.length)s=history.pop();({board,turn,quiet,positions,last}=s);clearSelection();persist();render();scheduleAI();};
 let requestedMode=mode;
 function requestNew(newMode){requestedMode=newMode;$('confirm').showModal();}
 $('new').onclick=()=>requestNew(mode);
 $('mode').onchange=()=>{const value=$('mode').value;$('mode').value=mode;requestNew(value);};
 $('cancel-new').onclick=()=>{$('confirm').close();};
 $('confirm-new').onclick=()=>{mode=requestedMode;$('mode').value=mode;$('confirm').close();restart();};
 $('rules').onclick=()=>$('rules-modal').showModal();
 render();scheduleAI();
}
