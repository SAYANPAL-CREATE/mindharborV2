/* MindHarbor scoring engine.
 * This is a transparent, deterministic screening implementation.
 * Percentages are normalized questionnaire points, NOT diagnostic likelihoods.
 * PHQ-9 / GAD-7 wording and adult severity bands are reproduced for informational use.
 * The four stress items and their descriptive ranges are original and NOT validated.
 */
(function(root, factory) {
  const result = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = result;
  root.MindHarborLogic = result;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const options = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

  const questions = [
    {group:'depression', text:'Little interest or pleasure in doing things'},
    {group:'depression', text:'Feeling down, depressed, or hopeless'},
    {group:'depression', text:'Trouble falling or staying asleep, or sleeping too much'},
    {group:'depression', text:'Feeling tired or having little energy'},
    {group:'depression', text:'Poor appetite or overeating'},
    {group:'depression', text:'Feeling bad about yourself — or that you are a failure or have let yourself or your family down'},
    {group:'depression', text:'Trouble concentrating on things, such as reading the newspaper or watching television'},
    {group:'depression', text:'Moving or speaking so slowly that other people could have noticed? Or being so fidgety or restless that you have been moving around a lot more than usual'},
    {group:'depression', text:'Thoughts that you would be better off dead, or thoughts of hurting yourself in some way', safety:true},
    {group:'anxiety', text:'Feeling nervous, anxious, or on edge'},
    {group:'anxiety', text:'Not being able to stop or control worrying'},
    {group:'anxiety', text:'Worrying too much about different things'},
    {group:'anxiety', text:'Trouble relaxing'},
    {group:'anxiety', text:'Being so restless that it is hard to sit still'},
    {group:'anxiety', text:'Becoming easily annoyed or irritable'},
    {group:'anxiety', text:'Feeling afraid as if something awful might happen'},
    {group:'stress', text:'Feeling overwhelmed by the number of things you needed to do'},
    {group:'stress', text:'Finding it difficult to switch off from daily pressures'},
    {group:'stress', text:'Noticing physical tension when dealing with everyday demands'},
    {group:'stress', text:'Feeling that your usual coping strategies were not enough'},
    {group:'impact', text:'How difficult have these experiences made it to work, study, manage home responsibilities, or connect with others?'}
  ];
  const impactOptions = ['Not difficult', 'Somewhat difficult', 'Very difficult', 'Extremely difficult'];

  function sum(a) { return a.reduce((acc, cur) => acc + cur, 0); }
  function severityDepression(n) {
    if (n <= 4) return 'Minimal';
    if (n <= 9) return 'Mild';
    if (n <= 14) return 'Moderate';
    if (n <= 19) return 'Moderately severe';
    return 'Severe';
  }
  function severityAnxiety(n) {
    if (n <= 4) return 'Minimal';
    if (n <= 9) return 'Mild';
    if (n <= 14) return 'Moderate';
    return 'Severe';
  }
  function stressDescriptor(n) {
    return n <= 3 ? 'Lower range*' : n <= 7 ? 'Middle range*' : 'Higher range*';
  }
  function normalize(score, max) { return Math.round(score / max * 100); }

  function scoreAssessment(answers, opts = {}) {
    if (!Array.isArray(answers) || answers.length !== questions.length || !answers.every(x => Number.isInteger(x) && x >= 0 && x <= 3)) {
      throw new Error('A complete set of 21 integer responses from 0 to 3 is required.');
    }
    const dep = sum(answers.slice(0,9));
    const anx = sum(answers.slice(9,16));
    const stress = sum(answers.slice(16,20));
    const impact = answers[20];
    const safetyItem = answers[8] > 0;
    const chatSafetyConcern = !!opts.safetyConcern;
    const safety = safetyItem || chatSafetyConcern;
    const elevated = dep >= 10 || anx >= 10 || stress >= 8 || impact >= 2;
    const high = dep >= 20 || anx >= 15 || impact === 3;
    let guidance;
    if (safety) {
      guidance = {
        level:'urgent',
        heading:'A safety concern needs attention',
        subtitle:'A human conversation matters more than a score.',
        reason:'Your responses or messages raised a possible concern about self-harm. The app cannot determine immediate danger. Please reach out to a qualified mental health professional promptly. If you might act on these thoughts or cannot stay safe, contact emergency services now.',
        consultTitle:'Reach out for help promptly',
        consultBody:'Contact a mental health professional or crisis support service. If you might harm yourself, call emergency services, go to the nearest emergency department, and tell someone you trust. Do not rely on this screen for a safety assessment.'
      };
    } else if (high) {
      guidance = {
        level:'high',
        heading:'Timely professional support is recommended',
        subtitle:'Your symptoms deserve further attention.',
        reason:'At least one symptom scale is in a higher range, or daily functioning is extremely difficult. An assessment by a clinician can explore what is happening and discuss appropriate support.',
        consultTitle:'Arrange an appointment soon',
        consultBody:'Consider contacting a psychologist, psychiatrist, or primary-care doctor soon, especially if symptoms persist or are worsening. Seek help earlier if you feel unable to cope.'
      };
    } else if (elevated) {
      guidance = {
        level:'elevated',
        heading:'A professional check-in may help',
        subtitle:'There are signs worth exploring.',
        reason:'One or more symptom scores are elevated, or your day-to-day activities are significantly affected. A qualified professional can provide a fuller, individual evaluation.',
        consultTitle:'Consider booking a consultation',
        consultBody:'A GP, psychologist, or psychiatrist could help you understand your concerns and choose next steps. You do not need to wait for symptoms to become severe to ask for help.'
      };
    } else {
      guidance = {
        level:'routine',
        heading:'Continue checking in with yourself',
        subtitle:'Your responses fall in lower screening ranges.',
        reason:'You reported relatively few symptoms on this check-in. This does not rule out a mental health concern, and there is no score below which someone must avoid seeking help.',
        consultTitle:'A consultation is always an option',
        consultBody:'There is no automatic signal here that requires an appointment based on these scores alone. If you feel distressed, have ongoing symptoms, or simply want support, talking with a professional is appropriate.'
      };
    }
    return {
      completedAt: typeof opts.completedAt === 'string' ? opts.completedAt : new Date().toISOString(),
      depression: { raw:dep, max:27, percent:normalize(dep,27), label:severityDepression(dep) },
      anxiety: { raw:anx, max:21, percent:normalize(anx,21), label:severityAnxiety(anx) },
      stress: { raw:stress, max:12, percent:normalize(stress,12), label:stressDescriptor(stress) },
      impact, safetyItem, chatSafetyConcern, guidance,
      version:'1.0.0',
      methodology:'Percentages = raw points / possible points, not diagnostic probabilities.'
    };
  }
  const safetyPattern = /(?:\bsuicid\w*\b|\bself[- ]?harm\b|\bkill (?:myself|me)\b|\b(?:end|ending|take|taking) my life\b|\bwant to die\b|\bwish (?:i|I) (?:was|were) dead\b|\bbetter off dead\b|\bhurt myself\b|\boverdose\b|\bcan't go on living\b|\bcannot go on living\b)/i;
  function detectSafetyConcern(text) { return typeof text === 'string' && safetyPattern.test(text); }
  function detectEmotion(text) {
    const t = String(text || '').toLowerCase();
    if (/\b(anxious|anxiety|panic|worried|worry|fear|scared|nervous|afraid)\b/.test(t)) return 'anxiety';
    if (/\b(stressed|stress|pressure|overwhelmed|burnout|burned out|deadline|exhausted|tension)\b/.test(t)) return 'stress';
    if (/\b(sad|down|depressed|hopeless|empty|cry|crying|low mood|unhappy)\b/.test(t)) return 'sadness';
    if (/\b(lonely|alone|isolated|no one|nobody|left out)\b/.test(t)) return 'loneliness';
    if (/\b(sleep|insomnia|tired|fatigue|restless night)\b/.test(t)) return 'sleep';
    if (/\b(happy|better|good|hopeful|grateful|excited|joy|relieved)\b/.test(t)) return 'positive';
    return 'general';
  }
  function supportiveReply(text) {
    const emotion = detectEmotion(text);
    const replies = {
      anxiety:'It sounds like worry or anxiety has been taking up space lately. If you want, you can share what feels most uncertain. You could also try a short grounding exercise in the Care toolkit.',
      stress:'That sounds like a lot to carry. Stress can feel especially heavy when demands pile up. What has been taking the most energy from you lately?',
      sadness:'Thank you for putting those feelings into words. Difficult moods can be hard to talk about. Has this been affecting your usual daily activities?',
      loneliness:'Feeling disconnected can be painful. You deserve connection and support. Is there someone you trust whom you might feel comfortable contacting?',
      sleep:'Sleep difficulties can make everything feel harder. A consistent wind-down routine may help a little. If sleep problems continue or disrupt daily life, a clinician can help.',
      positive:'I’m glad there is something positive to notice. What has helped you feel this way? It can be useful to recognize moments that support you.',
      general:'Thank you for sharing. I’m listening. Would you like to tell me a little more about how this has affected you, or would you prefer a guided wellbeing check-in?'
    };
    return replies[emotion];
  }
  return { questions, options, impactOptions, scoreAssessment, severityDepression, severityAnxiety, stressDescriptor, detectSafetyConcern, detectEmotion, supportiveReply };
});
