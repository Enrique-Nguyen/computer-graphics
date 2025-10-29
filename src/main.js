//　このファイルは、Three.jsを使用して3Dシーンを作成およびレンダリングするためのJavaScriptコードを含んでいます。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// ================= CÀI ĐẶT CƠ BẢN =================
// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe6ff);
const loader = new THREE.TextureLoader();

// Camera
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 10); // Đặt camera ở vị trí dễ quan sát

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// --- BẬT BÓNG ĐỔ ---
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Tạo bóng mềm mịn hơn
document.body.appendChild(renderer.domElement); // Thêm renderer vào body

// Controls
// Đoạn này là thiét lập ban đầu cho phép người dùng xoay, zoom camera bằng chuột, khi chưa có chế độ theo dõi máy bay
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0); 
controls.enableDamping = true; // Hiệu ứng trễ khi di chuyển
controls.update();
// Khi camera được khóa để theo máy bay, tắt tương tác của OrbitControls
controls.enabled = true; // Mặc định là true; sẽ bị tắt khi chế độ theo dõi hoạt động

// Ánh sáng
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);

// --- CẤU HÌNH BÓNG ---
dirLight.castShadow = true; // Đèn này tạo bóng

// Cấu hình "camera" của bóng (vùng tạo bóng)
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;

scene.add(dirLight);

// -------------------- MẶT ĐẤT (Sử dụng ảnh lặp vô hạn) --------------------
// Tải ảnh texture
const groundTexture = loader.load('../public/mat_dat.jpg');
// Cho texture lặp lại thay vì kéo giãn
groundTexture.wrapS = THREE.RepeatWrapping; 
groundTexture.wrapT = THREE.RepeatWrapping; 
// Lặp 200 lần theo cả 2 chiều để ảnh nhỏ phủ kín mặt phẳng lớn 1000x1000
groundTexture.repeat.set(200, 200);
const groundMat = new THREE.MeshStandardMaterial({
  map: groundTexture,
  roughness: 1.0, // Giữ độ nhám để không bị bóng loáng
});

// Tạo hình dạng
const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const ground = new THREE.Mesh(groundGeo, groundMat);

// Đặt vị trí và nhận bóng 
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true; 
scene.add(ground);

// --- TẠO SÔNG PHẢN CHIẾU ---

// Hình dạng của sông: Một mặt phẳng (Plane)
const riverGeometry = new THREE.PlaneGeometry(1000, 50);

// 2. Tạo đối tượng Reflector (Tấm gương)
const river = new Reflector(riverGeometry, {
  clipBias: 0.003, // Dùng để tránh lỗi tự phản chiếu
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  color: 0x99aacc, // Màu xanh nhạt cho nước
});

// Xoay sông nằm phẳng trên mặt đất
river.rotation.x = -Math.PI / 2;
// Đặt cao hơn mặt đất một chút để tránh bị nhấp nháy
river.position.y = 0.1;

scene.add(river);

// ================= TẠO MÁY BAY =================
// Tạo một Group. Đây là "vật chứa" cho tất cả các bộ phận của máy bay.
// Mọi thao tác di chuyển, xoay máy bay sẽ được thực hiện trên group này.
const airplane = new THREE.Group();
scene.add(airplane);

airplane.position.y = 1.5;
// Cài đặt camera follow: khi true camera sẽ dính vào máy bay với offset này
const followCamera = true;
// Offset là trong không gian máy bay: (x phải, y lên, z về phía trước). Chúng ta muốn camera ở phía sau và trên máy bay
const cameraOffset = new THREE.Vector3(0, 3, 10);
// Nếu followCamera đang hoạt động, tắt orbit controls để người dùng không thể điều khiển camera
if (followCamera) controls.enabled = false;

// --- Vật liệu (Materials) ---
// Dùng các vật liệu đơn giản với màu khác nhau
const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
const wingMat = new THREE.MeshStandardMaterial({ color: 0x0077cc, roughness: 0.7 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.7 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });

