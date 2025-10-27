import './style.css'; 
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// 1. ================= CÀI ĐẶT CƠ BẢN =================
// Scene
const scene = new THREE.Scene();
// --- THÊM BACKGROUND TỪ URL ---
const loader = new THREE.TextureLoader();
loader.load(
  '../public/nine_eleven.jpg', // <-- THAY BẰNG URL HÌNH ẢNH CỦA BẠN
  (texture) => {
    // Dòng này rất quan trọng để ảnh 360 bọc xung quanh cảnh
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // Đặt ảnh đã tải làm background
    scene.background = texture;

    // (Tùy chọn) Đặt ảnh này làm môi trường phản chiếu
    // Điều này sẽ làm cho các vật liệu (như thân máy bay) phản chiếu lại bầu trời, trông chân thực hơn.
    scene.environment = texture;
  },
  undefined, // (không cần hàm onProgress)
  (err) => {
    // Xử lý nếu không tải được ảnh
    console.error('Không thể tải ảnh nền:', err);
    // Nếu lỗi, quay lại màu nền xanh da trời
    scene.background = new THREE.Color(0xbfe6ff);
  }
);

// Camera
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10); // Đặt camera ở vị trí dễ quan sát

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // --- BẬT BÓNG ĐỔ ---
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Tạo bóng mềm (mịn) hơn
document.body.appendChild(renderer.domElement); // Thêm renderer vào body

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0); // Nhìn vào điểm cao hơn gốc 1 chút
controls.enableDamping = true; // Hiệu ứng trễ khi di chuyển
controls.update();
// Khi camera được khóa để theo máy bay, tắt tương tác của OrbitControls
// (chỉnh thành `true` nếu bạn vẫn muốn cho phép tương tác)
controls.enabled = true; // set true by default; will be disabled when follow mode is active

// Ánh sáng
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
// --- CẤU HÌNH BÓNG ---
dirLight.castShadow = true; // Ra lệnh cho đèn này tạo bóng

// Cấu hình "camera" của bóng (vùng tạo bóng)
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
// (Bạn có thể cần chỉnh các giá trị này nếu máy bay bay quá cao/xa)

scene.add(dirLight);

// -------------------- Ground (kết cấu canvas lặp vô hạn) --------------------
// Create a simple canvas-based repeating texture to simulate ground (grass/earth feel)
const groundCanvas = document.createElement('canvas');
groundCanvas.width = 512;
groundCanvas.height = 512;
const gctx = groundCanvas.getContext('2d');
// Draw a simple checker / grass-like pattern
gctx.fillStyle = '#4b8b3b';
gctx.fillRect(0, 0, 512, 512);
gctx.fillStyle = '#3e7a33';
for (let y = 0; y < 512; y += 64) {
  for (let x = 0; x < 512; x += 64) {
    if (((x + y) / 64) % 2 === 0) gctx.fillRect(x, y, 64, 64);
  }
}
const groundTexture = new THREE.CanvasTexture(groundCanvas);
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(200, 200); 

const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 });
const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // sit on grid
ground.receiveShadow = true;
scene.add(ground);

// --- TẠO SÔNG PHẢN CHIẾU ---

// 1. Hình dạng của sông: Một mặt phẳng (Plane)
// Dài 1000 (dọc trục X) và rộng 50 (dọc trục Z)
const riverGeometry = new THREE.PlaneGeometry(1000, 50);

// 2. Tạo đối tượng Reflector (Tấm gương)
const river = new Reflector(riverGeometry, {
  clipBias: 0.003, // Dùng để tránh lỗi tự phản chiếu
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  color: 0x334455, // Màu sẫm cho nước
  // (Bạn cũng có thể thêm 'recursion: 1' nếu muốn sông phản chiếu cả cái bóng)
});

// 3. Đặt vị trí cho sông
// Xoay nó nằm phẳng, giống như mặt đất
river.rotation.x = -Math.PI / 2;
// Đặt nó thấp hơn mặt đất một chút (0.0) để tránh bị "z-fighting" (nhấp nháy)
river.position.y = 0.1;
// (Tùy chọn) Bạn có thể dịch chuyển nó dọc trục Z nếu muốn
// river.position.z = 20; 

scene.add(river);

// 2. ================= TẠO MÁY BAY =================
// Tạo một Group. Đây là "vật chứa" cho tất cả các bộ phận của máy bay.
// Mọi thao tác di chuyển, xoay máy bay sẽ được thực hiện trên group này.
const airplane = new THREE.Group();
scene.add(airplane); // Thêm group máy bay vào scene

