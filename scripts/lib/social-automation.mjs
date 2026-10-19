export const workflows = [{id:'dispatch.yml',label:'Posting dispatcher',maxAgeHours:6,event:'schedule'},{id:'calendar.yml',label:'Calendar import',maxAgeHours:48,event:'schedule'},{id:'render.yml',label:'Social Hub deployment',maxAgeHours:null}];
const safeRun = run => run ? {id:run.id,status:run.status,conclusion:run.conclusion,startedAt:run.run_started_at || run.created_at,url:run.html_url} : null;
export async function collectAutomation({fetcher=fetch,now=new Date(),token}={}) {
 const records=await Promise.all(workflows.map(async workflow=>{
  try {
   const query=new URLSearchParams({branch:'main',per_page:'20',...(workflow.event?{event:workflow.event}:{})});
   const url=`https://api.github.com/repos/ASME-OSU/ASME-Social-Hub/actions/workflows/${workflow.id}/runs?${query}`;
   let response=await fetcher(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'ASME-Officer-Hub',...(token?{Authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(15000)});
   if(response.status===403 && token) response=await fetcher(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'ASME-Officer-Hub'},signal:AbortSignal.timeout(15000)});
   if(!response.ok) throw Error('Workflow read unavailable');
   const payload=await response.json();if(!Array.isArray(payload.workflow_runs))throw Error('Invalid runs');
   const runs=payload.workflow_runs.filter(r=>r.head_branch==='main' && (!workflow.event || r.event===workflow.event));
   return {...workflow,available:true,latest:safeRun(runs[0]),completed:safeRun(runs.find(r=>r.status==='completed' && r.conclusion!=='cancelled' && r.conclusion!=='skipped'))};
  } catch {return {...workflow,available:false,latest:null,completed:null};}
 }));
 return {schemaVersion:1,generatedAt:now.toISOString(),workflows:records};
}
