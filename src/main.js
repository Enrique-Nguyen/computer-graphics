import './style.css'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


// ----- Scene, camera, renderer -----
const container = document.getElementById('container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe6ff);


const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 12);


const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);


const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,1,0);
controls.update();


// ----- Lights -----
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemi.position.set(0, 50, 0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(-5, 10, 5);
scene.add(dir);

// ----- Ground -----
const airplane = new THREE.Group();


// Fuselage (thân)
const fuselageGeo = new THREE.CylinderGeometry(0.5, 0.6, 6, 16);
const fuselage = new THREE.Mesh(fuselageGeo, simpleMat(0xcccccc));
fuselage.rotation.z = Math.PI/2; // dài theo z
airplane.add(fuselage);


// Nose cone
const noseGeo = new THREE.ConeGeometry(0.45, 1, 16);
const nose = new THREE.Mesh(noseGeo, simpleMat(0x333333));
nose.position.set(3.0, 0, 0); // vì fuselage rotated, x is forward
nose.rotation.z = Math.PI/2;
airplane.add(nose);


// Tail vertical fin
const tailGeo = new THREE.BoxGeometry(0.2, 0.9, 0.8);
const tail = new THREE.Mesh(tailGeo, simpleMat(0x222222));
tail.position.set(-2.8, 0.6, 0);
tail.rotation.z = Math.PI/2;
airplane.add(tail);


// Wings: we'll create two wing groups with pivots so they can fold
const wingLength = 4.0;
const wingThickness = 0.12;
const wingSpan = 1.0; // chord (front-back)


// wing geometry centered at origin; we'll offset it inside a pivot
const wingGeo = new THREE.BoxGeometry(wingLength, wingThickness, wingSpan);
const wingMat = simpleMat(0x0077cc);

// LEFT wing (negative X side visually)
let wingsFolded = false;
const wingFoldAngle = THREE.MathUtils.degToRad(75); // how much to fold (radians)
const animSpeed = 4.0; // larger = faster interpolation


// ----- Movement controls state -----
const input = {forward:false, back:false, left:false, right:false};
let velocity = 0;


// Keyboard handlers
window.addEventListener('keydown', (e)=>{
if(e.key === 'w' || e.key === 'W') input.forward = true;
if(e.key === 's' || e.key === 'S') input.back = true;
if(e.key === 'a' || e.key === 'A') input.left = true;
if(e.key === 'd' || e.key === 'D') input.right = true;
if(e.key === 'f' || e.key === 'F') wingsFolded = !wingsFolded;
if(e.key === 'r' || e.key === 'R') resetScene();
});
window.addEventListener('keyup', (e)=>{
if(e.key === 'w' || e.key === 'W') input.forward = false;
if(e.key === 's' || e.key === 'S') input.back = false;
if(e.key === 'a' || e.key === 'A') input.left = false;
if(e.key === 'd' || e.key === 'D') input.right = false;
});

function resetScene(){
airplane.position.set(0,1.2,0);
airplane.rotation.set(0, Math.PI/2, 0);
velocity = 0;
wingsFolded = false;
}


// ----- Simple update loop -----
const clock = new THREE.Clock();
function animate(){
const dt = Math.min(clock.getDelta(), 0.05);


// update wing pivots: interpolate toward target angle
const targetLeft = wingsFolded ? -wingFoldAngle : 0; // fold up for left: negative rotation around Z
const targetRight = wingsFolded ? wingFoldAngle : 0; // fold up for right: positive


// lerp angles (simple damping)
leftWingPivot.rotation.z += (targetLeft - leftWingPivot.rotation.z) * Math.min(animSpeed*dt, 1);
rightWingPivot.rotation.z += (targetRight - rightWingPivot.rotation.z) * Math.min(animSpeed*dt, 1);


// movement: accelerate/decay
if(input.forward) velocity = THREE.MathUtils.clamp(velocity + 10*dt, -8, 25);
else if(input.back) velocity = THREE.MathUtils.clamp(velocity - 10*dt, -25, 8);
else velocity = THREE.MathUtils.damp(velocity, 0, 3, dt);


// steering: rotate airplane around Y
if(input.left) airplane.rotation.y += 1.2*dt;
if(input.right) airplane.rotation.y -= 1.2*dt;


// translate local forward (-Z) based on velocity
airplane.translateZ(-velocity*dt);


// Keep camera following a bit
const camTarget = new THREE.Vector3();
airplane.getWorldPosition(camTarget);
camTarget.y += 1.6;
// camera lerp to a follow position behind plane
const desiredCamPos = camTarget.clone().add(new THREE.Vector3(0, 3, 8).applyQuaternion(airplane.quaternion));
camera.position.lerp(desiredCamPos, 0.06);
camera.lookAt(camTarget);


renderer.render(scene, camera);
requestAnimationFrame(animate);
}
animate();


// Resize handling
window.addEventListener('resize', ()=>{
camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
});


// Basic on-screen info
console.log('Three.js airplane demo ready. Controls: W/S/A/D, F fold wings, R reset.');