// Đặt vị trí ban đầu của máy bay lên trên lưới
airplane.position.y = 1.5;
// Camera follow settings: when true the camera will stick to the airplane with this offset
let followCamera = true;
// Offset is in local airplane space: (x right, y up, z forward). We want camera behind and above the plane
const cameraOffset = new THREE.Vector3(0, 3, 8);
// If followCamera is active, disable orbit controls so user input doesn't fight the follow
if (followCamera) controls.enabled = false;

// --- Vật liệu (Materials) ---
// Chúng ta sẽ dùng các vật liệu đơn giản với màu khác nhau
const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
const wingMat = new THREE.MeshStandardMaterial({ color: 0x0077cc, roughness: 0.7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.7 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });

// --- A. Thân máy bay (Fuselage) ---
// Dùng hình trụ (CylinderGeometry).
// Cú pháp: (radiusTop, radiusBottom, height, radialSegments)
const fuselageGeo = new THREE.CylinderGeometry(0.5, 0.4, 6, 16);
const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
// Mặc định, hình trụ đứng theo trục Y. Ta xoay nó 90 độ (PI/2) quanh trục X
// để nó nằm dọc theo trục Z.
fuselage.rotation.x = Math.PI / 2;
airplane.add(fuselage); // Thêm thân vào group

// --- B. Mũi máy bay (Dùng cánh quạt - Propeller) ---
// Tạo một GROUP mới chỉ để chứa cánh quạt.
// Điều này RẤT QUAN TRỌNG để nó có thể xoay độc lập với thân máy bay.
const propeller = new THREE.Group();

// Đặt vị trí của cả nhóm cánh quạt ra phía trước thân
// Thân máy bay kết thúc ở z = -3, ta đặt nó ra trước một chút
propeller.position.z = -3.1;
airplane.add(propeller); // Thêm nhóm cánh quạt vào máy bay

// Tạo hình dạng cho một cánh (một hình hộp dẹt)
// Cú pháp: (width, height, depth) -> (dài theo X, cao theo Y, dày theo Z)
const bladeGeo = new THREE.BoxGeometry(0.2, 2.5, 0.1); // Rộng 0.2, Sải cánh 2.5, Dày 0.1

// Tạo Cánh 1 (nằm dọc)
const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
propeller.add(blade1);

// Tạo Cánh 2 và 3 (nằm chéo)
const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
// Xoay cánh thứ 2 60 độ quanh trục Z (trục tiến tới) để cánh quạt thứ 2 nghiêng
blade2.rotation.z = Math.PI / 3;
propeller.add(blade2);

const blade3 = new THREE.Mesh(bladeGeo, bladeMat);
// Xoay cánh thứ 3 -60 độ quanh trục Z để tạo cánh quạt thứ 3 nghiêng ngược lại
blade3.rotation.z = -Math.PI / 3;
propeller.add(blade3);

//Thêm một chóp nhỏ ở giữa để trang trí
const spinnerGeo = new THREE.SphereGeometry(0.2, 8, 8); // Hình cầu bán kính 0.2
const spinner = new THREE.Mesh(spinnerGeo, tailMat); // Dùng màu đỏ của đuôi
propeller.add(spinner);

// --- C. Cánh chính (Main Wings) ---
// Dùng hình hộp (BoxGeometry) dẹt.
// Cú pháp: (width, height, depth) -> (dài theo X, cao theo Y, dày theo Z)
const wingGeo = new THREE.BoxGeometry(8, 0.15, 1.5); // Sải cánh 8, dày 0.15, rộng 1.5
const mainWings = new THREE.Mesh(wingGeo, wingMat);
// Cánh nằm ở ngay tâm, không cần xoay
// Có thể dịch chuyển 1 chút về phía sau nếu muốn:
// mainWings.position.z = 0.5;
airplane.add(mainWings);

// --- D. Cánh đuôi đứng (Vertical Stabilizer / Tail Fin) ---
// Dùng hình hộp.
const tailFinGeo = new THREE.BoxGeometry(0.15, 1, 0.8); // Dày 0.15, cao 1, rộng 0.8
const tailFin = new THREE.Mesh(tailFinGeo, tailMat);
// Dịch chuyển nó ra "phía sau" của thân
// Thân dài 6, đuôi ở z = 3. Ta đặt ở z = 2.6
// Và nâng nó lên trên 1 chút (trục Y)
tailFin.position.set(0, 0.7, 2.6);
airplane.add(tailFin);

