import * as THREE from "./vendor/three.module.js";
import { buildWebSocketUrl, clamp, parseControlPacket, projectPlaneControl } from "./game-core.js";

const canvas = document.querySelector("#game");
const ui = {
  altitude: document.querySelector("#altitude"), speed: document.querySelector("#speed"), score: document.querySelector("#score"),
  ammo: document.querySelector("#ammo-bar"), weapon: document.querySelector("#weapon-state"), state: document.querySelector("#connection-state"),
  dot: document.querySelector("#connection-dot"), config: document.querySelector("#config-button"), launch: document.querySelector("#launch-button"),
  panel: document.querySelector("#connection-panel"), form: document.querySelector("#connection-form"), host: document.querySelector("#esp32-host"),
  closeConfig: document.querySelector("#close-config"), error: document.querySelector("#connection-error"),
  sensitivity: document.querySelector("#sensitivity"), sensitivityValue: document.querySelector("#sensitivity-value"),
  tabs: document.querySelectorAll(".landing-tab"), tabPanels: document.querySelectorAll(".landing-tab-panel"),
  restart: document.querySelector("#restart-button"),
  reticle: document.querySelector(".reticle"),
  start: document.querySelector("#start-screen"), toast: document.querySelector("#toast"),
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030817);
scene.fog = new THREE.FogExp2(0x07152b, 0.012);
const camera = new THREE.PerspectiveCamera(61, innerWidth / innerHeight, 0.1, 330);
camera.position.set(0, 4.3, 10.5);
const aimPoint = new THREE.Vector3();
const aimDirection = new THREE.Vector3(0, 0, -1);
const AIM_DISTANCE = 24;

scene.add(new THREE.HemisphereLight(0x213c78, 0x02030d, 1.55));
const sun = new THREE.DirectionalLight(0x6c82ff, 1.4); sun.position.set(-22, 26, 12); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const neonKey = new THREE.PointLight(0xff3da8, 18, 70); neonKey.position.set(-8, 9, -28); scene.add(neonKey);
const cyanKey = new THREE.PointLight(0x28e6ff, 14, 58); cyanKey.position.set(14, 5, -40); scene.add(cyanKey);
const starPositions = new Float32Array(720 * 3);
for (let index = 0; index < 720; index += 1) {
  starPositions[index * 3] = (Math.random() - 0.5) * 220;
  starPositions[index * 3 + 1] = 12 + Math.random() * 92;
  starPositions[index * 3 + 2] = -30 - Math.random() * 250;
}
const starField = new THREE.Points(
  new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3)),
  new THREE.PointsMaterial({ color: 0xb7e8ff, size: 0.16, transparent: true, opacity: 0.82, sizeAttenuation: true }),
);
scene.add(starField);
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(360, 600), new THREE.MeshStandardMaterial({ color:0x061b3d, roughness:.18, metalness:.62 })); ocean.rotation.x=-Math.PI/2; ocean.position.y=-3.2; ocean.receiveShadow=true; scene.add(ocean);
const beach = new THREE.Mesh(new THREE.PlaneGeometry(35,600),new THREE.MeshStandardMaterial({color:0x34214d,roughness:.82,emissive:0x120820,emissiveIntensity:.35})); beach.rotation.x=-Math.PI/2; beach.position.set(21,-3.15,-100); scene.add(beach);

const plane = new THREE.Group();
const planeBody = new THREE.MeshStandardMaterial({color:0xece5cf, metalness:.72, roughness:.27});
const planeTrim = new THREE.MeshStandardMaterial({color:0x092d45, metalness:.55, roughness:.3});
const glow = new THREE.MeshStandardMaterial({color:0xff704f, emissive:0xc3251d, emissiveIntensity:3});
function part(geometry, material, x,y,z, rx=0,ry=0,rz=0){ const mesh=new THREE.Mesh(geometry,material); mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz); mesh.castShadow=true; plane.add(mesh); return mesh; }
part(new THREE.CylinderGeometry(.38,.58,4.8,12),planeBody,0,0,0,Math.PI/2,0,0);
part(new THREE.ConeGeometry(.38,1.4,12),planeBody,0,0,2.98,-Math.PI/2,0,0);
part(new THREE.BoxGeometry(7,.12,1.15),planeBody,0,-.02,-.25,0,0,.03);
part(new THREE.BoxGeometry(2.35,.12,.72),planeTrim,0,.34,-2.08,0,0,.08);
part(new THREE.BoxGeometry(.18,1.28,.72),planeTrim,0,.48,-2.3,0,0,0);
part(new THREE.BoxGeometry(.12,.84,.52),glow,0,.53,-2.39,0,0,0);
const bladeMaterial = new THREE.MeshStandardMaterial({color:0x030508, metalness:.72, roughness:.3});
const tailLightMaterial = new THREE.MeshStandardMaterial({color:0xff4b91,emissive:0xff1677,emissiveIntensity:3.2});
const tailBoom = part(new THREE.CylinderGeometry(.22,.46,1.45,10),planeTrim,0,.08,-2.45,Math.PI/2,0,0);
tailBoom.castShadow = true;
const tailLight = part(new THREE.SphereGeometry(.13,12,8),tailLightMaterial,0,.42,-3.62);

