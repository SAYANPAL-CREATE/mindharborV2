/* MindHarbor V3 transport: opt-in remote language model, local V2 fallback.
   Does not write free text to localStorage; no API keys are present in the browser. */
(function(root){
  'use strict';
  const BASE=String(root.MINDHARBOR_API_BASE||'').replace(/\/$/,'');
  const state={aiConfigured:false, connected:false, consent:false, note:'Checking server connection…'};
  let callback=()=>{};
  function emit(){callback({...state});}
  function active(){return state.connected&&state.aiConfigured&&state.consent;}
  async function init(onChange){callback=typeof onChange==='function'?onChange:()=>{};emit();
    try{
      const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),6500);
      let response;try{response=await fetch(BASE+'/api/health',{signal:ctrl.signal,cache:'no-store'});}finally{clearTimeout(timeout);}
      if(!response.ok)throw Error('Health endpoint unavailable');
      const result=await response.json();state.connected=result.status==='ok';state.aiConfigured=result.aiConfigured===true;
      state.note=state.aiConfigured?'AI available with explicit consent':'Local mode — add an API key to enable live AI';
    }catch{state.note='Local mode — AI backend is unavailable';}
    emit();
  }
  function setConsent(value){state.consent=!!value;emit();}
  async function analyze(history,asked){
    if(!active())return null;
    const response=await fetch(BASE+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({history,asked}),cache:'no-store'});
    if(!response.ok)throw Error('The AI service is unavailable ('+response.status+').');
    return await response.json();
  }
  async function talk(message,previous=[]){
    if(!active())return null;
    const response=await fetch(BASE+'/api/talk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,previous}),cache:'no-store'});
    if(!response.ok)throw Error('The AI service is unavailable.');
    return response.json();
  }
  return (root.MindHarborV3={init,setConsent,active,analyze,talk,state});
})(window);
