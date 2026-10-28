/* MindHarbor V2 · local, transparent conversational routing.
   NOT a trained model, diagnostic inference, sentiment certainty, or safety assessment.
   Never sends free-text responses to a server and never stores the transcript. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MindHarborAdaptive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const TOTAL = 7;
  const domains = ['mood','anxiety','stress','sleep','energy','connection','impact','coping','strengths'];
  const names = {mood:'Mood',anxiety:'Worry',stress:'Pressure',sleep:'Sleep',energy:'Energy',connection:'Connection',impact:'Daily life',coping:'Coping',strengths:'Strengths'};
  const patterns = {
    mood:/\b(sad(?:ness)?|depress(?:ed|ion)?|low mood|feel(?:ing)? low|down|hopeless|empty|cry(?:ing)?|numb|lonely heart|unhappy|miserable|nothing matters)\b/i,
    anxiety:/\b(anxi(?:ous|ety)|worr(?:y|ied|ying)|panic|nervous|fear|scared|uncertain|afraid|overthink(?:ing)?|racing thoughts)\b/i,
    stress:/\b(stress(?:ed|ful)?|pressure|overwhelmed|burn(?:ed|t)? out|deadlines?|busy|overload|workload|exams?|financial|bills?|tense)\b/i,
    sleep:/\b(sleep(?:ing|less)?|insomnia|nightmares?|tired mornings?|wake up|waking|restless night|bedtime)\b/i,
    energy:/\b(exhaust(?:ed|ion)?|fatigue|fatigued|tired|energy|drained|motivation|appetite|eating)\b/i,
    connection:/\b(alone|lonel(?:y|iness)|isolated|no friends?|relationship|family|friends?|support|partner|unheard|disconnected)\b/i,
    impact:/\b(concentrat(?:e|ion|ing)|focus|work|stud(?:y|ying|ies)|school|routine|daily|function|manage|chores)\b/i,
    coping:/\b(cop(?:e|ing)|meditat(?:e|ion)|breat(?:he|hing)|exercise|walk|music|therapy|journal|relax|grounding)\b/i,
    strengths:/\b(better|hopeful|grateful|calm|proud|enjoy|happy|good today|improv(?:e|ing)|helped|strength|okay now)\b/i
  };
  const negativePattern = /\b(?:not|never|don't|do not|no|without|hardly|isn't|aren't|wasn't)\s+(?:(?:really|very|that|feeling|been)\s+){0,2}(?:anxious|worried|stressed|sad|depressed|lonely|tired|overwhelmed)\b/i;
  // The brief interview is not a clinical scale; questions are authored exploratory prompts.
  const opening = {
    id:'opening',domain:'general',text:'To begin, what has been on your mind lately? You can describe a feeling, a situation, or just how your day has been.',
    choices:['I have been feeling anxious','I feel low or disconnected','I am under a lot of pressure','My sleep or energy is difficult'],
    reason:'We begin openly so that you can choose what matters most.'
  };
  const bank = [
    {id:'anx-trigger',domain:'anxiety',text:'When the worry shows up, what usually seems to set it off?',choices:['Uncertainty about the future','A specific situation','It comes without a clear reason','I am not sure'],reason:'You mentioned worry; exploring its context may help tailor the next conversation.'},
    {id:'anx-body',domain:'anxiety',text:'How does that worry affect you in the moment — for example, your thoughts, body, or concentration?',choices:['My thoughts race','I notice tension or restlessness','It interrupts what I am doing','It varies'],reason:'Your recent words suggested worry, so this checks its everyday effects.'},
    {id:'stress-source',domain:'stress',text:'Which part of your current responsibilities feels hardest to carry?',choices:['Work or study','Family or relationships','Money or uncertainty','Several things at once'],reason:'You mentioned pressure; this explores its source without making a diagnosis.'},
    {id:'stress-break',domain:'stress',text:'When you get a short break, is it easy or difficult to switch off from those demands?',choices:['Very difficult','Sometimes','Usually manageable','I rarely get breaks'],reason:'You raised a source of pressure; this checks whether there is room for recovery.'},
    {id:'mood-duration',domain:'mood',text:'Has that low or difficult mood been coming and going, or has it felt fairly constant recently?',choices:['It comes and goes','Most days lately','It is hard to describe','My mood has improved'],reason:'You mentioned your mood; the pattern over time can be useful to reflect on.'},
    {id:'mood-interest',domain:'mood',text:'Are there everyday things you normally enjoy that have felt different lately?',choices:['I enjoy less than usual','Some activities still help','It depends on the day','Not really'],reason:'You described a difficult mood; this gently explores changes in enjoyment.'},
    {id:'sleep-pattern',domain:'sleep',text:'What has sleep felt like recently?',choices:['Hard to fall asleep','Waking during the night','Sleeping more than usual','Sleep seems okay'],reason:'Sleep came up in your answer; this checks what kind of change you noticed.'},
    {id:'sleep-day',domain:'sleep',text:'How, if at all, has your sleep affected the way you feel during the day?',choices:['I feel worn out','My concentration suffers','It has little effect','I am unsure'],reason:'You mentioned sleep, so the next step checks whether it affects daily life.'},
    {id:'energy-pattern',domain:'energy',text:'At what point in the day does your energy feel most difficult to manage?',choices:['Early in the day','Afternoons','Evenings','My energy feels okay'],reason:'You mentioned tiredness or motivation; this looks at the pattern you notice.'},
    {id:'energy-small',domain:'energy',text:'What is one small task that has felt easier or harder than usual lately?',choices:['Getting started','Staying focused','Finishing tasks','Most tasks feel manageable'],reason:'Your answer mentioned energy; this connects that experience to daily routines.'},
    {id:'connection-check',domain:'connection',text:'When things feel difficult, do you feel you have someone you can talk to?',choices:['Yes, someone I trust','Sometimes','Not really','I would rather not say'],reason:'You mentioned relationships or connection; knowing what support feels available can guide suggestions.'},
    {id:'connection-need',domain:'connection',text:'What kind of support would feel most helpful to you right now?',choices:['Someone to listen','Practical help','More space for myself','I am not sure'],reason:'Your words touched on support, so this explores what you want rather than assuming.'},
    {id:'impact-where',domain:'impact',text:'Which part of everyday life has been most affected, if any?',choices:['Work or study','Relationships','Rest or routines','Not much is affected'],reason:'Your response pointed to everyday demands; this checks where change is most noticeable.'},
    {id:'impact-change',domain:'impact',text:'Compared with a few weeks ago, do these difficulties feel different?',choices:['More difficult','About the same','A little easier','Not sure'],reason:'You mentioned an effect on daily life; this explores whether it has changed over time.'},
    {id:'coping-help',domain:'coping',text:'Is there anything you have tried that helps, even a little, on a difficult day?',choices:['Movement or going outside','Breathing or slowing down','Talking with someone','I have not found anything yet'],reason:'You described ways of coping; this looks for strategies you find useful.'},
    {id:'coping-barrier',domain:'coping',text:'What tends to get in the way of caring for yourself when you need it?',choices:['Not enough time','Low energy','I do not know where to start','Nothing in particular'],reason:'You mentioned coping; this checks what makes taking care of yourself difficult.'},
    {id:'strengths-what',domain:'strengths',text:'What has helped you feel even slightly more settled or hopeful recently?',choices:['A person','A routine','Something I accomplished','I cannot think of anything right now'],reason:'You noticed something helpful; it is useful to recognize what supports you.'},
    {id:'strengths-more',domain:'strengths',text:'Would you like more moments like that in the coming days? What might make them easier?',choices:['More rest','Connection with someone','Time for something I enjoy','Not sure yet'],reason:'You described a source of support, so this explores a possible next step.'}
  ];
  function normalize(text){return String(text == null ? '' : text).trim().slice(0,1000);}
  function signal(text){
    const t=normalize(text);
    const scores={};
    if(!t || /^(?:skip|prefer not|rather not|i am not sure|not sure)$/i.test(t))return scores;
    for(const domain of domains){
      if(patterns[domain].test(t))scores[domain]=1;
    }
    if(negativePattern.test(t)){
      for(const d of ['anxiety','stress','mood','connection','energy']){
        if(scores[d]) scores[d]=0; // conservative; no inference from negated terms
      }
    }
    return scores;
  }
  function analyze(history){
    const scores=Object.fromEntries(domains.map(d=>[d,0]));
    const items=Array.isArray(history)?history:[];
    items.forEach((h,i)=>{
      if(!h || h.skipped)return;
      const recent=i>=items.length-2?2.1:0.55;
      const s=signal(h.text);
      Object.keys(s).forEach(k=>scores[k]+=(s[k]||0)*recent);
    });
    const topics=domains.filter(d=>scores[d]>0).sort((a,b)=>scores[b]-scores[a] || domains.indexOf(a)-domains.indexOf(b));
    return {scores,topics,topicLabels:topics.slice(0,3).map(d=>names[d]),latest:items.length?signal(items[items.length-1].text):{}};
  }
  function nextQuestion(history, asked){
    const arr=Array.isArray(history)?history:[];
    const visited=new Set(Array.isArray(asked)?asked:[]);
    if(!visited.has('opening'))return opening;
    if(visited.size>=TOTAL)return null;
    const analysis=analyze(arr);
    const covered={};
    bank.forEach(q=>{covered[q.domain]=covered[q.domain]||0;});
    visited.forEach(id=>{const q=bank.find(x=>x.id===id);if(q)covered[q.domain]++;});
    // Meaningful routing: last response's cues lead, followed by earlier themes,
    // with a coverage bonus and penalties for repeating a topic too frequently.
    const last=arr[arr.length-1];
    const recent=analysis.latest;
    const priority={mood:0.25,anxiety:0.20,stress:0.20,sleep:0.15,energy:0.05,connection:0.13,impact:0.12,coping:0.10,strengths:0.10};
    const fallback=['impact','mood','stress','sleep','connection','coping','strengths','anxiety','energy'];
    let choices=bank.filter(q=>!visited.has(q.id)).map((q,index)=>{
      const repeated=(covered[q.domain]||0);
      const hasLatest=!!recent[q.domain];
      const signalWeight=analysis.scores[q.domain]||0;
      const base=(signalWeight*1.55)+(hasLatest?4.2:0)+(priority[q.domain]||0);
      const coverage=repeated===0?0.65:-(repeated*2.0);
      const unmentioned=(signalWeight===0 ? (fallback.length-fallback.indexOf(q.domain))*0.05:0);
      const skipPenalty=last && last.skipped && last.domain===q.domain?-3.5:0;
      const score=base+coverage+unmentioned+skipPenalty+(q.id.endsWith('trigger')?0.1:0);
      return {q,score,index};
    });
    choices.sort((a,b)=>b.score-a.score || a.index-b.index);
    return choices.length?choices[0].q:null;
  }
  function reflect(text){
    const s=signal(text);
    if(s.anxiety)return 'I heard that worry may be part of what you are experiencing. We can explore that without rushing to a conclusion.';
    if(s.stress)return 'It sounds as though some demands have been taking up your attention. Thank you for sharing that.';
    if(s.mood)return 'Thank you for describing that feeling. There is no need to have the perfect words for it.';
    if(s.sleep)return 'Changes in sleep can be frustrating. We can talk a little more about how it has been for you.';
    if(s.connection)return 'Feeling supported matters. You can choose how much you want to share about your relationships.';
    if(s.energy)return 'I hear that your energy or motivation has been on your mind.';
    if(s.strengths)return 'It is useful to notice what has helped, even if it was a small moment.';
    return 'Thank you. I’ll use what you shared to choose the next reflection question.';
  }
  return {TOTAL,opening,bank,domains,names,signal,analyze,nextQuestion,reflect};
});