const tailBeacon = new THREE.PointLight(0xff3f9f,1.8,5);
tailBeacon.position.set(0,.42,-3.62);
plane.add(tailBeacon);
const wingRotors=[];
for (const x of [-2.55, 2.55]) {
  const rotor = new THREE.Group();
  rotor.position.set(x,.02,1.82);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),glow);
  rotor.add(hub);
  for (let bladeIndex=0; bladeIndex<3; bladeIndex+=1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.12,.92,.06),bladeMaterial);
    blade.rotation.z = bladeIndex * Math.PI * 2 / 3;
    rotor.add(blade);
  }
  plane.add(rotor);
  wingRotors.push({rotor, direction:x<0?1:-1});
}
plane.position.set(0,.2,1.3); plane.scale.setScalar(.64); scene.add(plane);

const city = new THREE.Group(); scene.add(city);
const windowMaterials=[0x16e4ff,0xff3daa,0xffc857,0x7d6cff].map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2.4,roughness:.3}));
const buildingMats=[0x111d38,0x18284a,0x251d48,0x302040,0x102f4a].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.64,metalness:.3}));
function seeded(n){ return (Math.sin(n*999.7)*43758.55)%1; }
for(let i=0;i<155;i++) { const seed=i*19.7; const side=i%2?1:-1; const width=2+Math.abs(seeded(seed))*3.8; const depth=2+Math.abs(seeded(seed+2))*4; const h=4+Math.abs(seeded(seed+3))*24; const building=new THREE.Group(); const core=new THREE.Mesh(new THREE.BoxGeometry(width,h,depth),buildingMats[i%buildingMats.length]); core.position.y=h/2-3.1; core.castShadow=true; building.add(core); const floors=Math.floor(h/2.4); for(let f=0;f<floors;f+=2){const windows=new THREE.Mesh(new THREE.BoxGeometry(width*.72,.32,.05),windowMaterials[(i+f)%windowMaterials.length]); windows.position.set(0,-2.1+f*2.35,depth/2+.03);building.add(windows);} building.position.set(side*(8+Math.abs(seeded(seed+7))*17),0,-20-i*5.6); city.add(building); }

const obstacles=[], bullets=[], particles=[];
const spriteTexture = new THREE.TextureLoader().load("./assets/spark1.png");
function spawnObstacle(z=-125){ const group=new THREE.Group(); const targetMaterial=new THREE.MeshStandardMaterial({color:0x24103d,metalness:.72,roughness:.22,emissive:0x94145f,emissiveIntensity:1.8}); const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.82,2),targetMaterial); group.add(body); for(let a=0;a<3;a++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.35+a*.3,.035,8,32),new THREE.MeshBasicMaterial({color:a%2?0x24e8ff:0xff3daa,transparent:true,opacity:.9}));ring.rotation.set(a*.55,a*.8,a*.35);group.add(ring);} const beacon=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshBasicMaterial({color:0xffd36b})); beacon.position.y=1.05; group.add(beacon); const warning=new THREE.PointLight(0xff2f9f,5,10);group.add(warning); group.position.set((Math.random()-.5)*11,-.2+Math.random()*6,z); scene.add(group); obstacles.push({group, spin:(Math.random()-.5)*2, radius:1.55}); }
for(let i=0;i<9;i++)spawnObstacle(-38-i*22);
function segmentIntersectsSphere(start, end, center, radius) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared === 0) {
    return start.distanceToSquared(center) <= radius * radius;
  }
  const projection = clamp(center.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  const closest = start.clone().addScaledVector(segment, projection);
  return closest.distanceToSquared(center) <= radius * radius;
}

