import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {frameCamera} from './framing.js';
import {createAnnotations} from './annotations.js';
const $=s=>document.querySelector(s),host=$('#scene');
const tr=(zh,en)=>window.WorkspaceUI.tr(zh,en);
function loadingMessage(zh,en){const el=$('#loading');el.dataset.zh=zh;el.dataset.en=en;el.textContent=tr(zh,en);}
const palette={classic:['#f2f1eb','#a3a9ae','#303940'],sand:['#e7dcc9','#9b8874','#393c3c'],modern:['#d4dbdd','#4d5961','#26333b']};
const defaults={wall:palette.classic[0],base:palette.classic[1],frame:palette.classic[2],lines:true,rail:true,sun:65};
let config={...defaults};try{config={...config,...JSON.parse(localStorage.getItem('floorplan-exterior-v1')||'{}')}}catch{}
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){loadingMessage('当前设备无法启动 WebGL，请使用支持 3D 的浏览器。','This device cannot start WebGL. Use a browser with 3D support.');throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();const sceneBackground=getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();scene.background=new THREE.Color(sceneBackground);scene.fog=new THREE.Fog(sceneBackground,55,110);
const camera=new THREE.PerspectiveCamera(42,1,.1,140),controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3.6,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.65;
const hemi=new THREE.HemisphereLight(0xe4f4ff,0x8d927f,2.2);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1d5,3.2);sun.position.set(-13,22,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:65});sun.shadow.bias=-.0004;scene.add(sun);
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const wall=mat(config.wall),base=mat(config.base),frame=mat(config.frame,.5),trim=mat('#fafbf7'),roof=mat('#b5bec2'),ground=mat('#bdc9bc'),floor=mat('#a9b0b1'),inside=mat('#d4d0c9');
const glass=new THREE.MeshStandardMaterial({color:'#53798a',metalness:.35,roughness:.18,transparent:true,opacity:.7});
const house=new THREE.Group(),rails=new THREE.Group(),lines=new THREE.Group();scene.add(house);house.add(rails,lines);
function labelPart(object,id,zh,en){object.userData.part={id,zh,en};return object;}
function facade(rect,floor){
 const [x0,z0,x1,z1]=rect;
 if(z0===-100)return ['back','背面','back'];
 if(x0===-100)return ['left','左侧','left'];
 if(x1===12100)return ['right','右侧','right'];
 if(z0>=8400&&z1-z0<=200)return ['front','正面','front'];
 if(floor===1&&x0===7900&&z0>=9500)return ['porch-side','门廊侧','porch side'];
 if(floor===2&&x0===7900&&z0>=5500)return ['terrace-side','露台侧','terrace side'];
 return ['inside','内侧','inside'];
}
function labelWall(mesh,rect,floor){const [key,zh,en]=facade(rect,floor);return labelPart(mesh,`wall-${floor}-${key}`,`${floor===1?'一楼':'二楼'}${zh}墙面`,`Floor ${floor} ${en} wall`);}
function region(poly,y,id,zh,en){
 const shape=new THREE.Shape();poly.forEach(([x,z],i)=>i?shape.lineTo(x/1000-6,-(z/1000-5.9)):shape.moveTo(x/1000-6,-(z/1000-5.9)));shape.closePath();
 const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,side:THREE.DoubleSide}));
 mesh.position.y=y;house.add(mesh);return labelPart(mesh,id,zh,en);
}
function box(w,h,d,x,y,z,m=wall,parent=house){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
box(60,.15,60,0,-.24,0,ground,scene);const foundation=box(14,.13,14,0,-.09,0,floor); // neutral ground, without inventing a courtyard
labelPart(foundation,'foundation','建筑基座','Building base');
// Drawing pages 9–11: F1 +0.000, F2 +4.100, roof slab +7.700.
const H=4.1,UPPER_HEIGHT=3.6,ROOF_LEVEL=H+UPPER_HEIGHT;
function piece(rect,y,h,m=wall,parent=house){const [x1,z1,x2,z2]=rect;const mesh=box((x2-x1)/1000,h,(z2-z1)/1000,(x1+x2)/2000-6,y+h/2,(z1+z2)/2000-5.9,m,parent);mesh.userData.planRect=[...rect];mesh.userData.planY=y;mesh.userData.planHeight=h;return mesh;}
function frameOpening(rect,y,height,isDoor=false,openingName=''){const [x1,z1,x2,z2]=rect,horizontal=x2-x1>z2-z1;const width=(horizontal?x2-x1:z2-z1)/1000;const x=(x1+x2)/2000-6,z=(z1+z2)/2000-5.9;
 const group=new THREE.Group();group.userData.opening={rect:[...rect],floor:Math.round(y/H),isDoor};const level=Math.round(y/H)+1,[face,faceZh,faceEn]=facade(rect,level);
 labelPart(group,`opening-${level}-${isDoor?'door':'window'}-${rect.join('-')}`,`${level===1?'一楼':'二楼'}${openingName||(faceZh+(isDoor?'门':'窗户'))}`,`Floor ${level} ${faceEn} ${isDoor?'door':'window'}`);group.position.set(x,y,z);if(!horizontal)group.rotation.y=Math.PI/2;house.add(group);
 box(width,height,.055,0,height/2,0,isDoor?mat('#4d565c',.55):glass,group);
 for(const a of [-width/2,width/2])box(.065,height+.12,.11,a,height/2,.025,frame,group);
 for(const a of [0,height])box(width+.13,.065,.11,0,a,.025,frame,group);
 box(.045,height,.10,0,height/2,.04,frame,group);if(!isDoor)box(width,.04,.10,0,height*.48,.04,frame,group);
 for(const a of [-width/2-.14,width/2+.14])box(.14,height+.40,.27,a,height/2,0,trim,group);
 box(width+.42,.12,.31,0,height+.14,0,trim,group);box(width+.48,.1,.34,0,-.13,0,trim,group);
 if(isDoor)for(const a of [-.1,.1])box(.025,.32,.06,a,1,.10,frame,group);
}
// Distances are in metres. Eaves project 600 mm from the wall's outer face.
const EAVE_OVERHANG=.60;
const upperWallOutline=[[-6.1,-6],[6.1,-6],[6.1,5.2],[1.9,5.2],[1.9,2.7],[-6.1,2.7]];
const lowerWallOutline=[[-6.1,-6],[6.1,-6],[6.1,5.2],[2.1,5.2],[2.1,5.9],[-6.1,5.9]];
const groundOutline=[[-6.15,-6.05],[6.15,-6.05],[6.15,5.25],[2.15,5.25],[2.15,6.05],[-6.15,6.05]];
function extendOutline(outline,distance){
 return outline.map(([x,z],i)=>{
  const previous=outline[(i+outline.length-1)%outline.length],next=outline[(i+1)%outline.length];
  const incoming=new THREE.Vector2(x-previous[0],z-previous[1]).normalize();
  const outgoing=new THREE.Vector2(next[0]-x,next[1]-z).normalize();
  const a=new THREE.Vector2(incoming.y,-incoming.x),b=new THREE.Vector2(outgoing.y,-outgoing.x);
  const offset=a.clone().add(b).multiplyScalar(distance/(1+a.dot(b)));
  return [x+offset.x,z+offset.y];
 });
}
function slab(y,isRoof=false,overhang=0,isUpperFloor=false){
 const outline=isRoof?upperWallOutline:isUpperFloor?lowerWallOutline:groundOutline;
 const footprint=overhang?extendOutline(outline,overhang):outline;
 const shape=new THREE.Shape();footprint.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
 const mesh=new THREE.Mesh(geometry,trim);mesh.userData.roof=isRoof;mesh.userData.overhang=overhang;mesh.userData.upperFloor=isUpperFloor;
 mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;house.add(mesh);
 labelPart(mesh,isRoof?'roof':isUpperFloor?'floor-2-slab':'floor-1-slab',isRoof?'屋顶':isUpperFloor?'露台楼板':'一楼地面',isRoof?'Roof':isUpperFloor?'Terrace slab':'Floor 1 ground');
 if(isUpperFloor)mesh.userData.edgePart={id:'floor-2-slab',zh:'露台楼板边缘',en:'Terrace slab edge'};
 if(overhang){
  const ringShape=new THREE.Shape();footprint.forEach(([x,z],i)=>i?ringShape.lineTo(x,-z):ringShape.moveTo(x,-z));ringShape.closePath();
  const hole=new THREE.Path();outline.forEach(([x,z],i)=>i?hole.lineTo(x,-z):hole.moveTo(x,-z));hole.closePath();ringShape.holes.push(hole);
  const ringGeometry=new THREE.ExtrudeGeometry(ringShape,{depth:.20,bevelEnabled:false});ringGeometry.rotateX(-Math.PI/2);
  const ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({transparent:true,opacity:0,colorWrite:false,depthWrite:false,side:THREE.DoubleSide}));ring.position.y=y+.002;house.add(ring);
  labelPart(ring,'upper-eaves','二楼挑檐（60 cm）','Floor 2 eaves (600 mm)');mesh.userData.edgePart=ring.userData.part;
 }
 return mesh;
}
function railing(x1,z1,x2,z2,y){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),group=new THREE.Group();group.position.set((x1+x2)/2,y,(z1+z2)/2);group.rotation.y=-Math.atan2(dz,dx);rails.add(group);labelPart(group,'terrace-railing','露台栏杆','Terrace railings');box(len,.065,.07,0,1.05,0,frame,group);box(len,.05,.055,0,.15,0,frame,group);for(let x=-len/2;x<=len/2+.001;x+=.13)box(.022,.9,.022,x,.6,0,frame,group);for(let x=-len/2;x<=len/2+.001;x+=1.5)box(.055,1.05,.055,x,.525,0,frame,group);}
try{
const plans=await Promise.all([1,2].map(async i=>{let r=await fetch(`../plans/plan-floor${i}.json`);if(!r.ok)throw new Error('plan load');return r.json()}));
plans.forEach((p,index)=>{
const g=(p.state||p).geometry,y=index*H,height=index===0?H:UPPER_HEIGHT;
// Reuse the existing floor-plan coordinates, keeping wall and opening locations.
for(const r of g.walls){
 if(r[4]==='low')continue;
 const bounds=r.slice(0,4);
 // Pages 9–11 show an open porch with two posts, not full-height side walls.
 if(index===0&&bounds[0]===7900&&bounds[1]===9500)continue;
 if(index===0&&bounds[0]===-100&&bounds[3]===11800)bounds[3]=9500;
 labelWall(piece(bounds,y,height),bounds,index+1);
 // Small recessed horizontal joints follow existing exterior faces only.
 const external=r[4]==='e'||(r[1]>=8400&&r[3]-r[1]===200);if(external&&r[2]-r[0]>.4){for(let h=.65;h<height;h+=.4){const b=labelWall(piece(bounds,y+h,.011,base,lines),bounds,index+1);if(bounds[2]-bounds[0]>bounds[3]-bounds[1])b.scale.z=1.012;else b.scale.x=1.012;}}
}
for(const r of g.windows){labelWall(piece(r,y,.85),r,index+1);labelWall(piece(r,y+2.75,height-2.75),r,index+1);frameOpening(r,y+.85,1.9);}
for(const d of g.doors){labelWall(piece(d.rect,y+2.65,height-2.65),d.rect,index+1);frameOpening(d.rect,y,2.65,true,d.name);}
});
slab(-.2);slab(H-.18,false,0,true);slab(ROOF_LEVEL-.18,true,EAVE_OVERHANG);
plans.forEach((plan,index)=>{
 for(const room of (plan.state||plan).geometry.rooms){
  if(room.outdoor)region(room.poly,index*H+.023,room.id,room.id==='terrace'?'露台':'一楼门廊',room.id==='terrace'?'Terrace':'Floor 1 porch');
 }
});
// Two square porch columns shown in drawing pages 9–11, near axes 1/G and 3/G.
// The 400 mm section and trim dimensions are estimates from the scan.
const porchColumns=new THREE.Group();house.add(porchColumns);
for(const [name,x] of [['left',-5.8],['right',1.8]]){
 const column=new THREE.Group();column.position.set(x,0,5.7);column.userData.porchColumn=true;porchColumns.add(column);
 labelPart(column,'porch-column-'+name,name==='left'?'一楼左侧门廊柱':'一楼右侧门廊柱',name==='left'?'Floor 1 left porch column':'Floor 1 right porch column');
 box(.40,.90,.40,0,.45,0,wall,column);
 box(.50,.12,.50,0,.96,0,trim,column);
 const shaftTop=H-.34;
 box(.40,shaftTop-1.02,.40,0,(shaftTop+1.02)/2,0,wall,column);
 box(.50,.16,.50,0,H-.26,0,trim,column);
 // Recessed panel on the front face of each pedestal.
 box(.27,.22,.012,0,.60,.205,base,column);
 for(const sign of [-1,1])box(.018,.25,.02,sign*.145,.60,.215,trim,column);
 for(const sign of [-1,1])box(.31,.018,.02,0,.60+sign*.125,.215,trim,column);
}
// Terrace guardrail is a finish proposal, on the unchanged terrace boundary.
railing(-6,5.9,2,5.9,H);railing(-6,2.6,-6,5.9,H);railing(2,5.1,2,5.9,H);
// Light base finish strips follow the as-built outline.
const baseStart=house.children.length;
box(12,.45,.045,0,.225,-6.025,base);box(.045,.45,11.8,-6.125,.225,-.05,base);box(.045,.45,11.0,6.125,.225,-.4,base);box(4.1,.45,.045,4,.225,5.125,base);
for(const mesh of house.children.slice(baseStart))labelPart(mesh,'base-trim','基座饰面','Base finish');
// Roof stair enclosure above the existing rear-right stair footprint. Height is estimated.
const towerStart=house.children.length;
const ry=ROOF_LEVEL,tx=4,tz=-1.65,tw=3.35,td=2.45,th=2.45;
box(tw,th,.18,tx,ry+th/2,tz-td/2);box(.18,th,td,tx-tw/2,ry+th/2,tz);box(.18,th,td,tx+tw/2,ry+th/2,tz);
box((tw-1)/2,th,.18,tx-(tw+1)/4,ry+th/2,tz+td/2);box((tw-1)/2,th,.18,tx+(tw+1)/4,ry+th/2,tz+td/2);box(1,.35,.18,tx,ry+th-.175,tz+td/2);box(1,2.1,.06,tx,ry+1.05,tz+td/2,frame);box(tw+.3,.18,td+.3,tx,ry+th+.09,tz,trim);
for(const mesh of house.children.slice(towerStart))labelPart(mesh,'roof-tower','屋顶楼堡','Roof stair enclosure');
// Low roof edge proposal kept separate from the structural floor-plan geometry.
for(const [w,d,x,z] of [[12,.12,0,-5.95],[.12,11,6,-.4],[4,.12,4,5.1],[.12,2.5,2,3.85],[8,.12,-2,2.6],[.12,8.5,-6,-1.65]])labelPart(box(w,.30,d,x,ry+.15,z,trim),'parapet','屋顶矮墙','Roof parapet');
// Modest wall-mounted entrance lights, without extra balconies or landscape structures.
for(const x of [-1.45,1.45]){labelPart(box(.16,.3,.13,x,2.2,3.68,frame),'entrance-light','门廊壁灯','Porch wall lights');const lamp=new THREE.PointLight(0xffd9a1,0,4);lamp.position.set(x,2.2,3.9);scene.add(lamp);lamp.userData.facadeLamp=true;}
$('#loading').hidden=true;$('#export').disabled=false;
}catch(e){console.error(e);loadingMessage('模型数据未能加载，请检查网络后刷新。','Model data could not load. Check the network and reload.');}
function save(){try{localStorage.setItem('floorplan-exterior-v1',JSON.stringify(config))}catch{}}
function apply(){wall.color.set(config.wall);base.color.set(config.base);frame.color.set(config.frame);lines.visible=config.lines;rails.visible=config.rail;$('#wallColor').value=config.wall;$('#baseColor').value=config.base;$('#frameColor').value=config.frame;$('#lines').checked=config.lines;$('#rail').checked=config.rail;$('#sun').value=config.sun;
const t=config.sun/100;sun.position.set(-18+36*t,4+20*Math.sin(Math.PI*t),15);sun.intensity=t<.15?1.1:3.2;hemi.intensity=t<.15?.9:2.2;sun.color.set(t<.3?'#ffd09b':'#fff1d5');$('#sunLabel').textContent=t<.2?tr('傍晚','Evening'):t<.5?tr('清晨','Morning'):tr('午后','Afternoon');scene.traverse(o=>{if(o.userData.facadeLamp)o.intensity=t<.2?6:0});
const name=Object.entries(palette).find(([,p])=>p[0]===config.wall&&p[1]===config.base&&p[2]===config.frame)?.[0];document.querySelectorAll('[data-scheme]').forEach(b=>b.classList.toggle('active',b.dataset.scheme===name));save();}
for(const key of ['wall','base','frame'])$('#'+key+'Color').addEventListener('input',e=>{config[key]=e.target.value;apply()});
for(const key of ['lines','rail'])$('#'+key).addEventListener('change',e=>{config[key]=e.target.checked;apply()});
$('#sun').addEventListener('input',e=>{config.sun=+e.target.value;apply()});$('#auto').addEventListener('change',e=>controls.autoRotate=e.target.checked);
document.querySelectorAll('[data-scheme]').forEach(b=>b.onclick=()=>{[config.wall,config.base,config.frame]=palette[b.dataset.scheme];apply()});
const directions={perspective:[18,9.4,23],front:[0,2.4,27],left:[-29,4.4,0],right:[29,4.4,0],back:[0,4.4,-29],top:[0,33,.01]};
const modelBounds=new THREE.Box3().setFromObject(house).union(new THREE.Box3().setFromObject(foundation));
let cameraFramed=false;
function fitModel(direction){frameCamera(camera,controls,modelBounds,host.clientWidth,host.clientHeight,direction);cameraFramed=true;}
function view(name){fitModel(new THREE.Vector3(...directions[name]));document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));controls.addEventListener('start',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'))});
$('#reset').onclick=()=>{config={...defaults};apply();view('perspective');$('#auto').checked=false;controls.autoRotate=false};
$('#export').onclick=()=>{annotations.clear();renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download=tr('临高自建房-外观方案.png','lingao-house-exterior.png');a.click()};
const annotations=createAnnotations({scene,camera,controls,canvas:renderer.domElement,roots:[house,foundation],label:$('#partLabel'),tr});
document.addEventListener('workspace-language',apply);
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);fitModel(cameraFramed?camera.position.clone().sub(controls.target):new THREE.Vector3(...directions.perspective));};new ResizeObserver(resize).observe(host);resize();apply();view('perspective');
renderer.setAnimationLoop(()=>{controls.update();annotations.update();renderer.render(scene,camera)});