// --- A. Thân máy bay (Fuselage) ---
// Dùng hình trụ.
const fuselageGeo = new THREE.CylinderGeometry(0.5, 0.4, 6, 16);
const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
// Mặc định, hình trụ đứng nên phải xoay nó nằm ngang
fuselage.rotation.x = Math.PI / 2;
airplane.add(fuselage); // Thêm thân vào group

// --- B. Mũi máy bay (Dùng cánh quạt - Propeller) ---
// Tạo một GROUP mới chỉ để chứa cánh quạt, vì mũi máy bay có nhiều cánh quạt xoay độc lập với máy bay
const propeller = new THREE.Group();

// Đặt vị trí của cả nhóm cánh quạt ra phía trước thân
propeller.position.z = -3.1;
airplane.add(propeller);

// Tạo hình dạng cho một cánh (một hình hộp dẹt)
const bladeGeo = new THREE.BoxGeometry(0.2, 2.5, 0.1);

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
const spinnerGeo = new THREE.SphereGeometry(0.2, 8, 8);
const spinner = new THREE.Mesh(spinnerGeo, tailMat);
propeller.add(spinner);

// --- C. Cánh chính (Main Wings) ---
// Dùng hình hộp (BoxGeometry) dẹt.
const wingGeo = new THREE.BoxGeometry(8, 0.15, 1.5); // Sải cánh 8, dày 0.15, rộng 1.5
const mainWings = new THREE.Mesh(wingGeo, wingMat);
airplane.add(mainWings);

// --- D. Cánh đuôi đứng (Vertical Stabilizer / Tail Fin) ---
// Dùng hình hộp.
const tailFinGeo = new THREE.BoxGeometry(0.15, 1, 0.8);
const tailFin = new THREE.Mesh(tailFinGeo, tailMat);
// Dịch chuyển nó ra "phía sau" của thân máy bay và nâng lên cao
tailFin.position.set(0, 0.7, 2.6);
airplane.add(tailFin);

// --- E. Cánh đuôi ngang (Horizontal Stabilizers) ---
// Dùng chung 1 hình hộp cho cả 2 bên
const hStabGeo = new THREE.BoxGeometry(3, 0.1, 0.8);
const hStab = new THREE.Mesh(hStabGeo, tailMat);
// Dịch chuyển ra sau
hStab.position.set(0, 0.1, 2.6);
airplane.add(hStab);

// --- CHO PHÉP MÁY BAY TẠO BÓNG ---
// Lặp qua tất cả các bộ phận (mesh) bên trong group máy bay và bật 'castShadow' cho chúng.
airplane.traverse(function (child) {
  if (child.isMesh) {
    child.castShadow = true;
  }
});

// --- Tạo tòa nhà ---
const buildings = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
const buildingGeo = new THREE.BoxGeometry(12, 80, 12);
const building1 = new THREE.Mesh(buildingGeo, buildings);
const building2 = new THREE.Mesh(buildingGeo, buildings);
building1.position.set(-50, 0, -50);
building2.position.set(-70, 0, -50);
scene.add(building1);
scene.add(building2);

// --- TẠO CỬA SỔ PHẢN CHIẾU CHO TÒA NHÀ ---

// Tạo hình dạng và vật liệu chung cho tất cả cửa sổ
const windowGeometry = new THREE.PlaneGeometry(2.5, 4); // Cửa sổ hình chữ nhật 2.5x4
const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x99aacc,    
    metalness: 0.5,     
    roughness: 0.1,     
});