function fire(){ if(!started || bullets.length>6)return; const direction=aimDirection.clone().normalize(); const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.0,6),new THREE.MeshBasicMaterial({color:0xd5fff0})); bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction); bolt.position.copy(plane.position).addScaledVector(direction,1.5); scene.add(bolt); bullets.push({mesh:bolt, velocity:direction.multiplyScalar(105), life:2.5}); ui.weapon.textContent="SKYFIRE / FIRING"; setTimeout(()=>ui.weapon.textContent="SKYFIRE / ARMED",180); }
function explode(position){ for(let i=0;i<18;i++){const p=new THREE.Sprite(new THREE.SpriteMaterial({map:spriteTexture,color:i%2?0xffcf71:0xff6848,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));p.scale.setScalar(.5+Math.random()*.55);p.position.copy(position);scene.add(p);particles.push({mesh:p,velocity:new THREE.Vector3((Math.random()-.5)*7,(Math.random()-.5)*7,(Math.random()-.5)*7),life:.55+Math.random()*.45});} }

let socket, reconnectTimer, started=false, score=0, distance=0, fireSeen=0;
const controls={roll:0,pitch:0, keys:{}};
const storedSensitivity = Number(localStorage.getItem("miami-saga.sensitivity"));
let sensitivity = Number.isFinite(storedSensitivity)
  ? (storedSensitivity > 1 ? storedSensitivity / 100 : storedSensitivity)
  : Number(ui.sensitivity.value) / 100;
sensitivity = clamp(sensitivity, 0.45, 1);
ui.sensitivity.value = Math.round(sensitivity * 100);
ui.sensitivityValue.textContent = `${Math.round(sensitivity * 100)}%`;
const storedHost = localStorage.getItem("miami-saga.esp32-host");
if (storedHost) ui.host.value = storedHost;
function setConnection(state){ const online=state==="ONLINE"; ui.state.textContent=`CONTROLLER ${state}`; ui.dot.classList.toggle("online",online); ui.config.textContent=online?"CONFIGURE LINK":"CONFIGURE LINK"; }
function toast(message){ui.toast.textContent=message;ui.toast.classList.add("visible");setTimeout(()=>ui.toast.classList.remove("visible"),1800);}
function showConfig(message=""){ ui.error.textContent=message; ui.panel.hidden=false; ui.host.focus(); }
function hideConfig(){ ui.panel.hidden=true; ui.error.textContent=""; }
function connectConfigured(){ const url=buildWebSocketUrl(ui.host.value); if(!url){showConfig("Enter a valid ESP32 IP address or host name.");return;} localStorage.setItem("miami-saga.esp32-host",ui.host.value.trim()); if(socket) socket.close(); setConnection("CONNECTING"); const currentSocket=new WebSocket(url); socket=currentSocket; currentSocket.addEventListener("open",()=>{if(socket!==currentSocket)return;setConnection("ONLINE");hideConfig();toast("MPU6050 LINK ESTABLISHED");}); currentSocket.addEventListener("message",event=>{const packet=parseControlPacket(event.data);if(!packet)return; const next=projectPlaneControl(packet);controls.roll=-next.roll*sensitivity;controls.pitch=next.pitch*sensitivity;if(packet.fire>fireSeen){fireSeen=packet.fire;fire();}}); currentSocket.addEventListener("close",()=>{if(socket!==currentSocket)return;socket=undefined;setConnection("OFFLINE");clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>{if(ui.host.value.trim())connectConfigured();},3000);}); currentSocket.addEventListener("error",()=>currentSocket.close()); }

