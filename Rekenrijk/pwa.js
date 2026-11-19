/* Installation is optional; never interrupt an active round to update. */
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;});
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{console.warn('Offline bewaren is niet gelukt. Het spel blijft online beschikbaar.');});});}
document.addEventListener('click',async event=>{
 if(!event.target.closest('[data-action="pwa-install"]'))return;
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;return;}
 const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 const dialog=document.createElement('dialog');
 dialog.innerHTML=`<h2>${standalone?'Je speelt in de app!':'Zet RekenRijk op je telefoon'}</h2><p style="margin:16px 0;line-height:1.6">${standalone?'RekenRijk staat al op je beginscherm.':'<strong>iPhone / iPad:</strong> open deze website in Safari, tik op Delen en kies Zet op beginscherm. Zet Open als webapp aan als die optie verschijnt.<br><br><strong>Android:</strong> open deze website in Chrome. Tik op het menu ⋮ en kies App installeren of Toevoegen aan startscherm.'}</p><p style="margin:16px 0;line-height:1.6">Open het spel de eerste keer online en wacht even terwijl de vriendjes worden bewaard. Multiplayer heeft altijd internet nodig. De beschikbaarheid van een Nederlandse stem zonder internet hangt af van je apparaat.</p><button class="button purple">Begrepen</button>`;
 dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
});
