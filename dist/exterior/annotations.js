import {DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector2} from 'three';

export function getPart(object) {
  for (let current=object;current;current=current.parent) if(current.userData.part) return current.userData.part;
  return null;
}
export function isVisible(object) {
  for(let current=object;current;current=current.parent) if(!current.visible) return false;
  return true;
}
export function pickPart(raycaster, roots) {
  for(const hit of raycaster.intersectObjects(roots,true)) {
    if(!isVisible(hit.object)) continue;
    const part=hit.object.userData.edgePart&&hit.face&&hit.face.normal.y<.5?hit.object.userData.edgePart:getPart(hit.object);
    // Stop at the nearest visible surface, including any unnamed surface.
    return part?{...hit,part}:null;
  }
  return null;
}

export function createAnnotations({scene,camera,controls,canvas,roots,label,tr}) {
  const raycaster=new Raycaster(),pointer=new Vector2(),outline=new Group();
  const material=new MeshBasicMaterial({color:'#b5653a',transparent:true,opacity:.28,side:DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const members=new Map();
  for(const root of roots) root.traverse(object=>{
    if(!object.isMesh)return;
    const part=getPart(object);
    if(part){if(!members.has(part.id))members.set(part.id,[]);members.get(part.id).push(object);}
  });
  scene.add(outline);
  let active=false,suspended=false,dirty=false,currentId=null,lastLanguage=null;
  let lastMatrix=camera.matrixWorld.clone(),pressStart=null;
  function clear(){label.hidden=true;label.removeAttribute('data-part-id');outline.clear();currentId=null;canvas.style.cursor='';}
  function locate(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);dirty=true;}
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||event.buttons){active=false;clear();return;}
    active=true;locate(event);
  });
  canvas.addEventListener('pointerleave',event=>{if(event.pointerType==='touch')return;active=false;clear();});
  canvas.addEventListener('pointerdown',event=>{pressStart={x:event.clientX,y:event.clientY};active=false;clear();});
  canvas.addEventListener('pointerup',event=>{
    if(pressStart&&Math.hypot(event.clientX-pressStart.x,event.clientY-pressStart.y)<8){active=true;locate(event);}
    pressStart=null;
  });
  canvas.addEventListener('pointercancel',()=>{pressStart=null;active=false;clear();});
  controls.addEventListener('start',()=>{suspended=true;clear();});
  controls.addEventListener('end',()=>{suspended=false;dirty=true;});
  document.addEventListener('workspace-language',()=>{lastLanguage=null;dirty=true;});
  function update(){
    if(!active||suspended)return;
    if(!dirty&&lastMatrix.equals(camera.matrixWorld))return;
    dirty=false;lastMatrix.copy(camera.matrixWorld);
    scene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
    const hit=pickPart(raycaster,roots);
    if(!hit){clear();return;}
    if(currentId!==hit.part.id){
      outline.clear();currentId=hit.part.id;
      for(const object of members.get(currentId)||[]){
        if(!isVisible(object))continue;
        const overlay=new Mesh(object.geometry,material);
        overlay.matrixAutoUpdate=false;overlay.matrix.copy(object.matrixWorld);overlay.renderOrder=2;outline.add(overlay);
      }
    }
    const name=tr(hit.part.zh,hit.part.en);
    if(name!==lastLanguage){label.textContent=name;lastLanguage=name;}
    label.hidden=false;label.dataset.partId=currentId;canvas.style.cursor='help';
    const point=hit.point.clone().project(camera),rect=canvas.getBoundingClientRect();
    const halfWidth=label.offsetWidth/2+8;
    label.style.left=Math.max(halfWidth,Math.min(rect.width-halfWidth,(point.x+1)*rect.width/2))+'px';
    label.style.top=Math.max(label.offsetHeight+10,Math.min(rect.height-8,(1-point.y)*rect.height/2-14))+'px';
  }
  return {update,clear};
}