// --- E. Cánh đuôi ngang (Horizontal Stabilizers) ---
// Dùng chung 1 hình hộp cho cả 2 bên
const hStabGeo = new THREE.BoxGeometry(3, 0.1, 0.8); // Sải cánh 3, dày 0.1, rộng 0.8
const hStab = new THREE.Mesh(hStabGeo, tailMat);
// Dịch chuyển ra sau, nhưng không nâng lên cao bằng cánh đứng
hStab.position.set(0, 0.1, 2.6);
airplane.add(hStab);

// --- CHO PHÉP MÁY BAY TẠO BÓNG ---
// Lặp qua tất cả các bộ phận (mesh) bên trong group máy bay và bật 'castShadow' cho chúng.
airplane.traverse(function (child) {
  if (child.isMesh) {
    child.castShadow = true;
  }
});

// 3. ================= TẠO CHUYỂN ĐỘNG CHO MÁY BAY =================
const keyState = {};

//Lắng nghe sư kiện nhấn phím
window.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});

//Lắng nghe sự kiện thả phím
window.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

//Hàm cập nhật chuyển động máy bay dựa trên phím nhấn
function updateAirplane() {
  const moveSpeed = 0.1; // Tốc độ di chuyển
  const rotateSpeed = 0.03; // Tốc độ quay

  // 1. DI CHUYỂN (Tới / Lùi) - Logic này đã đúng
  if (keyState['KeyW']) {
    // Di chuyển theo hướng 'đầu' máy bay (local -Z)
    airplane.translateZ(-moveSpeed);
  }
  if (keyState['KeyS']) {
    // Lùi lại
    airplane.translateZ(moveSpeed);
  }

  // 2. XOAY NGANG (YAW) - Dùng phím A, D
  // Xoay quanh trục Y local (trục nóc/bụng máy bay)
  if (keyState['KeyA']) {
    airplane.rotateY(rotateSpeed); // Dùng rotateY
  }
  if (keyState['KeyD']) {
    airplane.rotateY(-rotateSpeed); // Dùng rotateY
  }

  // 3. CHÚC/NGẨNG MŨI (PITCH) - Dùng Mũi tên Lên, Xuống
  // Xoay quanh trục X local (trục 2 bên cánh)
  if (keyState['ArrowDown']) { // Mũi tên xuống -> Ngẩng mũi
    airplane.rotateX(rotateSpeed); // Dùng rotateX
  }
  if (keyState['ArrowUp']) { // Mũi tên lên -> Chúc mũi
    airplane.rotateX(-rotateSpeed); // Dùng rotateX
  }
  
  // 4. NGHIÊNG (ROLL) - Dùng Mũi tên Trái, Phải
  // Xoay quanh trục Z local (trục mũi/đuôi máy bay)
  if (keyState['ArrowLeft']) {
    airplane.rotateZ(rotateSpeed); // Dùng rotateZ
  }
  if (keyState['ArrowRight']) {
    airplane.rotateZ(-rotateSpeed); // Dùng rotateZ
  }
}

// Ở trong vòng lặp animate, gọi hàm updateAirplane để cập nhật chuyển động
// (Hàm này sẽ được gọi bên trong hàm animate ở bước tiếp theo)

// 4. ================= VÒNG LẶP HOẠT CẢNH =================
function animate() {
  requestAnimationFrame(animate);

  // Xoay cánh quạt
  propeller.rotation.z += 0.1; // Tăng tốc độ quay 1 chút cho đẹp

  // Cập nhật vị trí máy bay
  updateAirplane(); 

  // --- SỬA LỖI CAMERA Ở ĐÂY ---

  // KIỂM TRA: Nếu đang ở chế độ follow...
  if (typeof followCamera !== 'undefined' && followCamera) {
    
    // 1. Tính toán vị trí camera
    // Chuyển đổi offset (không gian local) sang không gian thế giới (world space)
    const worldOffset = cameraOffset.clone().applyQuaternion(airplane.quaternion);
    
    // Đặt vị trí camera = vị trí máy bay + offset đã chuyển đổi
    camera.position.copy(airplane.position).add(worldOffset);
    
    // 2. Ra lệnh camera nhìn vào máy bay
    camera.lookAt(airplane.position);

  } else {
    // NẾU KHÔNG: (tức là followCamera = false)
    // Hãy để OrbitControls làm việc
    controls.update();
  }
  
  // --- KẾT THÚC SỬA LỖI ---

  // Luôn luôn render cảnh
  renderer.render(scene, camera);
}

// 5. ================= XỬ LÝ RESIZE =================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bắt đầu chạy!
animate();