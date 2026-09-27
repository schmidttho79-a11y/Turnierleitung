function downloadPrefilledTemplate(){
  try{
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

    /* Nur der Teamfilter bleibt interaktiv. Turnierdaten und Ergebnisse sind nicht editierbar. */
    var participantScript=document.createElement('script');
    participantScript.textContent="(function(){'use strict';var select=document.getElementById('participantTeamFilter'),reset=document.getElementById('participantResetBtn'),cards=document.getElementById('participantCards'),tbody=document.querySelector('#participantScheduleTable tbody'),hint=document.getElementById('participantCountHint');function apply(){var team=select?select.value:'all',visible=0;if(cards){cards.querySelectorAll('.match-card').forEach(function(card){var ok=team==='all'||card.dataset.home===team||card.dataset.away===team;card.classList.toggle('hidden',!ok);if(ok)visible++;});cards.querySelectorAll('.slot-block').forEach(function(block){var has=Array.prototype.some.call(block.querySelectorAll('.match-card'),function(card){return !card.classList.contains('hidden');});block.classList.toggle('hidden',!has);});}if(tbody)tbody.querySelectorAll('tr').forEach(function(row){var ok=team==='all'||row.dataset.home===team||row.dataset.away===team;row.classList.toggle('hidden',!ok);});if(hint)hint.textContent=visible+(visible===1?' Spiel sichtbar':' Spiele sichtbar');}if(select)select.addEventListener('change',apply);if(reset)reset.addEventListener('click',function(){if(select)select.value='all';apply();});apply();})();";
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


applyInitialState();renderAll();switchView('admin');

/* Gemeinsame PWA-Navigation */
var plannerShellTab=document.getElementById('plannerShellTab');
var timeShellTab=document.getElementById('timeShellTab');
var plannerModule=document.getElementById('plannerModule');
var timekeepingModule=document.getElementById('timekeepingModule');
