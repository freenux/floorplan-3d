const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const seeds=html.match(/<script type="application\/json" id="bundledPlans">([\s\S]*?)<\/script>/)[1];
const original=JSON.parse(fs.readFileSync(path.join(root,'plans/plan-floor1.json'),'utf8'));
const storage=new Map([['huxing-design-v1',JSON.stringify(original)]]);
const failures={enabled:false};
function boot(){
  const ctx=vm.createContext({assert,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failures.enabled)throw Error('quota');storage.set(k,v);}},document:{getElementById:()=>({textContent:seeds})},tr:(zh,en)=>zh,toast:()=>{},$:()=>({open:false}),renderAll:()=>{}});
  vm.runInContext(html.slice(html.indexOf('const WALLS ='),html.indexOf('const PX_MM =')),ctx);
  vm.runInContext(html.slice(html.indexOf('let planCatalog ='),html.indexOf('const snap =')),ctx);
  return ctx;
}
let ctx=boot();
vm.runInContext(`{
  assert.equal(planCatalog.plans.length,2);
  assert.equal(activePlanId,'plan-floor1');
  assert.equal(state.metadata.floor,1);
  state.furniture[0].cx=2222;
  undoStack.push('first-floor-only');
  activatePlan('plan-floor2');
  assert.equal(state.metadata.floor,2);
  assert.equal(undoStack.length,0);
  state.rooms.bed_nw.name='二楼修改后的房间';
  activatePlan('plan-floor1');
  assert.equal(state.furniture[0].cx,2222);
  assert.equal(undoStack[0],'first-floor-only');
  activatePlan('plan-floor2');
  assert.equal(state.rooms.bed_nw.name,'二楼修改后的房间');
  importPlan({furniture:[]},'测试方案.json');
  assert.equal(planCatalog.plans.length,3);
  assert.equal(planCatalog.plans.at(-1).name,'测试方案');
  assert.equal(state.geometry,undefined);
  assert.equal(undoStack.length,0);
  importPlan({furniture:[]},'测试方案.json');
  assert.equal(planCatalog.plans.at(-1).name,'测试方案 (2)');
  assert.throws(()=>importPlan({furniture:'bad'},'invalid.json'));
  assert.equal(planCatalog.plans.length,4);
  save();
}`,ctx);
ctx=boot();
vm.runInContext(`{
  assert.equal(planCatalog.plans.length,4);
  assert.equal(planCatalog.plans.find(p=>p.id===activePlanId).name,'测试方案 (2)');
  activatePlan('plan-floor1');
  assert.equal(state.furniture[0].cx,2222);
  activatePlan('plan-floor2');
  assert.equal(state.rooms.bed_nw.name,'二楼修改后的房间');
}`,ctx);
failures.enabled=true;
vm.runInContext(`{
  const before=activePlanId;
  activatePlan('plan-floor1'); assert.equal(activePlanId,before);
  assert.equal(importPlan({furniture:[]},'blocked.json'),false);
  assert.equal(planCatalog.plans.length,4);
}`,ctx);
failures.enabled=false;
// Corrupt stored entries must not prevent recovery of other valid plans.
const saved=JSON.parse(storage.get('huxing-plan-list-v1'));saved.plans.push({id:'invalid',name:'broken',state:{furniture:'bad'}});storage.set('huxing-plan-list-v1',JSON.stringify(saved));
ctx=boot();vm.runInContext('assert.equal(planCatalog.plans.length,4)',ctx);
console.log('PASS: legacy migration, seeded floors, independent edits/history, import addition, duplicate names, refresh restore, invalid input and storage failure');