// Hàm để thêm cửa sổ vào một tòa nhà
function addWindowsToBuilding(buildingMesh) {
    const buildingSize = buildingMesh.geometry.parameters;
    const width = buildingSize.width;   // 12
    const height = buildingSize.height; // 80
    const depth = buildingSize.depth;   // 12
    
    // Offset nhỏ để tránh cửa sổ bị "nhấp nháy" khi nằm đè lên tường
    const surfaceOffset = 0.01; 

    // Lặp từ trên xuống dưới để tạo các tầng cửa sổ
    // Bắt đầu gần đỉnh (height / 2), kết thúc gần đáy (-height / 2), mỗi tầng cách nhau 5 đơn vị
    for (let y = height / 2 - 5; y > -height / 2; y -= 6) {

        // Lặp ngang để tạo cửa sổ trên mỗi tầng
        // Bắt đầu từ rìa bên này, kết thúc ở rìa bên kia, mỗi cửa sổ cách nhau 4 đơn vị
        for (let x = -width / 2 + 2; x < width / 2; x += 4) {
            
            // --- Thêm cửa sổ cho mặt trước (+Z) và mặt sau (-Z) ---
            const windowZ = new THREE.Mesh(windowGeometry, windowMaterial);
            windowZ.position.set(x, y, depth / 2 + surfaceOffset); // Mặt trước
            buildingMesh.add(windowZ); // Thêm cửa sổ vào TÒA NHÀ, không phải vào SCENE

            const windowZ_back = new THREE.Mesh(windowGeometry, windowMaterial);
            windowZ_back.position.set(x, y, -depth / 2 - surfaceOffset); // Mặt sau
            buildingMesh.add(windowZ_back);
        }

        // Tương tự, lặp cho 2 mặt bên (+X) và (-X)
        for (let z = -depth / 2 + 2; z < depth / 2; z += 4) {

            const windowX = new THREE.Mesh(windowGeometry, windowMaterial);
            windowX.position.set(width / 2 + surfaceOffset, y, z); // Mặt bên phải
            windowX.rotation.y = Math.PI / 2;
            buildingMesh.add(windowX);

            const windowX_back = new THREE.Mesh(windowGeometry, windowMaterial);
            windowX_back.position.set(-width / 2 - surfaceOffset, y, z); // Mặt bên trái
            windowX_back.rotation.y = Math.PI / 2;
            buildingMesh.add(windowX_back);
        }
    }
}

// Gọi hàm để áp dụng cửa sổ cho cả hai tòa nhà
addWindowsToBuilding(building1);
addWindowsToBuilding(building2);


// ================= TẠO CHUYỂN ĐỘNG CHO MÁY BAY =================
const keyState = {}; // Đối tượng lưu trạng thái phím nhấn
let areWingsRetracted = false; // Trạng thái: false = cánh đang xòe, true = cánh đang cụp
let spaceKeyWasDown = false;   // Biến để chống lặp phím (phát hiện 1 lần nhấn)

window.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});

window.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

//Hàm cập nhật chuyển động máy bay dựa trên phím nhấn
let moveSpeed = 0.3; // Tốc độ di chuyển, có thể thay đổi khi thu cánh vào
const rotateSpeed = 0.03; // Tốc độ quay
function updateAirplane() {
  // 1. DI CHUYỂN (Tới / Lùi) - Dùng phím W, S
  if (keyState['KeyW']) {
    // Di chuyển theo hướng 'đầu' máy bay (local -Z)
    airplane.translateZ(-moveSpeed);
  }
  if (keyState['KeyS']) {
    airplane.translateZ(moveSpeed);
  }

  // XOAY NGANG (YAW) - Dùng phím A, D
  // Xoay quanh trục Y local (trục nóc/bụng máy bay)
  if (keyState['KeyA']) {
    airplane.rotateY(rotateSpeed); // Dùng rotateY
  }
  if (keyState['KeyD']) {
    airplane.rotateY(-rotateSpeed);
  }

  // 3. CHÚC/NGẨNG MŨI (PITCH) - Dùng Mũi tên Lên, Xuống
  // Xoay quanh trục X local (trục 2 bên cánh)
  if (keyState['ArrowDown']) { // Mũi tên xuống -> Ngẩng mũi
    airplane.rotateX(rotateSpeed); // Dùng rotateX
  }
  if (keyState['ArrowUp']) { // Mũi tên lên -> Chúc mũi
    airplane.rotateX(-rotateSpeed);
  }
  
  // 4. NGHIÊNG (ROLL) - Dùng Mũi tên Trái, Phải
  // Xoay quanh trục Z local (trục mũi/đuôi máy bay)
  if (keyState['ArrowLeft']) {
    airplane.rotateZ(rotateSpeed); // Dùng rotateZ
  }
  if (keyState['ArrowRight']) {
    airplane.rotateZ(-rotateSpeed);
  }
}

