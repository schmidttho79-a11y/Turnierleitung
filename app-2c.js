function formatTournamentDate(value){
  var m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?m[3]+'.'+m[2]+'.'+m[1]:String(value||'');
}
function safeFilePart(value){
  return String(value||'Turnier')
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue')
    .replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,60)||'Turnier';
}
function pdfWinAnsiHex(value){
  var replacements={'–':'-','—':'-','−':'-','“':'"','”':'"','„':'"','’':"'",'‘':"'",'…':'...','⚽':'*','\u00a0':' '};
  var text=String(value==null?'':value),hex='';
  for(var i=0;i<text.length;i++){
    var ch=text.charAt(i);
    if(replacements[ch]!==undefined){
      var rep=replacements[ch];
      for(var r=0;r<rep.length;r++)hex+=rep.charCodeAt(r).toString(16).padStart(2,'0');
      continue;
    }
    var code=text.charCodeAt(i);
    if(code>=32&&code<=255)hex+=code.toString(16).padStart(2,'0');
    else if(code===9||code===10||code===13)hex+='20';
    else hex+='3f';
  }
  return '<'+hex.toUpperCase()+'>';
}
function pdfFitText(value,width,fontSize){
  var text=String(value==null?'':value).replace(/⚽/g,'').trim();
  var max=Math.max(2,Math.floor((width-10)/(fontSize*.54)));
  return text.length<=max?text:text.slice(0,Math.max(1,max-2))+'..';
}
function buildSchedulePdf(){
  var pageW=841.89,pageH=595.28,margin=28,tableW=pageW-margin*2,tableTop=88,headerH=24,rowH=24,rowsPerPage=18;
  var showResult=scoreTrackingEnabled(),base=normalizeTime(),dur=clampInt(durationInput.value,1,240,10),pause=clampInt(breakInput.value,0,240,5);
  var columns=showResult?
    [{label:'Nr.',w:32},{label:'Start',w:50},{label:'Ende',w:50},{label:'Feld',w:50},{label:'Mannschaft A',w:225},{label:'Mannschaft B',w:225},{label:'Anstoß',w:90},{label:'Ergebnis',w:64}]:
    [{label:'Nr.',w:32},{label:'Start',w:50},{label:'Ende',w:50},{label:'Feld',w:50},{label:'Mannschaft A',w:245},{label:'Mannschaft B',w:245},{label:'Anstoß',w:114}];
  var widthSum=columns.reduce(function(sum,c){return sum+c.w;},0),scale=tableW/widthSum;
  columns.forEach(function(c){c.w*=scale;});
  var rows=currentMatches.map(function(m){var start=matchStartMinute(m,base,dur,pause),end=start+dur;var row=[String(m.no),fmt(start),fmt(end),'Feld '+m.field,m.home,m.away,kickoffTeamName(m)];if(showResult)row.push(resultText(m));return row;});
  var pageCount=Math.max(1,Math.ceil(rows.length/rowsPerPage)),streams=[];
  function yFromTop(top){return pageH-top;}
  function textCmd(x,baselineTop,font,size,value,gray){return (gray===undefined?'0':gray)+' g BT /'+font+' '+size+' Tf 1 0 0 1 '+x.toFixed(2)+' '+yFromTop(baselineTop).toFixed(2)+' Tm '+pdfWinAnsiHex(value)+' Tj ET\n';}
  function fillRect(x,top,w,h,r,g,b){return r+' '+g+' '+b+' rg '+x.toFixed(2)+' '+(pageH-top-h).toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re f\n';}
  function strokeRect(x,top,w,h,gray){return (gray===undefined?'0.76':gray)+' G 0.6 w '+x.toFixed(2)+' '+(pageH-top-h).toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re S\n';}
  for(var p=0;p<pageCount;p++){
    var stream='';
    stream+=textCmd(margin,32,'F2',18,pdfFitText(tournamentTitle(),tableW,18),0);
    stream+=textCmd(margin,52,'F1',10,'Datum: '+formatTournamentDate(tournamentDateInput.value),0.28);
    stream+=textCmd(margin,72,'F2',11,'Spielplan',0.20);
    var x=margin;
    columns.forEach(function(c){stream+=fillRect(x,tableTop,c.w,headerH,'0','0.247','0.451');stream+=strokeRect(x,tableTop,c.w,headerH,'0.35');stream+=textCmd(x+5,tableTop+16,'F2',8.5,c.label,1);x+=c.w;});
    var pageRows=rows.slice(p*rowsPerPage,(p+1)*rowsPerPage);
    pageRows.forEach(function(row,ri){var top=tableTop+headerH+ri*rowH;x=margin;if(ri%2===1)stream+=fillRect(margin,top,tableW,rowH,'0.968','0.982','1');columns.forEach(function(c,ci){stream+=strokeRect(x,top,c.w,rowH,'0.78');stream+=textCmd(x+5,top+16,'F1',8.5,pdfFitText(row[ci],c.w,8.5),0);x+=c.w;});});
    stream+=textCmd(margin,pageH-14,'F1',8,'Seite '+(p+1)+' von '+pageCount,0.40);
    streams.push(stream);
  }
  var objects=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  var kids=[];
  streams.forEach(function(stream,i){var pageId=5+i*2,contentId=pageId+1;kids.push(pageId+' 0 R');objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentId+' 0 R >>';objects[contentId]='<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream';});
  objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+streams.length+' >>';
  var pdf='%PDF-1.4\n%Turnierleitung\n',offsets=[0];
  for(var id=1;id<objects.length;id++){offsets[id]=pdf.length;pdf+=id+' 0 obj\n'+objects[id]+'\nendobj\n';}
  var xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(var j=1;j<objects.length;j++)pdf+=String(offsets[j]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return new TextEncoder().encode(pdf);
}
function downloadSchedulePdf(){
  try{
    if(!tournamentDateInput||!tournamentDateInput.value){alert('Bitte zuerst das Turnierdatum auswählen.');if(tournamentDateInput)tournamentDateInput.focus();return;}
    if(!currentMatches.length){alert('Bitte zuerst einen Spielplan mit mindestens einem Spiel erstellen.');return;}
    var bytes=buildSchedulePdf(),blob=new Blob([bytes],{type:'application/pdf'}),anchor=document.createElement('a');
    anchor.download='Spielplan_'+safeFilePart(tournamentTitle())+'_'+tournamentDateInput.value+'.pdf';
    anchor.href=URL.createObjectURL(blob);anchor.style.display='none';document.body.appendChild(anchor);anchor.click();
    setTimeout(function(){URL.revokeObjectURL(anchor.href);if(anchor.parentNode)anchor.parentNode.removeChild(anchor);},1500);
  }catch(error){
    console.error(error);
    alert('Die PDF-Datei konnte nicht erzeugt werden.');
  }
}

function downloadPrefilledTemplate(){
  try{
    if(!currentMatches.length){alert('Bitte zuerst einen Spielplan mit mindestens einem Spiel erstellen.');return;}
    /* Exportiert nur die aktuell gerenderte Teilnehmeransicht als statische Offline-Datei. */
    var exportLogoDataUrl='';
    try{
      var liveLogo=document.querySelector('img.logo');
      if(liveLogo&&liveLogo.complete&&liveLogo.naturalWidth){
        var logoCanvas=document.createElement('canvas');
        logoCanvas.width=liveLogo.naturalWidth;
        logoCanvas.height=liveLogo.naturalHeight;
        var logoContext=logoCanvas.getContext('2d');
        logoContext.drawImage(liveLogo,0,0);
        exportLogoDataUrl=logoCanvas.toDataURL('image/png');
      }
    }catch(logoError){console.warn('Logo konnte für den Export nicht eingebettet werden.',logoError);}

    var exportCss='';
    try{
      Array.prototype.forEach.call(document.styleSheets,function(sheet){
        Array.prototype.forEach.call(sheet.cssRules||[],function(rule){exportCss+=rule.cssText+'\n';});
      });
    }catch(cssError){console.warn('Styles konnten für den Export nicht vollständig eingebettet werden.',cssError);}

    var clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){link.remove();});
    if(exportCss){
      var exportStyle=document.createElement('style');
      exportStyle.textContent=exportCss;
      var cloneHead=clone.querySelector('head');
      if(cloneHead)cloneHead.appendChild(exportStyle);
    }
    var cloneBody=clone.querySelector('body');
    var cloneLogo=clone.querySelector('img.logo');
    if(cloneLogo&&exportLogoDataUrl)cloneLogo.setAttribute('src',exportLogoDataUrl);
    var participant=clone.querySelector('#participantView');
    var switcher=clone.querySelector('.view-switcher');
    var shellNav=clone.querySelector('.app-shell-nav');
    var plannerModule=clone.querySelector('#plannerModule');
    var timekeepingModule=clone.querySelector('#timekeepingModule');
    var admin=clone.querySelector('#adminView');
    var stateEl=clone.querySelector('#prefilledState');

    if(switcher)switcher.remove();
    if(shellNav)shellNav.remove();
    if(timekeepingModule)timekeepingModule.remove();
    if(plannerModule){plannerModule.classList.remove('module-view','hidden');plannerModule.removeAttribute('id');}
    if(admin)admin.remove();
    if(stateEl)stateEl.remove();
    clone.querySelectorAll('script').forEach(function(s){s.remove();});

    if(participant){
      participant.classList.remove('hidden');
      participant.style.display='block';
      participant.removeAttribute('id');
    }

    /* Der Export startet immer mit allen Mannschaften sichtbar. */
    var filter=clone.querySelector('#participantTeamFilter');
    if(filter){
      Array.prototype.forEach.call(filter.options,function(opt){
        if(opt.value==='all')opt.setAttribute('selected','selected');
        else opt.removeAttribute('selected');
      });
    }
    clone.querySelectorAll('#participantCards .match-card, #participantCards .slot-block, #participantScheduleTable tbody tr').forEach(function(el){el.classList.remove('hidden');});
    var hint=clone.querySelector('#participantCountHint');
    var total=clone.querySelectorAll('#participantCards .match-card').length;
    if(hint)hint.textContent=total+(total===1?' Spiel sichtbar':' Spiele sichtbar');

    var title=clone.querySelector('title');
    if(title)title.textContent=tournamentTitle()+' – Teilnehmeransicht';

    /* Teamfilter und lokale Ergebniserfassung bleiben im Export interaktiv. */
    var participantScript=document.createElement('script');
    participantScript.textContent=`(function(){
'use strict';
var select=document.getElementById('participantTeamFilter');
var reset=document.getElementById('participantResetBtn');
var cards=document.getElementById('participantCards');
var tbody=document.querySelector('#participantScheduleTable tbody');
var hint=document.getElementById('participantCountHint');
var standingsBody=document.getElementById('participantStandingsBody');

function esc(v){var m={'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'};return String(v).replace(/[&<>'"]/g,function(c){return m[c];});}
function parseScore(v){if(v==='')return null;var n=parseInt(v,10);if(isNaN(n)||n<0)return null;return Math.min(99,n);}
function rowForKey(key){if(!tbody)return null;var rows=tbody.querySelectorAll('tr');for(var i=0;i<rows.length;i++){if(rows[i].dataset.key===key)return rows[i];}return null;}
function scoreFromCard(card){var h=card.querySelector('[data-score-side="home"]'),a=card.querySelector('[data-score-side="away"]');return {home:h?parseScore(h.value):null,away:a?parseScore(a.value):null,homeInput:h,awayInput:a};}
function updateCard(card){var score=scoreFromCard(card);if(score.homeInput)score.homeInput.value=score.home===null?'':score.home;if(score.awayInput)score.awayInput.value=score.away===null?'':score.away;var complete=score.home!==null&&score.away!==null;var text=complete?score.home+' : '+score.away:'– : –';var display=card.querySelector('.public-result');if(display)display.textContent=text;var row=rowForKey(card.dataset.key||'');if(row){var cell=row.querySelector('.result-cell');if(cell)cell.textContent=text;}return score;}
function updateStandings(){if(!standingsBody||!cards)return;var stats={};cards.querySelectorAll('.match-card').forEach(function(card){var home=card.dataset.home,away=card.dataset.away;if(!stats[home])stats[home]={team:home,played:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};if(!stats[away])stats[away]={team:away,played:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};var score=scoreFromCard(card);if(score.home===null||score.away===null)return;var h=stats[home],a=stats[away];h.played++;a.played++;h.gf+=score.home;h.ga+=score.away;a.gf+=score.away;a.ga+=score.home;if(score.home>score.away){h.w++;a.l++;h.pts+=3;}else if(score.home<score.away){a.w++;h.l++;a.pts+=3;}else{h.d++;a.d++;h.pts++;a.pts++;}});var arr=Object.keys(stats).map(function(k){return stats[k];});arr.sort(function(a,b){return b.pts-a.pts||((b.gf-b.ga)-(a.gf-a.ga))||b.gf-a.gf||a.team.localeCompare(b.team,'de');});standingsBody.innerHTML=arr.map(function(s,i){var diff=s.gf-s.ga;return '<tr><td>'+(i+1)+'</td><td>'+esc(s.team)+'</td><td class="num">'+s.played+'</td><td class="num">'+s.w+'</td><td class="num">'+s.d+'</td><td class="num">'+s.l+'</td><td class="num">'+s.gf+':'+s.ga+'</td><td class="num">'+(diff>0?'+':'')+diff+'</td><td class="num"><strong>'+s.pts+'</strong></td></tr>';}).join('');}
function apply(){var team=select?select.value:'all',visible=0;if(cards){cards.querySelectorAll('.match-card').forEach(function(card){var ok=team==='all'||card.dataset.home===team||card.dataset.away===team;card.classList.toggle('hidden',!ok);if(ok)visible++;});cards.querySelectorAll('.slot-block').forEach(function(block){var has=Array.prototype.some.call(block.querySelectorAll('.match-card'),function(card){return !card.classList.contains('hidden');});block.classList.toggle('hidden',!has);});}if(tbody)tbody.querySelectorAll('tr').forEach(function(row){var ok=team==='all'||row.dataset.home===team||row.dataset.away===team;row.classList.toggle('hidden',!ok);});if(hint)hint.textContent=visible+(visible===1?' Spiel sichtbar':' Spiele sichtbar');}
if(cards){cards.addEventListener('input',function(e){if(e.target.classList.contains('score-input')){var card=e.target.closest('.match-card');if(card){updateCard(card);updateStandings();}}});cards.addEventListener('change',function(e){if(e.target.classList.contains('score-input')){var card=e.target.closest('.match-card');if(card){updateCard(card);updateStandings();}}});}
if(select)select.addEventListener('change',apply);
if(reset)reset.addEventListener('click',function(){if(select)select.value='all';apply();});
if(cards){cards.querySelectorAll('.match-card').forEach(updateCard);}
updateStandings();
apply();
})();`;
    if(cloneBody)cloneBody.appendChild(participantScript);

    var htmlContent='<!doctype html>\n'+clone.outerHTML;
    var fileName='Jugendturnier_Germania_Teilnehmeransicht_v3_1.html';
    var blob=new Blob([htmlContent],{type:'text/html;charset=utf-8'});
    var anchor=document.createElement('a');
    anchor.download=fileName;
    anchor.href=URL.createObjectURL(blob);
    anchor.style.display='none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(function(){URL.revokeObjectURL(anchor.href);if(anchor.parentNode)anchor.parentNode.removeChild(anchor);},1000);
  }catch(error){
    console.error(error);
    alert('Die Teilnehmeransicht konnte nicht gespeichert werden.');
  }
}

participantTab.addEventListener('click',function(){switchView('participant');});adminTab.addEventListener('click',function(){switchView('admin');});
tournamentTitleInput.addEventListener('input',function(){this.value=this.value.slice(0,80);updateTournamentTitle();});
tournamentTitleInput.addEventListener('change',function(){if(!this.value.trim())this.value='Jugendturnier Germania Ginnheim';updateTournamentTitle();});
tournamentDateInput.addEventListener('change',function(){this.value=String(this.value||'').slice(0,10);});
addTeamBtn.addEventListener('click',function(){var input=addTeamRow('');input.focus();renderAll();});
teamEditor.addEventListener('click',function(e){if(e.target.classList.contains('remove-team-btn')){var rows=teamEditor.querySelectorAll('.team-row');if(rows.length<=2){alert('Für ein Turnier werden mindestens zwei Mannschaften benötigt.');return;}e.target.closest('.team-row').remove();renderAll();}});
teamEditor.addEventListener('input',function(e){if(e.target.classList.contains('team-input'))e.target.value=e.target.value.slice(0,40);});
teamEditor.addEventListener('change',function(e){if(e.target.classList.contains('team-input'))renderAll();});
[startTimeInput,durationInput,breakInput,roundBreakInput,fieldCountInput].forEach(function(el){el.addEventListener('change',renderAll);});
gameModeSelect.addEventListener('change',renderAll);scoreTrackingInput.addEventListener('change',renderAll);
adminCards.addEventListener('input',function(e){if(e.target.classList.contains('score-input'))updateScoreFromInput(e.target);});
adminCards.addEventListener('change',function(e){if(e.target.classList.contains('score-input'))updateScoreFromInput(e.target);});
participantTeamFilter.addEventListener('change',applyParticipantFilter);adminTeamFilter.addEventListener('change',applyAdminFilter);
participantResetBtn.addEventListener('click',function(){participantTeamFilter.value='all';applyParticipantFilter();});adminResetBtn.addEventListener('click',function(){adminTeamFilter.value='all';applyAdminFilter();});
downloadPrefilledBtn.addEventListener('click',downloadPrefilledTemplate);
downloadPdfBtn.addEventListener('click',downloadSchedulePdf);


applyInitialState();renderAll();switchView('admin');

/* Gemeinsame PWA-Navigation */
var plannerShellTab=document.getElementById('plannerShellTab');
var timeShellTab=document.getElementById('timeShellTab');
var plannerModule=document.getElementById('plannerModule');
var timekeepingModule=document.getElementById('timekeepingModule');
