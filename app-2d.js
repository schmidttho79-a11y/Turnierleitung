function switchModule(moduleName){
  var isTime=moduleName==='time';
  plannerModule.classList.toggle('hidden',isTime);
  timekeepingModule.classList.toggle('hidden',!isTime);
  plannerShellTab.classList.toggle('active',!isTime);
  timeShellTab.classList.toggle('active',isTime);
  plannerShellTab.setAttribute('aria-selected',String(!isTime));
  timeShellTab.setAttribute('aria-selected',String(isTime));
  window.scrollTo({top:0,behavior:'auto'});
}
plannerShellTab.addEventListener('click',function(){switchModule('planner');});
timeShellTab.addEventListener('click',function(){switchModule('time');});

/* Zeitnahme – bewusst noch unabhängig vom Turnierplan */
var clockDisplay=document.getElementById('clockDisplay');
var clockDisplayLabel=document.getElementById('clockDisplayLabel');
var clockStartBtn=document.getElementById('clockStartBtn');
var clockStopBtn=document.getElementById('clockStopBtn');
var clockResetBtn=document.getElementById('clockResetBtn');
var clockStatus=document.getElementById('clockStatus');
var clockStopwatchModeBtn=document.getElementById('clockStopwatchModeBtn');
var clockTimerModeBtn=document.getElementById('clockTimerModeBtn');
var clockTimerSettings=document.getElementById('clockTimerSettings');
var clockTimerMinutes=document.getElementById('clockTimerMinutes');
var clockTimerSeconds=document.getElementById('clockTimerSeconds');
var clockMode='stopwatch',clockRunning=false,clockStartedAt=0,clockElapsed=0,clockRemaining=300000,clockFrame=null,clockLastSecond=-1;
function clockClamp(value,min,max){var n=parseInt(value,10);if(isNaN(n))return min;return Math.min(max,Math.max(min,n));}
function clockNormalizeInputs(){clockTimerMinutes.value=clockClamp(clockTimerMinutes.value,0,999);clockTimerSeconds.value=clockClamp(clockTimerSeconds.value,0,59);}
function clockConfiguredMs(){clockNormalizeInputs();return ((Number(clockTimerMinutes.value)*60)+Number(clockTimerSeconds.value))*1000;}
function clockCurrentMs(){if(clockMode==='stopwatch')return clockRunning?clockElapsed+(Date.now()-clockStartedAt):clockElapsed;return clockRunning?Math.max(0,clockRemaining-(Date.now()-clockStartedAt)):clockRemaining;}
function clockFormat(ms){var raw=Math.max(0,ms/1000),total=clockMode==='timer'?Math.ceil(raw):Math.floor(raw),minutes=Math.floor(total/60),seconds=total%60;return String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');}
function clockStopFrame(){if(clockFrame!==null){cancelAnimationFrame(clockFrame);clockFrame=null;}}
function clockButtons(){clockStartBtn.disabled=clockRunning;clockStopBtn.disabled=!clockRunning;}
function clockRender(force){var value=clockCurrentMs(),second=Math.ceil(value/1000);if(force||second!==clockLastSecond){clockDisplay.textContent=clockFormat(value);clockLastSecond=second;}if(clockMode==='timer'&&clockRunning&&value<=0){clockRemaining=0;clockRunning=false;clockStopFrame();clockStatus.textContent='Abgelaufen';clockButtons();clockDisplay.textContent='00:00';return;}if(clockRunning)clockFrame=requestAnimationFrame(function(){clockRender(false);});}
function clockStart(){if(clockRunning)return;if(clockMode==='timer'&&clockRemaining<=0){clockRemaining=clockConfiguredMs();if(clockRemaining<=0){clockStatus.textContent='Bitte eine Zeit größer als 00:00 einstellen';return;}}clockRunning=true;clockStartedAt=Date.now();clockStatus.textContent=clockMode==='stopwatch'?(clockElapsed>0?'Läuft weiter':'Läuft'):'Timer läuft';clockButtons();clockRender(true);}
function clockStop(){if(!clockRunning)return;if(clockMode==='stopwatch')clockElapsed+=Date.now()-clockStartedAt;else clockRemaining=Math.max(0,clockRemaining-(Date.now()-clockStartedAt));clockRunning=false;clockStopFrame();clockStatus.textContent='Gestoppt';clockButtons();clockRender(true);}
function clockReset(){clockRunning=false;clockStartedAt=0;clockStopFrame();clockLastSecond=-1;if(clockMode==='stopwatch'){clockElapsed=0;clockStatus.textContent='Bereit';}else{clockRemaining=clockConfiguredMs();clockStatus.textContent='Timer bereit';}clockButtons();clockRender(true);}
function clockSetMode(next){if(next===clockMode)return;clockRunning=false;clockStartedAt=0;clockStopFrame();clockLastSecond=-1;clockMode=next;var timer=next==='timer';clockStopwatchModeBtn.classList.toggle('active',!timer);clockTimerModeBtn.classList.toggle('active',timer);clockStopwatchModeBtn.setAttribute('aria-selected',String(!timer));clockTimerModeBtn.setAttribute('aria-selected',String(timer));clockTimerSettings.classList.toggle('hidden',!timer);if(timer){clockRemaining=clockConfiguredMs();clockDisplayLabel.textContent='Restzeit';clockStatus.textContent='Timer bereit';}else{clockElapsed=0;clockDisplayLabel.textContent='Minuten : Sekunden';clockStatus.textContent='Bereit';}clockButtons();clockRender(true);}
function clockInputChanged(){if(clockMode!=='timer'||clockRunning)return;clockRemaining=clockConfiguredMs();clockLastSecond=-1;clockStatus.textContent='Timer bereit';clockRender(true);}
clockStopwatchModeBtn.addEventListener('click',function(){clockSetMode('stopwatch');});
clockTimerModeBtn.addEventListener('click',function(){clockSetMode('timer');});
clockStartBtn.addEventListener('click',clockStart);clockStopBtn.addEventListener('click',clockStop);clockResetBtn.addEventListener('click',clockReset);
clockTimerMinutes.addEventListener('input',clockInputChanged);clockTimerSeconds.addEventListener('input',clockInputChanged);clockTimerMinutes.addEventListener('change',clockInputChanged);clockTimerSeconds.addEventListener('change',clockInputChanged);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')clockRender(true);});
clockButtons();clockRender(true);switchModule('planner');