// 4. ================= VÒNG LẶP HOẠT CẢNH =================
function animate() {
  requestAnimationFrame(animate);

  // Xoay cánh quạt
  propeller.rotation.z += 0.15;

  // Cập nhật vị trí máy bay
  updateAirplane(); 

  // -CODE THU GỌN CÁNH MÁY BAY-
  // Kiểm tra phím Space (chỉ kích hoạt 1 lần mỗi lần nhấn)
  if (keyState['Space']) {
    if (!spaceKeyWasDown) {
      // Đây là frame đầu tiên phím được nhấn
      areWingsRetracted = !areWingsRetracted; // Đảo ngược trạng thái (đang xòe -> cụp và ngược lại)
      areWingsRetracted ? moveSpeed = 0.1 : moveSpeed = 0.3; // Thay đổi tốc độ di chuyển dựa trên trạng thái cánh
    }
    spaceKeyWasDown = true; // Đánh dấu là phím đang được giữ
  } else {
    spaceKeyWasDown = false; // Reset khi phím được thả ra
  }

  // Xác định tỉ lệ (scale) mục tiêu
  // Nếu 'areWingsRetracted' là true -> mục tiêu là thu cánh về còn một nửa, ngược lại là xòe cánh ra
  const targetScaleX = areWingsRetracted ? 0.5 : 1.0;

  // Di chuyển mượt mà scale.x hiện tại về mục tiêu
  mainWings.scale.x = THREE.MathUtils.lerp(
    mainWings.scale.x, // Giá trị hiện tại
    targetScaleX,      // Giá trị mục tiêu
    0.05               // Tốc độ thu/giang cánh
  );
  
  // Chỉnh lại đèn chiếu sáng cho máy bay để tạo bóng chính xác
  // Đặt vị trí của đèn (dirLight) để nó luôn ở gần máy bay
  const lightHeight = 20; // Đèn luôn cao hơn máy bay 20 đơn vị
  dirLight.position.x = airplane.position.x + 5;
  dirLight.position.y = airplane.position.y + lightHeight;
  dirLight.position.z = airplane.position.z + 5;

  // Ra lệnh cho đèn luôn "nhìn" (target) vào vị trí của máy bay
  dirLight.target.position.copy(airplane.position);
  
  // Cập nhật target mỗi khi di chuyển nó
  dirLight.target.updateMatrixWorld(); 

  // KIỂM TRA: Nếu đang ở chế độ follow...
  // Ở đây dự định dùng phím Y để thay đổi chế độ camera là theo dõi hay tự do, nhưng chưa kịp làm T.T
  if (typeof followCamera !== 'undefined' && followCamera) {
    
    // Chuyển đổi offset (không gian local) sang không gian thế giới (world space)
    const worldOffset = cameraOffset.clone().applyQuaternion(airplane.quaternion);
    
    // Đặt vị trí camera = vị trí máy bay + offset đã chuyển đổi
    camera.position.copy(airplane.position).add(worldOffset);
    
    // Để camera nhìn vào máy bay
    camera.lookAt(airplane.position);

  } else {
    // NẾU KHÔNG: (tức là followCamera = false)
    // Dùng để OrbitControls làm việc, tức là camera do người dùng điều khiển
    controls.update();
  }
  // Luôn luôn render cảnh
  renderer.render(scene, camera);
}

// ================= XỬ LÝ RESIZE trình duyệt =================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bắt đầu chạy chương trình
animate();

//　終わりだ！🚬　このプロジェクトが完了するために、できるだけ働いた。