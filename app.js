/* MindHarbor: GitHub Pages-friendly, client-side guided wellbeing experience.
   This demo deliberately contains no API keys, remote AI calls, analytics or backend. */
(function() {
  'use strict';
  const L = window.MindHarborLogic;
  const A = window.MindHarborAdaptive;
  const V3 = window.MindHarborV3;
  const $ = id => document.getElementById(id);
  const find = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const KEYS = {save:'mindharbor:save-enabled:v1',report:'mindharbor:report:v1',theme:'mindharbor:theme:v1'};
  const state = { view:'home',stage:'idle',answers:[],report:null,safetyConcern:false,saveEnabled:false,breathing:false,breathElapsed:0,breathInterval:null,groundStep:0,lastFocus:null,adaptiveHistory:[],adaptiveAsked:[],adaptiveCurrent:null, v3Themes:[],v3Reason:"",v3Uncertainty:"",v3Busy:false, freeTalkHistory:[] };

  function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function safeSet(key,val) { try { localStorage.setItem(key,val); return true; } catch { return false; } }
  function safeRemove(key) { try { localStorage.removeItem(key); } catch {} }
  function icon(name) { const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); const use = document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href','#i-'+name); svg.appendChild(use); return svg; }
  function elem(tag,cls,txt) { const e=document.createElement(tag); if(cls)e.className=cls; if(txt!==undefined)e.textContent=txt; return e; }
  function formatDate(iso) { const d=new Date(iso); return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'}):'Date unavailable'; }
  function timeLabel() { return new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }
  function storageStatus() { $('storageStatus').textContent = state.saveEnabled ? 'Reports saved on this device' : 'Private by default · not saved'; $('saveToggle').checked=state.saveEnabled; }
  function showView(name) {
    if (!['home','chat','report','toolkit','privacy'].includes(name)) return;
    state.view=name;
    all('.view').forEach(section => { const active=section.id==='view-'+name; section.hidden=!active; section.classList.toggle('active',active); });
    all('.nav-btn').forEach(btn => { const active=btn.dataset.view===name; btn.classList.toggle('active',active); if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current'); });
    const titles={home:'Overview',chat:'Talk to Mindy',report:'My wellbeing report',toolkit:'Care toolkit',privacy:'Privacy & data'};
    $('breadcrumbPage').textContent=titles[name];
    closeMenu();
    if (name==='report') renderReport();
    if (name==='chat') setTimeout(()=>{ $('chatLog').scrollTop=$('chatLog').scrollHeight; },0);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function openMenu() { $('sidebar').classList.add('mobile-open'); $('mobileBackdrop').hidden=false; $('mobileMenu').setAttribute('aria-expanded','true'); }
  function closeMenu() { $('sidebar').classList.remove('mobile-open'); $('mobileBackdrop').hidden=true; $('mobileMenu').setAttribute('aria-expanded','false'); }

  function addMessage(by,text) {
    const msg=elem('div','chat-message '+(by==='user'?'user':'bot'));
    msg.appendChild(elem('span','message-avatar',by==='user'?'You':'✳'));
    const content=elem('div','message-content');
    content.appendChild(elem('div','message-bubble',text));
    content.appendChild(elem('span','message-time',timeLabel()));
    msg.appendChild(content);
    $('chatLog').appendChild(msg);
    $('chatLog').scrollTop=$('chatLog').scrollHeight;
  }
  function addBot(text) {addMessage('bot',text);}
  function addUser(text) {addMessage('user',text);}
  function addOptions(buttons) {
    const parent=$('chatOptions');parent.replaceChildren();
    buttons.forEach(({label,handle})=>{const b=elem('button','option-btn',label);b.type='button';b.addEventListener('click',handle);parent.appendChild(b);});
  }
  function updateInsights(){
    const analysis=A.analyze(state.adaptiveHistory);
    const parent=$('insightTags');parent.replaceChildren();
    const tags = state.v3Themes.length ? state.v3Themes : analysis.topicLabels;
    if(tags.length){
      tags.forEach(t=>parent.appendChild(elem('span','insight-tag',t)));
    }else parent.appendChild(elem('span','insight-tag neutral','No themes assumed yet'));
    $('insightReason').textContent=state.v3Reason || (state.adaptiveCurrent ? ((state.adaptiveCurrent.domain!=='general' && !analysis.scores[state.adaptiveCurrent.domain]) ? 'This topic has not clearly come up yet, so I am gently exploring another area. You can skip it.' : state.adaptiveCurrent.reason) : (state.stage==='assessment'?'Standard screening items are kept in their original wording for consistent scoring.':'Questions adapt to the words you choose; these are not clinical or behavioral judgments.'));
    $('v3Uncertainty').textContent=state.v3Uncertainty ? `Model-reported uncertainty: ${state.v3Uncertainty} (not calibrated; not a safety estimate).` : 'Uncertainty: not measured. The app may misunderstand your words.';
    const count=$('adaptiveCount');count.textContent=state.adaptiveAsked.length+' / '+A.TOTAL;
    const steps=$('adaptiveSteps');steps.replaceChildren();
    for(let i=0;i<A.TOTAL;i++){
      const dot=elem('span',i<state.adaptiveHistory.length?'done':i===state.adaptiveHistory.length&&state.stage==='adaptive'?'current':'');
      dot.title='Reflection '+(i+1);steps.appendChild(dot);
    }
    $('insightPhase').textContent=state.stage==='adaptive'?'ADAPTIVE MODE':state.stage==='assessment'?'STANDARD SCREENERS':state.stage==='complete'?'CHECK-IN FINISHED':'HOW Mindy ADAPTS';
  }
  function setProgress(){
    const total=L.questions.length+A.TOTAL;
    const step=Math.min(state.answers.length,L.questions.length)+Math.min(state.adaptiveHistory.length,A.TOTAL);
    const progress=state.report?100:Math.round(step/total*100);
    $('progressFill').style.width=progress+'%';$('progressPercent').textContent=progress+'%';
    $('progressTitle').textContent=state.report?'Check-in completed':state.stage==='adaptive'?'Learning what matters to you':state.stage==='assessment'?'Structured check-in underway':state.stage==='age'?'A quick note before we begin':'Ready when you are';
    $('progressDetail').textContent=state.report?'Your report is ready. You can start a fresh check-in at any time.':state.stage==='adaptive'?`${state.adaptiveHistory.length} of ${A.TOTAL} personal reflections. Next: validated screening questions.`:state.stage==='assessment'?`${state.answers.length} of 21 screening responses. Personal reflections complete.`:'7 adaptive reflections, 20 symptom questions and one impact question.';
    $('asideBegin').textContent=state.report?'Open my report':state.stage==='assessment'||state.stage==='adaptive'?'Continue my check-in':'Start adaptive check-in';
    $('asideBegin').appendChild(icon('arrow'));
    updateInsights();
  }
  function initialMessage(){
    if ($('chatLog').children.length)return;
    addBot('Hi, I’m Mindy. ✳ I’m your adaptive wellbeing companion. With your explicit permission, I can use an AI model to help choose a follow-up from a fixed question bank. Otherwise I use local text cues. Neither mode is clinical analysis. You can skip anything.\n\nWhat has your day been like?');
    addOptions([
      {label:'Start adaptive check-in',handle:beginCheckin},
      {label:'I’d like to talk first',handle:()=>{addUser('I’d like to talk first');addBot('Of course. What has been on your mind? Take your time — you can write in the box below.');addOptions([{label:'Start check-in instead',handle:beginCheckin}]);$('chatInput').focus();}},
      {label:'Try a calming exercise',handle:()=>showView('toolkit')}
    ]);
  }
  function beginCheckin(){
    showView('chat');
    if(state.stage==='assessment'){queueQuestion(false);return;}
    if(state.stage==='adaptive'){queueAdaptiveQuestion(false);return;}
    state.answers=[];state.report=null;state.safetyConcern=false;state.stage='age';state.adaptiveHistory=[];state.adaptiveAsked=[];state.adaptiveCurrent=null;state.v3Themes=[];state.v3Reason='';state.v3Uncertainty='';state.v3Busy=false;state.freeTalkHistory=[];
    $('chatLog').replaceChildren();
    addBot('Before we begin: this educational check-in is intended for adults aged 18 and over. It is not a diagnosis, treatment, or emergency service. Your reflections stay in this browser memory; completed numeric reports are saved locally only if you opt in.\n\nAre you 18 or older and happy to continue?');
    addOptions([
      {label:'Yes, I am 18 or older',handle:()=>{addUser('Yes, I am 18 or older');state.stage='adaptive';addBot('Thank you. First we’ll have a short, adaptive conversation. Each reply helps me select a relevant next question. After that, you can complete the full, standardized PHQ-9 and GAD-7 screeners plus an exploratory stress check. You can skip reflective questions.');queueAdaptiveQuestion();}},
      {label:'No, I am under 18',handle:()=>{addUser('No, I am under 18');state.stage='idle';addBot('This self-check is intended for adults. If you are under 18 and struggling, talk with a trusted adult or an age-appropriate health professional. If you are in immediate danger, call emergency services.');addOptions([{label:'View support contacts',handle:openSupport}]);setProgress();}},
      {label:'Not right now',handle:()=>{addUser('Not right now');state.stage='idle';addBot('That is okay. You can explore the Care toolkit at your own pace.');addOptions([{label:'Explore care toolkit',handle:()=>showView('toolkit')}]);setProgress();}}
    ]);
    setProgress();
  }
  function queueAdaptiveQuestion(addHeader=true, suggested=null){
    if(state.stage!=='adaptive')return;
    const q=suggested || A.nextQuestion(state.adaptiveHistory,state.adaptiveAsked);
    if(!q){startStandardized();return;}
    state.adaptiveCurrent=q;
    if(!state.adaptiveAsked.includes(q.id))state.adaptiveAsked.push(q.id);
    if(addHeader){
      addBot(`${state.adaptiveAsked.length} of ${A.TOTAL} · Personal reflection\n\n${q.text}`);
    }
    addOptions([
      ...q.choices.map(text=>({label:text,handle:()=>answerAdaptive(text,false)})),
      {label:'Skip this question',handle:()=>answerAdaptive('Skip',true)},
      {label:'Go straight to screeners',handle:startStandardized}
    ]);
    $('chatInput').placeholder='Write your own answer, or choose a response…';
    setProgress();
  }
  function answerAdaptive(text,skipped=false,alreadyShown=false){
    if(state.stage!=='adaptive'||!state.adaptiveCurrent||state.v3Busy)return;
    const q=state.adaptiveCurrent;
    if(!alreadyShown)addUser(skipped?'Prefer not to answer':text);
    state.adaptiveHistory.push({text:skipped?'':String(text).slice(0,1000),domain:q.domain,questionId:q.id,skipped});
    state.adaptiveCurrent=null;
    $('chatOptions').replaceChildren();
    if(!V3.active() && !skipped && A.signal(text) && A.analyze(state.adaptiveHistory).topics.length){
      // A short acknowledgment, never a declaration that a person has a disorder.
      addBot(A.reflect(text));
    } else if(skipped) addBot('Of course. You can skip any reflection without explaining why.');
    if(state.adaptiveHistory.length>=A.TOTAL){startStandardized();return;}
    if(!V3.active()){state.v3Reason='';state.v3Uncertainty='';queueAdaptiveQuestion();return;}
    state.v3Busy=true;
    const waiting=elem('div','chat-message bot processing');
    waiting.appendChild(elem('span','message-avatar','✳'));
    const waitingContent=elem('div','message-content');waitingContent.appendChild(elem('div','message-bubble','Mindy is considering your answer…'));waiting.appendChild(waitingContent);
    $('chatLog').appendChild(waiting);$('chatLog').scrollTop=$('chatLog').scrollHeight;
    addOptions([]);
    V3.analyze(state.adaptiveHistory,state.adaptiveAsked).then(result=>{
      waiting.remove();
      if(state.stage!=='adaptive')return;
      if(result.crisis){state.safetyConcern=true;addBot(result.reflection);addOptions([{label:'Open support contacts',handle:openSupport},{label:'Continue only if you wish',handle:()=>queueAdaptiveQuestion()}]);setProgress();return;}
      state.v3Themes=result.themes||[];state.v3Reason=result.explanation || '';
      state.v3Uncertainty=result.uncertainty||'high';
      if(result.reflection)addBot(result.reflection);
      if(result.engine!=='ai-assisted')addBot('AI was not available for this reply; I used the transparent local question-routing fallback.');
      queueAdaptiveQuestion(true,result.question||null);
    }).catch(()=>{
      waiting.remove();if(state.stage!=='adaptive')return;
      state.v3Reason='AI connection failed; local question routing was used.';
      addBot('The AI connection was interrupted. We can continue with the local question path.');queueAdaptiveQuestion();
    }).finally(()=>{state.v3Busy=false;setProgress();});
  }
  function startStandardized(){
    state.stage='assessment';state.adaptiveCurrent=null;
    $('chatOptions').replaceChildren();
    $('chatInput').placeholder='You can still share a thought…';
    addBot('Thank you for reflecting with me. The next part is different: the PHQ-9 and GAD-7 use fixed questions about the past TWO WEEKS, so the scoring stays consistent. The stress questions are exploratory and unvalidated. Select one frequency for each item; your chat does not change the scored questions.');
    queueQuestion();
  }
  function queueQuestion(addHeader=true){
    if(state.stage!=='assessment')return;
    const i=state.answers.length;
    if(i>=L.questions.length){completeAssessment();return;}
    const q=L.questions[i];
    if(addHeader){
      if(i===9)addBot('Thank you for sharing. We’ll now check in about anxiety-related symptoms, using the seven GAD-7 questions. Please keep the past TWO WEEKS in mind.');
      if(i===16)addBot('Next are four original, exploratory questions about everyday stress. Unlike the PHQ-9 and GAD-7, this stress check is NOT clinically validated.');
      if(i===20)addBot('Just one last question about how much these experiences have affected your daily life.');
      addBot(`${i+1} of ${L.questions.length} · ${q.group==='impact'?'Daily-life impact':q.group.charAt(0).toUpperCase()+q.group.slice(1)}\n\n${q.text}${q.group==='impact'?'':'?'}`);
    }
    const labels=q.group==='impact'?L.impactOptions:L.options;
    addOptions(labels.map((label,v)=>({label,handle:()=>answerQuestion(v)})));
    setProgress();
  }
  function answerQuestion(v){
    if(state.stage!=='assessment'|| !Number.isInteger(v)||v<0||v>3)return;
    const i=state.answers.length;
    addUser(L.questions[i].group==='impact'?L.impactOptions[v]:L.options[v]);
    state.answers.push(v);$('chatOptions').replaceChildren();
    if(i===8 && v>0){
      addBot('Thank you for telling me. Because you indicated some thoughts about death or self-harm, I recommend contacting a qualified mental health professional promptly, regardless of other scores. If you might act on these thoughts or cannot stay safe, call emergency services or go to the nearest emergency department now. You can open “Get support” at any time.');
    }
    queueQuestion();
  }
  function completeAssessment(){
    try {state.report=L.scoreAssessment(state.answers,{safetyConcern:state.safetyConcern});}
    catch {addBot('I couldn’t calculate this check-in. Please start again.');state.stage='idle';return;}
    state.stage='complete';setProgress();
    addBot('Thank you for completing the check-in. Your report is ready with transparent symptom-check scores and suggested next steps. Remember, these scores are not a diagnosis or a percentage chance of having a condition.');
    addOptions([{label:'Open my report',handle:()=>showView('report')},{label:'Explore care toolkit',handle:()=>showView('toolkit')}]);
    if(state.saveEnabled)persistReport();
    showView('report');
  }
  function handleMessage(ev){
    ev.preventDefault();const input=$('chatInput');const text=input.value.trim();if(!text)return;input.value='';
    if(state.v3Busy){input.value=text;return;}
    addUser(text);
    if(L.detectSafetyConcern(text)){
      state.safetyConcern=true;
      if(state.report && state.answers.length===L.questions.length){
        state.report=L.scoreAssessment(state.answers,{safetyConcern:true,completedAt:state.report.completedAt});
        if(state.saveEnabled)persistReport();
      }
      addBot('I’m concerned you may be talking about self-harm or suicide. A chat app cannot assess your safety. If you may act on these thoughts or feel unable to stay safe, please call emergency services now (112 in India), go to your nearest emergency department, and tell a trusted person who can stay with you. For mental health support in India, call Tele-MANAS on 14416.');
      if(state.stage==='assessment'||state.stage==='adaptive'){
        addBot('You can pause these questions to seek human support. Your safety matters more than finishing any assessment.');
        addOptions([{label:'Open support contacts',handle:openSupport},{label:'Continue only if you wish',handle:()=>state.stage==='adaptive'?queueAdaptiveQuestion(false):queueQuestion(false)}]);
      }else{addOptions([{label:'Open support contacts',handle:openSupport},{label:'Try grounding instead',handle:()=>showView('toolkit')}]);}
      setProgress();return;
    }
    if(state.stage==='adaptive'){
      if(state.v3Busy){addBot('Please finish the current question first.');return;}
      answerAdaptive(text,false,true);return;
    }
    if(state.stage==='age'){
      addBot('To start the questionnaire, please select an age confirmation option above. You can also choose “Not right now.”');return;
    }
    if(state.stage==='assessment'){
      addBot('I appreciate you sharing that. For the structured check-in, please select one of the response choices for the current question. You can also choose to stop at any time.');
      queueQuestion(false);return;
    }
    if(V3.active()){
      V3.talk(text,state.freeTalkHistory.slice(-6)).then(result=>{
        if(result.crisis){state.safetyConcern=true;addBot(result.reply);openSupport();return;}
        addBot(result.reply);
        if(result.engine!=='ai-assisted')addBot('AI was unavailable. This response came from the local fallback.');
        state.freeTalkHistory.push(text);state.freeTalkHistory.push(result.reply);
        if(state.freeTalkHistory.length>6)state.freeTalkHistory=state.freeTalkHistory.slice(-6);
      }).catch(()=>addBot(L.supportiveReply(text)));
    }else addBot(L.supportiveReply(text));
    addOptions([{label:'Start a structured check-in',handle:beginCheckin},{label:'Try a calming exercise',handle:()=>showView('toolkit')}]);
  }

  function percentBadgeClass(obj){ return obj.label==='Severe'||obj.label==='Moderately severe'||obj.label==='Higher range*'?'high':obj.label==='Moderate'||obj.label==='Middle range*'?'moderate':''; }
  function renderScoreCard(key,label,emoji,score,method) {
    const card=elem('article','score-card '+key);
    const top=elem('div','score-card-top');top.appendChild(elem('h3','',label));top.appendChild(elem('span','score-icon',emoji));card.appendChild(top);
    const nums=elem('div','score-values');nums.appendChild(elem('span','score-number',String(score.percent)));nums.appendChild(elem('span','score-pct','%'));card.appendChild(nums);
    card.appendChild(elem('span','severity-pill '+percentBadgeClass(score),score.label));
    const track=elem('div','meter');const fill=elem('div','meter-fill');fill.style.width=score.percent+'%';track.appendChild(fill);card.appendChild(track);
    card.appendChild(elem('p','score-foot',`${score.raw} / ${score.max} points · ${method}`));
    return card;
  }
  function recommendations(report){
    const list=[];const add=(emoji,title,text)=>list.push({emoji,title,text});
    if(report.guidance.level==='urgent'){
      add('🤝','Connect with a real person','Please tell someone you trust how you are feeling and seek professional or crisis support promptly.');
      add('📞','Make a support call','If you are in danger, use emergency services; in India, you can call 112. For mental health support call 14416.');
      add('🌿','Keep things simple','While waiting for help, move toward supportive company if possible and focus on immediate safety.');
      return list;
    }
    const themes=A.analyze(state.adaptiveHistory).topics;
    if(themes.includes('sleep'))add('🌙','Notice your sleep patterns','Try a gentle, consistent wind-down routine. Consider discussing persistent sleep problems with a clinician.');
    if(themes.includes('connection'))add('🤝','Reach out if it feels right','A short message to a trusted person may be a meaningful way to feel less alone.');
    if(report.anxiety.raw>=10||report.stress.raw>=8)add('🌬️','Try gentle paced breathing','Practice a few comfortable, unforced breaths. Use the breathing exercise in your Care toolkit if it suits you.');
    if(report.depression.raw>=5)add('☀️','Make room for one small activity','A short walk, a simple meal, or reaching out to a trusted person can be a manageable place to begin.');
    add('🛏️','Keep a kind sleep routine','Where possible, aim for regular sleep and wake times and reduce stimulation before bedtime.');
    add('💬','Stay connected','Consider checking in with someone you trust. If symptoms persist or affect daily life, seek professional guidance.');
    add('🌿','Notice the present','Try a 5–4–3–2–1 grounding exercise or a few minutes of fresh air if accessible and comfortable.');
    return list.slice(0,3);
  }
  function renderReport(){
    const report=state.report;
    $('reportEmpty').hidden=!!report;
    $('reportContent').hidden=!report;
    $('printReport').disabled=!report;$('exportJSON').disabled=!report;
    if(!report)return;
    $('reportDate').textContent='Completed · '+formatDate(report.completedAt);
    const grid=$('scoresGrid');grid.replaceChildren(
      renderScoreCard('depression','Depressive symptoms','◒',report.depression,'PHQ-9'),
      renderScoreCard('anxiety','Anxiety symptoms','☼',report.anxiety,'GAD-7'),
      renderScoreCard('stress','Stress symptoms','〰',report.stress,'Exploratory*')
    );
    $('evaluationHeading').textContent=report.guidance.heading;
    $('evaluationSubheading').textContent=report.guidance.subtitle;
    $('evaluationReason').textContent=report.guidance.reason;
    $('evaluationIcon').textContent=report.guidance.level==='urgent'?'!':report.guidance.level==='routine'?'✳':'♡';
    $('consultTitle').textContent=report.guidance.consultTitle;
    $('consultBody').textContent=report.guidance.consultBody;
    const call=$('consultAction');call.replaceChildren();
    const intro=elem('span','','Need to talk? ');call.appendChild(intro);
    const link=elem('a','','Tele-MANAS 14416');link.href='tel:14416';call.appendChild(link);
    call.appendChild(document.createTextNode(' · In an emergency in India, call '));
    const emergency=elem('a','','112');emergency.href='tel:112';call.appendChild(emergency);
    const themes=state.v3Themes.length?state.v3Themes:A.analyze(state.adaptiveHistory).topicLabels;
    const themePanel=$('reportThemes');
    if(themes.length){themePanel.hidden=false;$('reportThemeTags').replaceChildren();themes.forEach(t=>$('reportThemeTags').appendChild(elem('span','insight-tag',t)));}
    else themePanel.hidden=true;
    const rec=$('recommendationList');rec.replaceChildren();
    recommendations(report).forEach(item=>{const el=elem('div','recommendation');el.appendChild(elem('span','',item.emoji));el.appendChild(elem('strong','',item.title));el.appendChild(elem('p','',item.text));rec.appendChild(el);});
    const impactWords=['not difficult','somewhat difficult','very difficult','extremely difficult'];
    $('reportImpact').textContent='Daily-life impact: '+(impactWords[report.impact]||'not recorded')+'. PHQ-9 item 9: '+(report.safetyItem?'a non-zero response (please discuss promptly with a professional)':'no such thoughts reported on this questionnaire')+'. '+(report.chatSafetyConcern?'A keyword-based chat heuristic also flagged a POSSIBLE safety concern; it can be inaccurate. ':'')+'A negative response does not establish safety.';
  }
  function exportReport(){
    if(!state.report)return;
    const payload={notice:'Confidential personal information. Self-report questionnaire scores, not a medical diagnosis or disease probabilities. Adaptive interview text is not exported.',...state.report,adaptiveThemes:state.v3Themes.length?state.v3Themes:A.analyze(state.adaptiveHistory).topicLabels, adaptiveMethod:state.v3Themes.length?"AI-assisted topic labels (unvalidated)":"local text cues"};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='mindharbor-report-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function persistReport(){
    if(!state.report||!state.saveEnabled)return;
    if(!safeSet(KEYS.report,JSON.stringify({answers:state.answers,safetyConcern:state.safetyConcern,completedAt:state.report.completedAt}))){
      $('privacyMessage').textContent='Browser storage is unavailable. Your report has not been saved.';
    }
  }
  function readSavedReport(){
    if(!state.saveEnabled)return;
    try{
      const saved=JSON.parse(safeGet(KEYS.report)||'null');
      if(!saved||!Array.isArray(saved.answers))return;
      const r=L.scoreAssessment(saved.answers,{safetyConcern:!!saved.safetyConcern,completedAt:saved.completedAt});
      state.answers=saved.answers.slice();state.report=r;state.safetyConcern=!!saved.safetyConcern;state.stage='complete';
    }catch{safeRemove(KEYS.report);}
  }
  function setSaveEnabled(value){
    if(value){
      if(!safeSet(KEYS.save,'yes')){$('privacyMessage').textContent='Local browser storage is unavailable; saving cannot be enabled.';storageStatus();return;}
      state.saveEnabled=true;persistReport();$('privacyMessage').textContent='On-device report saving enabled. Stored data is not encrypted.';
    }else{
      state.saveEnabled=false;safeRemove(KEYS.save);safeRemove(KEYS.report);
      $('privacyMessage').textContent='On-device saving is off and the previously saved report has been cleared. Your current session remains available until you close or refresh this page.';
    }
    storageStatus();
  }
  function resetSession(){
    state.answers=[];state.report=null;state.safetyConcern=false;state.stage='idle';state.adaptiveHistory=[];state.adaptiveAsked=[];state.adaptiveCurrent=null;
    if(state.saveEnabled)safeRemove(KEYS.report);
    $('chatLog').replaceChildren();$('chatOptions').replaceChildren();initialMessage();setProgress();renderReport();
  }
  function clearAllData(){
    safeRemove(KEYS.save);safeRemove(KEYS.report);safeRemove(KEYS.theme);
    state.saveEnabled=false;resetSession();
    document.body.classList.remove('dark');$('themeToggle').replaceChildren(icon('moon'));
    storageStatus();$('privacyMessage').textContent='Your report, chat session, and MindHarbor browser preferences have been cleared.';
  }
  function toggleTheme(){const dark=document.body.classList.toggle('dark');$('themeToggle').replaceChildren(icon(dark?'sun':'moon'));safeSet(KEYS.theme,dark?'dark':'light');}

  const phases=[{name:'Breathe in',seconds:4,css:'breath-in'},{name:'Hold softly',seconds:4,css:'breath-hold'},{name:'Breathe out',seconds:6,css:'breath-out'}];
  function updateBreath(){
    const time=state.breathElapsed%14;
    let elapsed=time,phase=phases[0];
    for(const p of phases){if(elapsed<p.seconds){phase=p;break;}elapsed-=p.seconds;}
    $('breathOrb').classList.remove('breath-in','breath-hold','breath-out');$('breathOrb').classList.add(phase.css);
    $('breathText').textContent=phase.name;
    $('breathSeconds').textContent=(phase.seconds-elapsed)+' seconds · relax your shoulders';
  }
  function stopBreath(){if(state.breathInterval!==null){clearInterval(state.breathInterval);state.breathInterval=null;}state.breathing=false;$('breathToggle').replaceChildren(icon('play'),document.createTextNode(' Resume breathing'));}
  function toggleBreath(){
    if(state.breathing){stopBreath();return;}
    state.breathing=true;updateBreath();$('breathToggle').replaceChildren(icon('pause'),document.createTextNode(' Pause breathing'));
    state.breathInterval=setInterval(()=>{state.breathElapsed++;updateBreath();},1000);
  }
  function resetBreath(){stopBreath();state.breathElapsed=0;$('breathOrb').classList.remove('breath-in','breath-hold','breath-out');$('breathText').textContent='Ready';$('breathSeconds').textContent='Start when comfortable';$('breathToggle').replaceChildren(icon('play'),document.createTextNode(' Start breathing'));}
  const grounding=[
    {n:'5',sense:'THINGS YOU CAN SEE',prompt:'Look around and name five things you can see.'},
    {n:'4',sense:'THINGS YOU CAN FEEL',prompt:'Notice four things you can feel or touch.'},
    {n:'3',sense:'THINGS YOU CAN HEAR',prompt:'Listen for three distinct sounds around you.'},
    {n:'2',sense:'THINGS YOU CAN SMELL',prompt:'Notice two scents, or recall scents that you find comforting.'},
    {n:'1',sense:'THING YOU CAN TASTE',prompt:'Notice one taste, or take a comfortable sip of water.'},
    {n:'✓',sense:'WELL DONE',prompt:'Take a moment to notice what feels different. There is no need to force calm.'}
  ];
  function updateGrounding(){
    const g=grounding[state.groundStep];$('groundingNumber').textContent=g.n;$('groundingSense').textContent=g.sense;$('groundingPrompt').textContent=g.prompt;
    $('groundingNext').disabled=state.groundStep>=5;
    $('groundingNext').replaceChildren(document.createTextNode(state.groundStep>=5?'Completed':'Next sense '));if(state.groundStep<5)$('groundingNext').appendChild(icon('arrow'));
    const dots=$('groundingDots');dots.replaceChildren();for(let i=0;i<5;i++)dots.appendChild(elem('i',i===Math.min(state.groundStep,4)?'active':''));
  }
  function openSupport(){state.lastFocus=document.activeElement;$('supportModal').hidden=false;$('supportClose').focus();}
  function closeSupport(){$('supportModal').hidden=true;if(state.lastFocus&&state.lastFocus.isConnected)state.lastFocus.focus();}
  function init(){
    $('todayText').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    $('yearText').textContent=String(new Date().getFullYear());
    state.saveEnabled=safeGet(KEYS.save)==='yes';
    if(safeGet(KEYS.theme)==='dark'){document.body.classList.add('dark');$('themeToggle').replaceChildren(icon('sun'));}
    storageStatus();readSavedReport();initialMessage();setProgress();renderReport();updateGrounding();
    V3.init(info=>{
      const live=V3.active();
      $('aiModePill').textContent=live?'AI-assisted':'Local mode';
      $('aiModePill').classList.toggle('is-live',live);
      $('engineNotice').textContent=info.note+(info.consent ? ' · AI permission enabled' : ' · permission off');
      $('aiConsent').disabled=!info.aiConfigured || !info.connected;
      $('aiConsent').checked=info.consent;
    });
    $('aiConsent').addEventListener('change',ev=>V3.setConsent(ev.target.checked));
    all('[data-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.view)));
    $('startCheckin').addEventListener('click',beginCheckin);$('emptyStart').addEventListener('click',beginCheckin);
    $('asideBegin').addEventListener('click',()=>state.report?showView('report'):state.stage==='assessment'||state.stage==='adaptive'?showView('chat'):beginCheckin());
    $('restartChat').addEventListener('click',()=>{resetSession();beginCheckin();});
    $('chatForm').addEventListener('submit',handleMessage);
    $('printReport').addEventListener('click',()=>{if(state.report)window.print();});
    $('exportJSON').addEventListener('click',exportReport);$('downloadData').addEventListener('click',exportReport);
    $('saveToggle').addEventListener('change',ev=>setSaveEnabled(ev.target.checked));
    $('deleteData').addEventListener('click',()=>{if(window.confirm('Clear your current session and any locally stored MindHarbor report and settings?'))clearAllData();});
    $('themeToggle').addEventListener('click',toggleTheme);
    $('mobileMenu').addEventListener('click',()=> $('sidebar').classList.contains('mobile-open')?closeMenu():openMenu());
    $('mobileBackdrop').addEventListener('click',closeMenu);
    $('helpButton').addEventListener('click',openSupport);
    $('supportClose').addEventListener('click',closeSupport);
    $('supportModal').addEventListener('click',ev=>{if(ev.target===$('supportModal'))closeSupport();});
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(!$('supportModal').hidden)closeSupport();else closeMenu();}});
    $('breathToggle').addEventListener('click',toggleBreath);$('breathReset').addEventListener('click',resetBreath);
    $('groundingNext').addEventListener('click',()=>{state.groundStep=Math.min(5,state.groundStep+1);updateGrounding();});
    $('groundingReset').addEventListener('click',()=>{state.groundStep=0;updateGrounding();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
