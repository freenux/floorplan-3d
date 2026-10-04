const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const url=pathToFileURL(path.join(root,'vendor/three/three.module.js')).href;
 const THREE=await import(url);
 const source=fs.readFileSync(path.join(root,'exterior/annotations.js'),'utf8').replace("from 'three'",`from '${url}'`);
 const {pickPart,createAnnotations}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const modelSource=fs.readFileSync(path.join(root,'exterior/scene.js'),'utf8');
 const modelCode=modelSource.slice(modelSource.indexOf('const mat='),modelSource.indexOf('function save()'));
 const scene=new THREE.Scene();
 const {house,foundation,rails}=await vm.runInNewContext(`(async()=>{${modelCode};return {house,foundation,rails};})()`,{
  THREE,scene,config:{wall:'#f2f1eb',base:'#a3a9ae',frame:'#303940'},console,$:()=>({}),loadingMessage:()=>{throw Error('Model load failed');},
  fetch:async file=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.resolve(root,'exterior',file),'utf8'))}),
 });
 scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 function pick(origin,direction){ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction).normalize());return pickPart(ray,[house,foundation]);}
 assert.equal(pick([-2,20,4.8],[0,-1,0]).part.id,'terrace','visible terrace floor');
 assert.equal(pick([-2,20,3],[0,-1,0]).part.id,'upper-eaves','eaves must occlude terrace');
 assert.equal(pick([-2,1,5],[0,-1,0]).part.id,'porch','porch floor');
 assert.equal(pick([-2,5.15,12],[0,0,-1]).part.id,'terrace-railing','railing differs from terrace');
 rails.visible=false;
 assert.notEqual(pick([-2,5.15,12],[0,0,-1])?.part.id,'terrace-railing','hidden railing must not be picked');
 rails.visible=true;
 assert.equal(pick([0,20,0],[0,-1,0]).part.id,'roof','roof surface');
 assert.equal(pick([4,20,-1.65],[0,-1,0]).part.id,'roof-tower','roof stair enclosure');
 assert.equal(pick([-2,4.0,10],[0,0,-1]).part.id,'floor-2-slab','terrace slab edge is not a floor 1 eave');
 assert.equal(pick([-5.8,2,10],[0,0,-1]).part.id,'porch-column-left','left column label');
 assert.equal(pick([1.8,2,10],[0,0,-1]).part.id,'porch-column-right','right column label');
 assert.equal(pick([40,20,40],[0,-1,0]),null,'empty scene');
 // Exercise the actual hover event handler with CSS pixel coordinates on a 2× display.
 function target(){const handlers={};return {handlers,addEventListener:(type,fn)=>handlers[type]=fn};}
 const canvas={...target(),style:{},getBoundingClientRect:()=>({left:100,top:50,width:663,height:372})};
 const controls=target();
 const label={hidden:true,textContent:'',dataset:{},style:{},offsetWidth:60,offsetHeight:30,removeAttribute:key=>{if(key==='data-part-id')delete label.dataset.partId;}};
 global.document=target();
 let language='zh';
 const camera=new THREE.PerspectiveCamera(42,663/372,.1,140);camera.position.set(-2,20,4.8);camera.lookAt(-2,4.1,4.8);camera.updateMatrixWorld();
 const annotations=createAnnotations({scene,camera,controls,canvas,roots:[house,foundation],label,tr:(zh,en)=>language==='zh'?zh:en});
 const move={pointerType:'mouse',buttons:0,clientX:431.5,clientY:236};
 canvas.handlers.pointermove(move);annotations.update();
 assert.equal(label.hidden,false);assert.equal(label.textContent,'露台');assert.equal(label.dataset.partId,'terrace');
 const highlight=scene.children.at(-1);assert(highlight.children.length>0,'hover highlights the region');
 language='en';document.handlers['workspace-language']();annotations.update();assert.equal(label.textContent,'Terrace');
 canvas.handlers.pointerleave({pointerType:'mouse'});assert.equal(label.hidden,true);assert.equal(highlight.children.length,0);
 canvas.handlers.pointerdown({...move,pointerType:'touch'});canvas.handlers.pointerup({...move,pointerType:'touch'});annotations.update();
 canvas.handlers.pointerleave({pointerType:'touch'});assert.equal(label.hidden,false,'touch label survives pointer release');
 controls.handlers.start();assert.equal(label.hidden,true,'hide labels during camera drag');controls.handlers.end();
 for(const file of ['exterior/annotations.js','exterior/scene.js','exterior/index.html','exterior/style.css'])assert.equal(fs.readFileSync(path.join(root,file),'utf8'),fs.readFileSync(path.join(root,'dist',file),'utf8'));
 console.log('PASS: actual model picking, occlusion, hidden railing, eave edges, empty space, mouse hover/highlight, CSS pixel coordinates, language switch, touch tap, drag, source/dist match');
})().catch(error=>{console.error(error);process.exitCode=1});
