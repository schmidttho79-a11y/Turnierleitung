function esc(v){var m={'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'};return String(v).replace(/[&<>'"]/g,function(c){return m[c];});}
function clampInt(v,min,max,fallback){var n=parseInt(v,10);if(isNaN(n))n=fallback;return Math.max(min,Math.min(max,n));}
function normalizeTime(){var raw=(startTimeInput.value||'').trim(),x=raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);if(!x)return null;return Number(x[1])*60+Number(x[2]);}
function tournamentTitle(){var value=(tournamentTitleInput.value||'').trim().slice(0,80);return value||'Jugendturnier Germania Ginnheim';}
function updateTournamentTitle(){var title=tournamentTitle();if(tournamentTitleDisplay)tournamentTitleDisplay.textContent=title;document.title=title+' – Turnierleitung';}
function scoreTrackingEnabled(){return scoreTrackingInput.value==='yes';}
function roundBreakMinutes(){return gameModeSelect.value==='double'?clampInt(roundBreakInput.value,0,240,0):0;}
function normalizeRoundBreakInput(){roundBreakInput.value=clampInt(roundBreakInput.value,0,240,0);}
function updateRoundBreakVisibility(){roundBreakBox.classList.toggle('hidden',gameModeSelect.value!=='double');}
function matchStartMinute(m,base,dur,pause){return base+m.slot*(dur+pause)+(m.phase==='Rückrunde'?roundBreakMinutes():0);}
function fmt(t){t=((t%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
function kickoffTeamName(m){return m.kickoff==='away'?m.away:m.home;}
function teamDisplay(name,isKickoff,isAway){return isKickoff?(isAway?esc(name)+' ⚽':'⚽ '+esc(name)):esc(name);}
function ensureKickoffLegends(){
  function addLegend(id,beforeEl){
    if(!beforeEl||document.getElementById(id))return;
    var legend=document.createElement('div');
    legend.id=id;
    legend.className='kickoff-legend';
    legend.setAttribute('aria-label','Legende');
    legend.textContent='⚽ = Anstoß';
    legend.style.cssText='color:var(--muted);font-size:.88rem;font-weight:700;margin:0 2px 10px;';
    beforeEl.parentNode.insertBefore(legend,beforeEl);
  }
  addLegend('participantKickoffLegend',participantCards);
  addLegend('adminKickoffLegend',adminScoreNote);
}
function matchKey(m){return JSON.stringify([m.phase,m.home,m.away]);}
function scoreValue(key,side){var s=scores[key];if(!s)return '';var v=s[side];return v===null||v===undefined?'':String(v);}
function completeScore(m){var s=scores[matchKey(m)];return !!(s&&s.home!==null&&s.home!==undefined&&s.away!==null&&s.away!==undefined);}
function resultText(m){return completeScore(m)?scores[matchKey(m)].home+' : '+scores[matchKey(m)].away:'– : –';}

function switchView(view){
  var admin=view==='admin';
  participantView.classList.toggle('hidden',admin);adminView.classList.toggle('hidden',!admin);
  participantTab.classList.toggle('active',!admin);adminTab.classList.toggle('active',admin);
  participantTab.setAttribute('aria-selected',String(!admin));adminTab.setAttribute('aria-selected',String(admin));
  try{history.replaceState(null,'',admin?'#admin':'#participant');}catch(e){}
}

function getTeams(){var a=[];teamEditor.querySelectorAll('.team-input').forEach(function(input){var n=(input.value||'').trim().slice(0,40);if(n&&a.indexOf(n)===-1)a.push(n);});return a;}
function addTeamRow(name){var row=document.createElement('div');row.className='team-row';var input=document.createElement('input');input.className='team-input';input.type='text';input.maxLength=40;input.value=name||'';input.placeholder='Mannschaft';input.setAttribute('aria-label','Mannschaft');var btn=document.createElement('button');btn.className='icon-btn remove-team-btn';btn.type='button';btn.textContent='Entfernen';btn.setAttribute('aria-label','Mannschaft entfernen');row.appendChild(input);row.appendChild(btn);teamEditor.appendChild(row);return input;}
function setTeamRows(teams){teamEditor.innerHTML='';teams.forEach(function(t){addTeamRow(t);});if(!teams.length){addTeamRow('Mannschaft 1');addTeamRow('Mannschaft 2');}}

function buildGames(teams,reverse,phase){var list=[];for(var i=0;i<teams.length;i++)for(var j=i+1;j<teams.length;j++)list.push(reverse?{home:teams[j],away:teams[i],phase:phase,kickoff:'home'}:{home:teams[i],away:teams[j],phase:phase,kickoff:'home'});return list;}
function packIntoSlots(games,fieldCount,startSlot){var remaining=games.slice(),slots=[],lastPlayed={},slotIndex=startSlot||0;while(remaining.length){var slot=[],used={};while(slot.length<fieldCount){var best=-1,bestScore=-Infinity;for(var i=0;i<remaining.length;i++){var g=remaining[i];if(used[g.home]||used[g.away])continue;var hGap=lastPlayed[g.home]===undefined?1000:slotIndex-lastPlayed[g.home],aGap=lastPlayed[g.away]===undefined?1000:slotIndex-lastPlayed[g.away],score=Math.min(hGap,aGap)*10000+(hGap+aGap)*10-i;if(score>bestScore){bestScore=score;best=i;}}if(best===-1)break;var chosen=remaining.splice(best,1)[0];slot.push(chosen);used[chosen.home]=true;used[chosen.away]=true;}if(!slot.length)slot.push(remaining.shift());slot.forEach(function(g,idx){g.field=idx+1;g.slot=slotIndex;lastPlayed[g.home]=slotIndex;lastPlayed[g.away]=slotIndex;});slots.push(slot);slotIndex++;}return {slots:slots,nextSlot:slotIndex};}
function roundRobinSlots(teams,reverse,phase,startSlot){var rotation=teams.slice();if(rotation.length%2===1)rotation.push(null);var rounds=rotation.length-1,slots=[];for(var r=0;r<rounds;r++){var slot=[];for(var i=0;i<rotation.length/2;i++){var a=rotation[i],b=rotation[rotation.length-1-i];if(a!==null&&b!==null){var g=reverse?{home:b,away:a,phase:phase,kickoff:'home'}:{home:a,away:b,phase:phase,kickoff:'home'};g.field=slot.length+1;g.slot=startSlot+r;slot.push(g);}}slots.push(slot);var last=rotation.pop();rotation.splice(1,0,last);}return {slots:slots,nextSlot:startSlot+rounds};}
function schedulePhase(teams,effective,maxPossible,reverse,phase,startSlot){return effective===maxPossible?roundRobinSlots(teams,reverse,phase,startSlot):packIntoSlots(buildGames(teams,reverse,phase),effective,startSlot);}
function makeSchedule(teams){var maxPossible=Math.max(1,Math.floor(teams.length/2)),fields=clampInt(fieldCountInput.value,1,10,2);fieldCountInput.value=fields;var effective=Math.min(fields,maxPossible),allSlots=[],slotNo=0,first=schedulePhase(teams,effective,maxPossible,false,'Hinrunde',slotNo);allSlots=allSlots.concat(first.slots);slotNo=first.nextSlot;if(gameModeSelect.value==='double'){var second=schedulePhase(teams,effective,maxPossible,true,'Rückrunde',slotNo);allSlots=allSlots.concat(second.slots);}var matches=[],no=1;allSlots.forEach(function(slot){slot.forEach(function(g){g.no=no++;matches.push(g);});});return matches;}

function updateFilters(teams){[participantTeamFilter,adminTeamFilter].forEach(function(sel){var current=sel.value||'all',h='<option value="all">Alle Mannschaften</option>';teams.forEach(function(t){h+='<option value="'+esc(t)+'">'+esc(t)+'</option>';});sel.innerHTML=h;sel.value=teams.indexOf(current)!==-1?current:'all';});}
function slotsFromMatches(){var slots={},order=[];currentMatches.forEach(function(m){if(!slots[m.slot]){slots[m.slot]=[];order.push(m.slot);}slots[m.slot].push(m);});order.sort(function(a,b){return a-b;});return {slots:slots,order:order};}

function renderCards(container,isAdmin){
  ensureKickoffLegends();
  var teams=getTeams(),base=normalizeTime(),dur=clampInt(durationInput.value,1,240,10),pause=clampInt(breakInput.value,0,240,5),grouped=slotsFromMatches(),html='',phaseCounters={};
  if(!currentMatches.length){container.innerHTML='<div class="empty-state">Bitte mindestens zwei unterschiedliche Mannschaften eintragen.</div>';return;}
  grouped.order.forEach(function(slotNo){var matches=grouped.slots[slotNo],phase=matches[0].phase;phaseCounters[phase]=(phaseCounters[phase]||0)+1;var s=matchStartMinute(matches[0],base,dur,pause),e=s+dur,played={};matches.forEach(function(m){played[m.home]=true;played[m.away]=true;});var resting=teams.filter(function(t){return !played[t];});if(gameModeSelect.value==='double'&&phaseCounters[phase]===1){if(phase==='Rückrunde'&&roundBreakMinutes()>0)html+='<div class="phase-separator">Rückrunde · zusätzliche Pause vorher: '+roundBreakMinutes()+' Min.</div>';else html+='<div class="phase-separator">'+esc(phase)+'</div>';}
    html+='<section class="slot-block" data-slot="'+slotNo+'"><div class="slot-header"><span>'+(gameModeSelect.value==='double'?esc(phase)+' · ':'')+'Runde '+phaseCounters[phase]+'</span><span>'+fmt(s)+' – '+fmt(e)+'</span></div>'+(resting.length?'<div class="slot-pause">'+esc('Spielpause: '+resting.join(', '))+'</div>':'');
    matches.forEach(function(m){var key=matchKey(m),middle=scoreTrackingEnabled()?'<strong class="public-result">'+resultText(m)+'</strong>':'<strong>vs.</strong>',homeKickoff=kickoffTeamName(m)===m.home,awayKickoff=kickoffTeamName(m)===m.away;html+='<article class="match-card" data-home="'+esc(m.home)+'" data-away="'+esc(m.away)+'" data-key="'+esc(key)+'"><div class="match-topline"><span class="badge">Spiel '+m.no+' · Feld '+m.field+'</span><span class="time">'+fmt(s)+' – '+fmt(e)+'</span></div><div class="teams"><span>'+teamDisplay(m.home,homeKickoff,false)+'</span>'+middle+'<span>'+teamDisplay(m.away,awayKickoff,true)+'</span></div><div class="meta"><span>'+esc(kickoffTeamName(m))+' hat Anstoß</span><span>'+dur+' Min. Spielzeit</span><span>danach '+pause+' Min. Pause</span></div>';
      if(scoreTrackingEnabled())html+='<div class="score-editor active"><div class="score-side"><span>'+teamDisplay(m.home,homeKickoff,false)+'</span><input class="score-input" type="number" min="0" max="99" inputmode="numeric" data-score-side="home" value="'+esc(scoreValue(key,'home'))+'" aria-label="Tore '+esc(m.home)+'"></div><span class="score-sep">:</span><div class="score-side"><span>'+teamDisplay(m.away,awayKickoff,true)+'</span><input class="score-input" type="number" min="0" max="99" inputmode="numeric" data-score-side="away" value="'+esc(scoreValue(key,'away'))+'" aria-label="Tore '+esc(m.away)+'"></div></div>';
      html+='</article>';});html+='</section>';});container.innerHTML=html;
}
