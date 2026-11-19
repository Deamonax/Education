import {PETS,GROUPS,groupProgress} from './catalog.mjs';
export {PETS,GROUPS,groupProgress,collectionStats,TOTAL_PETS,parseSharedPets} from './catalog.mjs';
export const TOPICS = {
add:{name:'Plus & min',icon:'plus',color:'green',short:'Tellen, optellen en aftrekken'},
tables:{name:'Keer & delen',icon:'grid',color:'orange',short:'Tafels en eerlijk verdelen'},
fractions:{name:'Breuken',icon:'pie',color:'purple',short:'Van een stukje naar het geheel'},
life:{name:'Geld & tijd',icon:'clock',color:'blue',short:'Rekenen in de echte wereld'},
logic:{name:'Breinbrekers',icon:'sparkles',color:'pink',short:'Patronen en slimme raadsels'}
};
export function freshProfile(age){return {age,levels:{add:age===6?2:4,tables:age===6?1:3,fractions:age===6?1:2,life:age===6?1:3,logic:age===6?1:3},streaks:{},stats:{},pets:[0],favorite:0,rounds:0,stars:0,review:[],rewardBag:[],eggGroup:0,inventory:{0:1},trades:0,battleStats:{played:0,wins:0,correct:0},eggHistory:{}};}
export function rand(n,r=Math.random){return Math.floor(r()*n)}
const shuffle=(a,r)=>a.map(v=>[r(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
function options(answer,fmt,r,others){let a=[answer,...(others||[])].filter((x,i,arr)=>x>=0&&arr.indexOf(x)===i);let step=1;while(a.length<4){for(const sign of [-1,1]){const v=answer+sign*step;if(v>=0&&!a.includes(v)&&a.length<4)a.push(v);}step++;}return shuffle(a.slice(0,4),r).map(value=>({value,label:fmt(value)}));}
const plain=n=>String(n);
const euro=n=>'€ '+(n/100).toFixed(2).replace('.',',');
export function question(topic,level,r=Math.random){
let a,b,answer,prompt,spoken,hint,explanation,visual=null,fmt=plain,other;
level=Math.max(1,Math.min(6,level));
if(topic==='add'){
 const max=[10,20,50,100,500,1000][level-1];a=1+rand(max-1,r);b=1+rand(Math.min(max-a,level<3?10:max-1),r);const minus=r()<.46;
 if(minus){if(a<b)[a,b]=[b,a];answer=a-b;prompt=`${a} − ${b} = ?`;spoken=`Hoeveel is ${a} min ${b}?`;hint=`Begin bij ${a}. Haal er ${b} af.${b>=10?` Eerst ${Math.floor(b/10)*10}, dan ${b%10}.`: ' Tel terug.'}`;explanation=`${a} min ${b} is ${answer}.`;}else{answer=a+b;prompt=`${a} + ${b} = ?`;spoken=`Hoeveel is ${a} plus ${b}?`;hint=`Begin bij ${a} en tel er ${b} bij.${a%10&&b>=10-a%10?` Je kunt eerst ${10-a%10} erbij tellen tot ${Math.ceil(a/10)*10}.`:''}`;explanation=`${a} plus ${b} is ${answer}.`;}
 if(a<=20&&b<=20)visual={type:'dots',a,b,minus};
}else if(topic==='tables'){
 const sets=[[2,5],[2,5,10],[2,3,4,5,10],[3,4,6,7,8,9],[6,7,8,9,11,12],[12,15,20,25]];a=sets[level-1][rand(sets[level-1].length,r)];b=2+rand(level<3?5:9,r);
 const divide=r()<.45;
 answer=divide?b:a*b;prompt=divide?`${a*b} ÷ ${a} = ?`:`${b} × ${a} = ?`;spoken=divide?`Je verdeelt ${a*b} over ${a} gelijke groepjes. Hoeveel zitten er in elk groepje?`:`Hoeveel is ${b} keer ${a}?`;
 hint=divide?`Welke tafel van ${a} komt uit op ${a*b}? Tel met sprongen van ${a}.`:`Tel ${b} keer ${a}. Je kunt beginnen met ${Math.floor(b/2)} keer ${a}, dat is ${Math.floor(b/2)*a}, en dan verder tellen.`;explanation=`${b} keer ${a} is ${a*b}. Dus ${a*b} gedeeld door ${a} is ${b}.`;if(a*b<=50)visual={type:'groups',a,b};
}else if(topic==='fractions'){
 const denoms=level<=2?[2,4]:[2,3,4,5,8,10];b=denoms[rand(denoms.length,r)];
 if(level===1){a=1+rand(b-1,r);answer=a;prompt=`? / ${b}`;spoken=`Deze reep heeft ${b} gelijke stukjes. Hoeveel stukjes zijn gekleurd?`;hint='Tel alleen de paarse stukjes. Het onderste getal telt alle stukjes.';explanation=`${a} van de ${b} stukjes zijn gekleurd. Je schrijft ${a} boven de breukstreep, en ${b} eronder.`;visual={type:'fraction',a,b};}
 else if(level<=4){a=1+rand(b-1,r);const units=2+rand(level===2?5:12,r);let total=b*units;answer=a*units;prompt=`${a}/${b} van ${total} = ?`;spoken=`Hoeveel is ${a} ${b===2?'tweede':b===3?'derde':b===4?'vierde':b===5?'vijfde':b===8?'achtste':'tiende'} van ${total}?`;hint=`Verdeel ${total} eerst in ${b} gelijke groepen. Eén groep is ${units}. Je hebt ${a} ${a===1?'groep':'groepen'} nodig.`;explanation=`${total} gedeeld door ${b} is ${units}. ${a} keer ${units} is ${answer}.`;visual={type:'fraction',a,b};}
 else {const percent=[10,20,25,50,75][rand(5,r)];a=(2+rand(19,r))*20;answer=a*percent/100;prompt=`${percent}% van ${a} = ?`;spoken=`Hoeveel is ${percent} procent van ${a}?`;hint=percent===25||percent===75?`25 procent is een kwart. Een kwart van ${a} is ${a/4}.`:`10 procent van ${a} is ${a/10}. Gebruik dat om ${percent} procent te vinden.`;explanation=`${percent} procent van ${a} is ${answer}.`;}
}else if(topic==='life'){
 if(level===1){a=1+rand(8,r);b=1+rand(8,r);answer=(a+b)*100;fmt=euro;other=[answer-100,answer+100,answer+200];prompt=`€ ${a} + € ${b} = ?`;spoken=`Je hebt ${a} euro en krijgt ${b} euro erbij. Hoeveel euro heb je nu?`;hint=`Tel de euro's bij elkaar op: ${a} plus ${b}.`;explanation=`Je hebt nu ${a+b} euro.`;visual={type:'money',a:a+b};}
 else if(level>=4&&r()<.5){const startHour=8+rand(7,r),startMinute=[0,15,30,45][rand(4,r)],duration=[15,30,45,60,75,90][rand(level>=5?6:4,r)];a=startHour*60+startMinute;answer=a+duration;fmt=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;other=[answer-15,answer+15,answer+30];prompt=`${fmt(a)} + ${duration} min = ?`;spoken=`Het is ${startHour} uur en ${startMinute} minuten. Je gaat ${duration} minuten spelen. Hoe laat is het als je klaar bent?`;hint='Een uur heeft 60 minuten. Tel eerst tot het volgende hele uur. Tel dan de minuten die je nog over hebt erbij.';explanation=`Na ${duration} minuten is het ${Math.floor(answer/60)} uur en ${answer%60} minuten.`;}
 else if(r()<.5){const hour=1+rand(11,r),minute=[0,15,30,45][rand(4,r)];answer=hour*60+minute;fmt=n=>`${Math.floor(((n+720)%720)/60)||12}:${String(n%60).padStart(2,'0')}`;other=[hour*60+(minute+30)%60,((hour%12)+1)*60+minute,((hour+10)%12+1)*60+minute];prompt='Hoe laat is het?';spoken='Hoe laat is het op deze klok?';hint=`De korte wijzer wijst het uur aan. De lange wijzer staat op ${minute===0?'12':minute/5}, dus ${minute} minuten na het hele uur.`;explanation=`Het is ${minute===0?`${hour} uur`:minute===15?`kwart over ${hour}`:minute===30?`half ${hour%12+1}`:`kwart voor ${hour%12+1}`}.`;visual={type:'clock',hour,minute};}
 else{const paid=[500,1000,2000][rand(level>=4?3:2,r)],cost=(1+rand(paid/50-2,r))*50;answer=paid-cost;fmt=euro;other=[answer-50,answer+50,answer+100];prompt=`${euro(paid)} − ${euro(cost)} = ?`;spoken=`Je betaalt met ${paid/100} euro. Het kost ${Math.floor(cost/100)} euro${cost%100?' en 50 cent':''}. Hoeveel geld krijg je terug?`;hint=`Tel door van ${euro(cost)} naar ${euro(paid)}. Vul eerst aan tot een hele euro.`;explanation=`Je krijgt ${Math.floor(answer/100)} euro${answer%100?' en 50 cent':''} terug.`;}
}else{
 if(level<=3||r()<.55){const step=[1,2,5,10][rand(level===1?2:4,r)];a=rand(level*8,r);answer=a+step*4;prompt=`${a}, ${a+step}, ${a+step*2}, ${a+step*3}, ?`;spoken=`Welk getal komt hierna? ${a}, ${a+step}, ${a+step*2}, ${a+step*3}.`;hint=`Kijk naar de sprong tussen twee getallen. Er komt steeds ${step} bij.`;explanation=`Je telt steeds ${step} erbij. Na ${a+step*3} komt ${answer}.`;}
 else if(r()<.5){a=2+rand(6,r);answer=a*16;prompt=`${a}, ${a*2}, ${a*4}, ${a*8}, ?`;spoken=`Welk getal komt hierna? ${a}, ${a*2}, ${a*4}, ${a*8}.`;hint='Elk getal is twee keer zo groot als het vorige.';explanation=`${a*8} keer 2 is ${answer}.`;}
 else{a=3+rand(10,r);b=2+rand(8,r);answer=a;prompt=`? × ${b} = ${a*b}`;spoken=`Welk getal keer ${b} is ${a*b}?`;hint=`Denk andersom: ${a*b} gedeeld door ${b}.`;explanation=`${a} keer ${b} is ${a*b}.`;}
}
const choices=options(answer,fmt,r,other);
return {topic,level,answer,prompt,spoken,hint,explanation,visual,choices};
}
export function nextTopic(profile,index,focus){if(focus!=='mix')return focus;const keys=profile.age===6?['add','add','tables','logic','life','add']:['add','tables','fractions','life','logic','tables'];return keys[index%keys.length];}
export function recordAnswer(profile,q,firstTry){const t=q.topic;let s=profile.stats[t]||{attempted:0,correct:0};s.attempted++;s.correct+=firstTry?1:0;profile.stats[t]=s;if(firstTry){profile.streaks[t]=(profile.streaks[t]||0)+1;if(profile.streaks[t]>=3){profile.levels[t]=Math.min(6,profile.levels[t]+1);profile.streaks[t]=0;}}else{profile.streaks[t]=0;profile.levels[t]=Math.max(1,profile.levels[t]-1);profile.review=[...profile.review.filter(x=>x.topic!==t),{topic:t,level:Math.max(1,q.level-1)}].slice(-5);}}
export function ownedCount(profile,id){return Math.max(0,profile.inventory?.[id]??(profile.pets.includes(id)?1:0));}
export function reward(profile,r=Math.random){
 const group=GROUPS[profile.eggGroup]||GROUPS[0],roll=r();
 const rarity=roll<.03?'secret':roll<.23?'rare':'common';
 const pool=group.petIds.map(id=>PETS[id]).filter(p=>p.rarity===rarity);
 const pet=pool[rand(pool.length,r)],previous=ownedCount(profile,pet.id);const isNew=!profile.pets.includes(pet.id);
 profile.inventory ||= Object.fromEntries(profile.pets.map(id=>[id,1]));profile.inventory[pet.id]=previous+1;if(isNew)profile.pets.push(pet.id);
 profile.rounds++;profile.stars+=6;profile.eggHistory ||= {};profile.eggHistory[group.id]=(profile.eggHistory[group.id]||0)+1;
 return {pet,isNew,count:previous+1,group,groupComplete:groupProgress(profile,group.id)===10};
}
export function tradeOptions(profile,id){const pet=PETS[id];if(!pet)return [];return GROUPS[pet.group].petIds.map(x=>PETS[x]).filter(p=>!profile.pets.includes(p.id));}
export function tradeCopies(profile,id,r=Math.random){
 const pet=PETS[id],count=ownedCount(profile,id),missing=tradeOptions(profile,id);
 if(!pet||count<4||!missing.length)return {ok:false,reason:!pet?'invalid':count<4?'insufficient':'complete'};
 const chosen=missing[rand(missing.length,r)];
 profile.inventory ||= Object.fromEntries(profile.pets.map(x=>[x,1]));profile.inventory[id]=count-4;
 if(count===4){delete profile.inventory[id];profile.pets=profile.pets.filter(x=>x!==id);}
 profile.inventory[chosen.id]=ownedCount(profile,chosen.id)+1;profile.pets.push(chosen.id);
 if(profile.favorite===id&&count===4)profile.favorite=chosen.id;profile.trades=(profile.trades||0)+1;
 return {ok:true,pet:chosen,source:pet,isNew:true,count:1,group:GROUPS[pet.group],groupComplete:groupProgress(profile,pet.group)===10,trade:true};
}
export function tableQuestion(table=null,factor=null,r=Math.random){
 const t=Number.isInteger(table)&&table>=1&&table<=10?table:1+rand(10,r),f=Number.isInteger(factor)&&factor>=1&&factor<=10?factor:1+rand(10,r),answer=t*f;
 return {topic:'tables',level:1,table:t,factor:f,answer,prompt:`${f} × ${t} = ?`,spoken:`Hoeveel is ${f} keer ${t}?`,hint:f===1?`Eén keer ${t} is één groepje van ${t}.`:`Tel ${f} keer ${t}. ${f>5?`Vijf keer ${t} is ${5*t}. Tel vanaf daar verder.`:`Twee keer ${t} is ${2*t}.`}`,explanation:`${f} keer ${t} is ${answer}.`,visual:f*t<=50?{type:'groups',a:t,b:f}:null,choices:options(answer,plain,r,[answer-t,answer+t,answer+1])};
}
export function safeProfile(raw,age){const p=freshProfile(age);if(!raw||typeof raw!=='object')return p;for(const k of Object.keys(TOPICS)){if(Number.isInteger(raw.levels?.[k]))p.levels[k]=Math.max(1,Math.min(6,raw.levels[k]));const s=raw.stats?.[k];if(s&&Number.isInteger(s.attempted)&&s.attempted>=0&&Number.isInteger(s.correct)&&s.correct>=0&&s.correct<=s.attempted)p.stats[k]=s;if(Number.isInteger(raw.streaks?.[k]))p.streaks[k]=Math.max(0,Math.min(2,raw.streaks[k]));}if(Array.isArray(raw.pets))p.pets=[...new Set([0,...raw.pets.filter(id=>PETS.some(x=>x.id===id))])];if(raw.inventory&&typeof raw.inventory==='object'&&!Array.isArray(raw.inventory)){p.inventory={};for(const pet of PETS){const n=raw.inventory[pet.id];if(Number.isInteger(n)&&n>0)p.inventory[pet.id]=Math.min(99999,n);}p.pets=Object.keys(p.inventory).map(Number);if(!p.pets.length){p.pets=[0];p.inventory={0:1};}}else p.inventory=Object.fromEntries(p.pets.map(id=>[id,1]));p.favorite=p.pets.includes(raw.favorite)?raw.favorite:p.pets[0];
if(Number.isInteger(raw.trades)&&raw.trades>=0)p.trades=raw.trades;
for(const k of ['played','wins','correct'])if(Number.isInteger(raw.battleStats?.[k])&&raw.battleStats[k]>=0)p.battleStats[k]=raw.battleStats[k];
if(raw.eggHistory&&typeof raw.eggHistory==='object')for(const g of GROUPS)if(Number.isInteger(raw.eggHistory[g.id])&&raw.eggHistory[g.id]>=0)p.eggHistory[g.id]=raw.eggHistory[g.id];if(Number.isInteger(raw.eggGroup)&&GROUPS[raw.eggGroup])p.eggGroup=raw.eggGroup;for(const k of ['rounds','stars'])if(Number.isInteger(raw[k])&&raw[k]>=0)p[k]=raw[k];p.review=Array.isArray(raw.review)?raw.review.filter(q=>TOPICS[q?.topic]&&Number.isInteger(q.level)&&q.level>=1&&q.level<=6).slice(-5):[];return p;}
