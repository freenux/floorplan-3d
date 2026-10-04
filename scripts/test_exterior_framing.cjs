const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..');
  const threeUrl = pathToFileURL(path.join(root, 'vendor/three/three.module.js')).href;
  const THREE = await import(threeUrl);
  const framingSource = fs.readFileSync(path.join(root, 'exterior/framing.js'), 'utf8').replace("from 'three'", `from '${threeUrl}'`);
  const {frameCamera} = await import('data:text/javascript;base64,' + Buffer.from(framingSource).toString('base64'));
  const sceneSource = fs.readFileSync(path.join(root, 'exterior/scene.js'), 'utf8');
  // Build the actual model from the same source and plans used by the browser.
  const modelSource = sceneSource.slice(sceneSource.indexOf('const mat='), sceneSource.indexOf('function save()'));
  const {house, foundation} = await vm.runInNewContext(`(async () => { ${modelSource}; return {house, foundation}; })()`, {
    THREE, scene: new THREE.Scene(), config: {wall:'#f2f1eb',base:'#a3a9ae',frame:'#303940'},
    console, $: () => ({}), loadingMessage: () => {throw Error('Model could not load');},
    fetch: async url => ({ok:true,json:async () => JSON.parse(fs.readFileSync(path.resolve(root,'exterior',url),'utf8'))}),
  });
  // Check the actual mesh dimensions against the user's 600 mm projection.
  const eaves = house.children.filter(mesh => mesh.userData.overhang > 0);
  assert.equal(eaves.length,1,'only floor 2 has eaves');
  assert.equal(eaves[0].userData.roof,true);
  const approx = (actual,expected,label) => assert(Math.abs(actual-expected)<1e-5,`${label}: ${actual} != ${expected}`);
  for (const eave of eaves) {
    const edges = new THREE.Box3().setFromObject(eave);
    approx(edges.min.x,-6.7,'left wall face -6.1 plus 0.6 m');
    approx(edges.max.x,6.7,'right wall face 6.1 plus 0.6 m');
    approx(edges.min.z,-6.6,'rear wall face -6.0 plus 0.6 m');
    approx(edges.max.z,eave.userData.roof?5.8:6.5,'front eaves');
    approx(edges.max.y-edges.min.y,.20,'slab thickness');
    if(eave.userData.roof){
      const vertices=eave.geometry.attributes.position;
      let terraceEdge=-Infinity;
      for(let i=0;i<vertices.count;i++)if(vertices.getX(i)<0)terraceEdge=Math.max(terraceEdge,vertices.getZ(i));
      approx(terraceEdge,3.3,'recessed front wall face 2.7 plus 0.6 m');
      assert(terraceEdge<5.9,'the terrace must stay open beyond the eaves');
    }
  }
  const terraceSlab=house.children.find(mesh=>mesh.userData.upperFloor);
  assert.equal(terraceSlab.userData.overhang,0,'no floor 1 eaves');
  const terraceBounds=new THREE.Box3().setFromObject(terraceSlab);
  approx(terraceBounds.min.x,-6.1,'terrace slab stays within wall outline');
  approx(terraceBounds.max.x,6.1,'terrace slab right edge');
  approx(terraceBounds.max.z,5.9,'terrace slab front edge');
  approx(terraceBounds.max.y,4.12,'F2 level with slab finish');
  const roofBounds=new THREE.Box3().setFromObject(eaves[0]);
  approx(roofBounds.max.y,7.72,'roof slab level');
  const columns=[];house.traverse(object=>{if(object.userData.porchColumn)columns.push(object);});
  assert.equal(columns.length,2,'two porch columns');
  for(const column of columns){
    const columnBounds=new THREE.Box3().setFromObject(column);
    approx(columnBounds.min.y,0,'column starts on floor 1');
    approx(columnBounds.max.y,terraceBounds.min.y,'column meets slab underside');
    approx(column.position.z,5.7,'column near front G axis');
  }
  assert.equal(house.children.some(mesh=>mesh.userData.planRect?.[0]===7900&&mesh.userData.planRect?.[1]===9500&&mesh.userData.planY===0),false,'no right porch side wall');
  assert.equal(house.children.some(mesh=>mesh.userData.planRect?.[0]===-100&&mesh.userData.planRect?.[3]===11800&&mesh.userData.planY===0),false,'no left wall covering porch opening');
  const bounds = new THREE.Box3().setFromObject(house).union(new THREE.Box3().setFromObject(foundation));
  const directions = {perspective:[18,9.4,23],front:[0,2.4,27],left:[-29,4.4,0],right:[29,4.4,0],back:[0,4.4,-29],top:[0,33,.01],rotated:[1,.2,-.8]};
  const sizes = [[980,570.5],[663,371.8359375],[390,472.64],[488,694.5],[320,340],[1100,260],[220,600],[900,220]];
  let checks = 0;
  for (const [width,height] of sizes) {
    for (const [name, direction] of Object.entries(directions)) {
      const camera = new THREE.PerspectiveCamera(42,1,.1,140);
      const controls = {target:new THREE.Vector3(),minDistance:9,maxDistance:48,enableDamping:true,autoRotate:false,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
      frameCamera(camera,controls,bounds,width,height,new THREE.Vector3(...direction));
      for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
        const projected = new THREE.Vector3(x,y,z).project(camera);
        const label = `${name} at ${width}×${height}`;
        assert(Math.abs(projected.x) <= 1-2*Math.min(24,width*.1)/width, `${label}: horizontal clipping`);
        assert(Math.abs(projected.y) <= 1-2*Math.min(64,height*.18)/height, `${label}: vertical clipping`);
        assert(projected.z >= -1 && projected.z <= 1, `${label}: near/far clipping`);
      }
      assert.equal(controls.enableDamping,true);
      assert.equal(camera.aspect,width/height);
      checks++;
    }
  }
  const css = fs.readFileSync(path.join(root,'exterior/style.css'),'utf8');
  assert.match(css,/#scene canvas\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/);
  for (const file of ['exterior/style.css','exterior/scene.js','exterior/framing.js']) assert.equal(fs.readFileSync(path.join(root,file),'utf8'),fs.readFileSync(path.join(root,'dist',file),'utf8'));
  console.log(`PASS: actual house and foundation fit all 6 views and a rotated view at 8 canvas sizes (${checks} checks); 600 mm roof eaves, no floor 1 eaves, two porch columns, drawing levels; CSS canvas size and dist files match`);
})().catch(error => {console.error(error);process.exitCode=1;});
