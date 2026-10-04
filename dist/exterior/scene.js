import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s),host=$('#scene');
const palette={classic:['#f2f1eb','#a3a9ae','#303940'],sand:['#e7dcc9','#9b8874','#393c3c'],modern:['#d4dbdd','#4d5961','#26333b']};
const defaults={wall:palette.classic[0],base:palette.classic[1],frame:palette.classic[2],lines:true,rail:true,sun:65};
let config={...defaults};try{config={...config,...JSON.parse(localStorage.getItem('floorplan-exterior-v1')||'{}')}}catch{}
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){$('#loading').textContent='当前设备无法启动 WebGL，请使用支持 3D 的浏览器。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe9ee');scene.fog=new THREE.Fog('#dfe9ee',55,110);
const camera=new THREE.PerspectiveCamera(42,1,.1,140),controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3.6,0);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.65;
const hemi=new THREE.HemisphereLight(0xe4f4ff,0x8d927f,2.2);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1d5,3.2);sun.position.set(-13,22,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:65});sun.shadow.bias=-.0004;scene.add(sun);
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const wall=mat(config.wall),base=mat(config.base),frame=mat(config.frame,.5),trim=mat('#fafbf7'),roof=mat('#b5bec2'),ground=mat('#bdc9bc'),floor=mat('#a9b0b1'),inside=mat('#d4d0c9');
const glass=new THREE.MeshStandardMaterial({color:'#53798a',metalness:.35,roughness:.18,transparent:true,opacity:.7});
const house=new THREE.Group(),rails=new THREE.Group(),lines=new THREE.Group();scene.add(house);house.add(rails,lines);
function box(w,h,d,x,y,z,m=wall,parent=house){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
box(60,.15,60,0,-.24,0,ground,scene);box(14,.13,14,0,-.09,0,floor); // neutral ground, without inventing a courtyard
const H=3.4;
function piece(rect,y,h,m=wall,parent=house){const [x1,z1,x2,z2]=rect;const mesh=box((x2-x1)/1000,h,(z2-z1)/1000,(x1+x2)/2000-6,y+h/2,(z1+z2)/2000-5.9,m,parent);mesh.userData.planRect=[...rect];mesh.userData.planY=y;mesh.userData.planHeight=h;return mesh;}
function frameOpening(rect,y,height,isDoor=false){const [x1,z1,x2,z2]=rect,horizontal=x2-x1>z2-z1;const width=(horizontal?x2-x1:z2-z1)/1000;const x=(x1+x2)/2000-6,z=(z1+z2)/2000-5.9;
 const group=new THREE.Group();group.userData.opening={rect:[...rect],floor:Math.round(y/H),isDoor};group.position.set(x,y,z);if(!horizontal)group.rotation.y=Math.PI/2;house.add(group);
 box(width,height,.055,0,height/2,0,isDoor?mat('#4d565c',.55):glass,group);
 for(const a of [-width/2,width/2])box(.065,height+.12,.11,a,height/2,.025,frame,group);
 for(const a of [0,height])box(width+.13,.065,.11,0,a,.025,frame,group);
 box(.045,height,.10,0,height/2,.04,frame,group);if(!isDoor)box(width,.04,.10,0,height*.48,.04,frame,group);
 for(const a of [-width/2-.14,width/2+.14])box(.14,height+.40,.27,a,height/2,0,trim,group);
 box(width+.42,.12,.31,0,height+.14,0,trim,group);box(width+.48,.1,.34,0,-.13,0,trim,group);
 if(isDoor)for(const a of [-.1,.1])box(.025,.32,.06,a,1,.10,frame,group);
}
function slab(y,isRoof=false){const shape=new THREE.Shape();(isRoof?[[-6.15,-6.05],[6.15,-6.05],[6.15,5.25],[1.85,5.25],[1.85,2.75],[-6.15,2.75]]:[[-6.15,-6.05],[6.15,-6.05],[6.15,5.25],[2.15,5.25],[2.15,6.05],[-6.15,6.05]]).forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false});g.rotateX(-Math.PI/2);const o=new THREE.Mesh(g,trim);o.userData.roof=isRoof;o.position.y=y;o.castShadow=true;o.receiveShadow=true;house.add(o);}
function railing(x1,z1,x2,z2,y){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),group=new THREE.Group();group.position.set((x1+x2)/2,y,(z1+z2)/2);group.rotation.y=-Math.atan2(dz,dx);rails.add(group);box(len,.065,.07,0,1.05,0,frame,group);box(len,.05,.055,0,.15,0,frame,group);for(let x=-len/2;x<=len/2+.001;x+=.13)box(.022,.9,.022,x,.6,0,frame,group);for(let x=-len/2;x<=len/2+.001;x+=1.5)box(.055,1.05,.055,x,.525,0,frame,group);}
try{
const plans=await Promise.all([1,2].map(async i=>{let r=await fetch(`../plans/plan-floor${i}.json`);if(!r.ok)throw new Error('plan load');return r.json()}));
plans.forEach((p,index)=>{
const g=(p.state||p).geometry,y=index*H;
// Reuse the existing floor-plan coordinates, keeping wall and opening locations.
for(const r of g.walls){if(r[4]==='low')continue;const bounds=r.slice(0,4); piece(bounds,y,H);
 // Small recessed horizontal joints follow existing exterior faces only.
 const external=r[4]==='e'||(r[1]>=8400&&r[3]-r[1]===200);if(external&&r[2]-r[0]>.4){for(let h=.65;h<H;h+=.4){const b=piece(bounds,y+h,.011,base,lines);if(bounds[2]-bounds[0]>bounds[3]-bounds[1])b.scale.z=1.012;else b.scale.x=1.012;}}
}
for(const r of g.windows){piece(r,y,.85);piece(r,y+2.75,H-2.75);frameOpening(r,y+.85,1.9);}
for(const d of g.doors){piece(d.rect,y+2.65,H-2.65);frameOpening(d.rect,y,2.65,true);}
});
slab(-.2);slab(H-.18);slab(H*2-.18,true);
// Porch side supports are the existing x=0 and x=8000 walls, not added columns.
// White trim dresses those existing ends without adding structural members.
for(const x of [-6,2]){box(.26,.14,.26,x,.10,5.75,base);box(.27,.12,.27,x,H-.25,5.75,trim);}
// Terrace guardrail is a finish proposal, on the unchanged terrace boundary.
railing(-6,5.9,2,5.9,H);railing(-6,2.6,-6,5.9,H);railing(2,5.1,2,5.9,H);
// Light base finish strips follow the as-built outline.
box(12,.45,.045,0,.225,-6.025,base);box(.045,.45,11.8,-6.125,.225,-.05,base);box(.045,.45,11.0,6.125,.225,-.4,base);box(4.1,.45,.045,4,.225,5.125,base);
// Roof stair enclosure above the existing rear-right stair footprint. Height is estimated.
const ry=2*H,tx=4,tz=-1.65,tw=3.35,td=2.45,th=2.45;
box(tw,th,.18,tx,ry+th/2,tz-td/2);box(.18,th,td,tx-tw/2,ry+th/2,tz);box(.18,th,td,tx+tw/2,ry+th/2,tz);
box((tw-1)/2,th,.18,tx-(tw+1)/4,ry+th/2,tz+td/2);box((tw-1)/2,th,.18,tx+(tw+1)/4,ry+th/2,tz+td/2);box(1,.35,.18,tx,ry+th-.175,tz+td/2);box(1,2.1,.06,tx,ry+1.05,tz+td/2,frame);box(tw+.3,.18,td+.3,tx,ry+th+.09,tz,trim);
// Low roof edge proposal kept separate from the structural floor-plan geometry.
for(const [w,d,x,z] of [[12,.12,0,-5.95],[.12,11,6,-.4],[4,.12,4,5.1],[.12,2.5,2,3.85],[8,.12,-2,2.6],[.12,8.5,-6,-1.65]])box(w,.30,d,x,ry+.15,z,trim);
// Modest wall-mounted entrance lights, without extra balconies or landscape structures.
for(const x of [-1.45,1.45]){box(.16,.3,.13,x,2.2,3.68,frame);const lamp=new THREE.PointLight(0xffd9a1,0,4);lamp.position.set(x,2.2,3.9);scene.add(lamp);lamp.userData.facadeLamp=true;}
$('#loading').hidden=true;$('#export').disabled=false;
}catch(e){console.error(e);$('#loading').textContent='模型数据未能加载，请检查网络后刷新。';}
function save(){try{localStorage.setItem('floorplan-exterior-v1',JSON.stringify(config))}catch{}}
function apply(){wall.color.set(config.wall);base.color.set(config.base);frame.color.set(config.frame);lines.visible=config.lines;rails.visible=config.rail;$('#wallColor').value=config.wall;$('#baseColor').value=config.base;$('#frameColor').value=config.frame;$('#lines').checked=config.lines;$('#rail').checked=config.rail;$('#sun').value=config.sun;
const t=config.sun/100;sun.position.set(-18+36*t,4+20*Math.sin(Math.PI*t),15);sun.intensity=t<.15?1.1:3.2;hemi.intensity=t<.15?.9:2.2;sun.color.set(t<.3?'#ffd09b':'#fff1d5');$('#sunLabel').textContent=t<.2?'傍晚':t<.5?'清晨':'午后';scene.traverse(o=>{if(o.userData.facadeLamp)o.intensity=t<.2?6:0});
const name=Object.entries(palette).find(([,p])=>p[0]===config.wall&&p[1]===config.base&&p[2]===config.frame)?.[0];document.querySelectorAll('[data-scheme]').forEach(b=>b.classList.toggle('active',b.dataset.scheme===name));save();}
for(const key of ['wall','base','frame'])$('#'+key+'Color').addEventListener('input',e=>{config[key]=e.target.value;apply()});
for(const key of ['lines','rail'])$('#'+key).addEventListener('change',e=>{config[key]=e.target.checked;apply()});
$('#sun').addEventListener('input',e=>{config.sun=+e.target.value;apply()});$('#auto').addEventListener('change',e=>controls.autoRotate=e.target.checked);
document.querySelectorAll('[data-scheme]').forEach(b=>b.onclick=()=>{[config.wall,config.base,config.frame]=palette[b.dataset.scheme];apply()});
const positions={perspective:[18,13,23],front:[0,6,27],left:[-29,8,0],right:[29,8,0],back:[0,8,-29],top:[0,33,.01]};
function view(name){camera.position.set(...positions[name]);controls.target.set(0,name==='top'?0:3.6,0);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));controls.addEventListener('start',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'))});
$('#reset').onclick=()=>{config={...defaults};apply();view('perspective');$('#auto').checked=false;controls.autoRotate=false};
$('#export').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='临高自建房-外观方案.png';a.click()};
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};new ResizeObserver(resize).observe(host);resize();apply();view('perspective');
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