addEventListener("keydown",e=>{controls.keys[e.key.toLowerCase()]=true;if(e.code==="Space"){e.preventDefault();fire();}}); addEventListener("keyup",e=>controls.keys[e.key.toLowerCase()]=false);
ui.tabs.forEach(tab=>tab.addEventListener("click",()=>{ui.tabs.forEach(item=>item.classList.toggle("active",item===tab));ui.tabPanels.forEach(panel=>{const active=panel.dataset.panel===tab.dataset.tab;panel.classList.toggle("active",active);panel.hidden=!active;});}));
ui.sensitivity.addEventListener("input",()=>{sensitivity=Number(ui.sensitivity.value)/100;ui.sensitivityValue.textContent=`${ui.sensitivity.value}%`;localStorage.setItem("miami-saga.sensitivity",sensitivity);});
ui.config.addEventListener("click",()=>showConfig()); ui.closeConfig.addEventListener("click",hideConfig); ui.form.addEventListener("submit",event=>{event.preventDefault();connectConfigured();}); ui.launch.addEventListener("click",()=>{started=true;ui.start.classList.add("hidden");ui.restart.hidden=false;ui.weapon.textContent="SKYFIRE / ARMED";toast("FLIGHT CONTROL LIVE");});
ui.restart.addEventListener("click",()=>location.reload());
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);} addEventListener("resize",resize);
const clock=new THREE.Clock();
function update(dt){ const keyRoll=(controls.keys.a||controls.keys.arrowleft?-1:0)+(controls.keys.d||controls.keys.arrowright?1:0); const keyPitch=(controls.keys.w||controls.keys.arrowup?1:0)+(controls.keys.s||controls.keys.arrowdown?-1:0); const roll=clamp(controls.roll+keyRoll,-1,1), pitch=clamp(controls.pitch+keyPitch,-1,1); if(started){plane.position.x=THREE.MathUtils.damp(plane.position.x,roll*6,3.5,dt);plane.position.y=THREE.MathUtils.damp(plane.position.y,.2+pitch*3.2,3.5,dt);plane.rotation.z=THREE.MathUtils.damp(plane.rotation.z,-roll*.54,5,dt);plane.rotation.x=THREE.MathUtils.damp(plane.rotation.x,pitch*.28,5,dt);distance+=dt*38;city.children.forEach(b=>{b.position.z+=dt*38;if(b.position.z>22)b.position.z-=870;});obstacles.forEach(o=>{o.group.position.z+=dt*38;o.group.rotation.y+=dt*o.spin;if(o.group.position.z>15){o.group.position.z=-180;o.group.position.x=(Math.random()-.5)*11;o.group.position.y=-.2+Math.random()*6;}});}
 if (started) {
  wingRotors.forEach(({rotor,direction})=>{rotor.rotation.z += dt * 34 * direction;});
  const beaconPhase = (performance.now() % 1400) / 1400;
  const beaconPulse = beaconPhase < 0.18 ? Math.sin(beaconPhase / 0.18 * Math.PI) : 0;
  tailBeacon.intensity = 0.35 + beaconPulse * 2.8;
  tailLight.material.emissiveIntensity = 1.4 + beaconPulse * 4.2;
 }
 camera.position.x=THREE.MathUtils.damp(camera.position.x,plane.position.x*.26,2.5,dt);camera.position.y=THREE.MathUtils.damp(camera.position.y,plane.position.y+4.2,2,dt);camera.lookAt(plane.position.x*.34,plane.position.y-.15,-11);
 aimDirection.set(0,0,-1).applyQuaternion(plane.quaternion).normalize();
 aimPoint.copy(plane.position).addScaledVector(aimDirection,AIM_DISTANCE);
 const projectedAim = aimPoint.clone().project(camera);
 const aimVisible = projectedAim.z > -1 && projectedAim.z < 1;
 ui.reticle.style.left = `${(projectedAim.x * 0.5 + 0.5) * innerWidth}px`;
 ui.reticle.style.top = `${(-projectedAim.y * 0.5 + 0.5) * innerHeight}px`;
 ui.reticle.style.opacity = aimVisible ? "0.82" : "0.22";
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];const previousPosition=b.mesh.position.clone();b.mesh.position.addScaledVector(b.velocity,dt);b.life-=dt;if(b.life<0){scene.remove(b.mesh);bullets.splice(i,1);continue;}for(let j=obstacles.length-1;j>=0;j--){const o=obstacles[j];if(segmentIntersectsSphere(previousPosition,b.mesh.position,o.group.position,o.radius+1.3)){explode(o.group.position);scene.remove(o.group);obstacles.splice(j,1);scene.remove(b.mesh);bullets.splice(i,1);score+=250;spawnObstacle(-185);break;}}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.scale.multiplyScalar(.985);p.life-=dt;if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}}
 ui.altitude.textContent=Math.round(420+plane.position.y*55);ui.speed.textContent=Math.round(318+Math.abs(roll)*14);ui.score.textContent=String(score).padStart(6,"0");ui.ammo.style.width=`${Math.max(15,100-bullets.length*12)}%`;
}
function loop(){const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera);requestAnimationFrame(loop);} if(storedHost){connectConfigured();}else{setConnection("NOT CONFIGURED");}loop();
