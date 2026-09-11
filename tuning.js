// ============================================================================
// FORZA HORIZON UZ - 360° 3D DEALERSHIP SHOWROOM & TUNING GARAGE
// 40 ta mashinani 360 gradusga burib ko'rish, oldingi/keyingi almashtirish va tyuning
// ============================================================================

import { CARS_DATA, TUNING_PARTS } from "./carsData.js";

export class TuningManager {
  constructor(THREE, carBuilder, storage, soundManager) {
    this.THREE = THREE;
    this.carBuilder = carBuilder;
    this.storage = storage;
    this.soundManager = soundManager;

    // Avtosalon ko'rik holati
    this.currentCarIndex = 0;
    this.filteredCars = CARS_DATA;
    this.activeCategory = "all";

    this.dealershipScene = null;
    this.dealershipCamera = null;
    this.dealershipRenderer = null;
    this.dealershipCarGroup = null;

    // 360 Sichqoncha/Sensor bilan burish
    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    this.rotationY = 0;
    this.rotationX = 0.2;
    this.cameraDistance = 5.8;

    // Tyuning ko'rik holati
    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewCarGroup = null;
    this.isDoorsOpen = false;
  }

  // ==========================================================================
  // 1. 360° AVTOSALON 3D SHOWROOM
  // ==========================================================================
  initDealershipShowroom(canvasId) {
    const THREE = this.THREE;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.dealershipRenderer) {
      this.dealershipRenderer.dispose();
    }

    this.dealershipScene = new THREE.Scene();
    this.dealershipScene.background = new THREE.Color(0x0a0e17);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.dealershipCamera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.updateShowroomCameraPosition();

    this.dealershipRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.dealershipRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.dealershipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.dealershipRenderer.shadowMap.enabled = true;
    this.dealershipRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Hashamatli Studio Yoritgichlari
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.dealershipScene.add(ambient);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainKeyLight.position.set(8, 14, 10);
    mainKeyLight.castShadow = true;
    mainKeyLight.shadow.mapSize.width = 2048;
    mainKeyLight.shadow.mapSize.height = 2048;
    this.dealershipScene.add(mainKeyLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.9);
    fillLight.position.set(-8, 10, -8);
    this.dealershipScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff0077, 0.6);
    rimLight.position.set(0, 6, -10);
    this.dealershipScene.add(rimLight);

    // Yaltiroq Studio Pol (Reflective luxury showroom floor)
    const floorGeo = new THREE.CircleGeometry(16, 48);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x111622,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    this.dealershipScene.add(floor);

    // Podium Halqasi
    const ringGeo = new THREE.RingGeometry(5.2, 5.45, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.02;
    this.dealershipScene.add(ring);

    // Sichqoncha / Sensor orqali 360° burish nazorati
    this.bindShowroomControls(canvas);

    // Joriy mashinani yuklash
    this.showCarAtIndex(this.currentCarIndex);

    // Render animatsiyasi
    this.animateDealership();
  }

  bindShowroomControls(canvas) {
    const onStart = (clientX, clientY) => {
      this.isDragging = true;
      this.prevMouseX = clientX;
      this.prevMouseY = clientY;
    };

    const onMove = (clientX, clientY) => {
      if (!this.isDragging) return;
      const deltaX = clientX - this.prevMouseX;
      const deltaY = clientY - this.prevMouseY;

      this.rotationY += deltaX * 0.008;
      this.rotationX = Math.max(0.05, Math.min(Math.PI * 0.38, this.rotationX - deltaY * 0.006));

      this.prevMouseX = clientX;
      this.prevMouseY = clientY;
      this.updateShowroomCameraPosition();
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    canvas.onmousedown = (e) => onStart(e.clientX, e.clientY);
    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", onEnd);

    canvas.ontouchstart = (e) => {
      if (e.touches.length > 0) onStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    });
    window.addEventListener("touchend", onEnd);

    // Sichqoncha g'ildiragi orqali zoom
    canvas.onwheel = (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(3.8, Math.min(9.5, this.cameraDistance + e.deltaY * 0.005));
      this.updateShowroomCameraPosition();
    };
  }

  updateShowroomCameraPosition() {
    if (!this.dealershipCamera) return;
    const x = Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.cameraDistance;
    const y = Math.sin(this.rotationX) * this.cameraDistance + 0.6;
    const z = Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.cameraDistance;

    this.dealershipCamera.position.set(x, y, z);
    this.dealershipCamera.lookAt(0, 0.7, 0);
  }

  animateDealership() {
    requestAnimationFrame(() => this.animateDealership());

    // Foydalanuvchi ushlab turmasa asta-sekin aylanadi
    if (!this.isDragging && this.dealershipCarGroup) {
      this.rotationY += 0.004;
      this.updateShowroomCameraPosition();
    }

    if (this.dealershipRenderer && this.dealershipScene && this.dealershipCamera) {
      this.dealershipRenderer.render(this.dealershipScene, this.dealershipCamera);
    }
  }

  showCarAtIndex(index) {
    if (this.filteredCars.length === 0) return;
    if (index < 0) index = this.filteredCars.length - 1;
    if (index >= this.filteredCars.length) index = 0;

    this.currentCarIndex = index;
    const carData = this.filteredCars[this.currentCarIndex];
    const tuning = this.storage.getCarTuning(carData.id);

    if (this.dealershipCarGroup) {
      this.dealershipScene.remove(this.dealershipCarGroup);
    }

    this.dealershipCarGroup = this.carBuilder.buildCar(carData, tuning);
    this.dealershipCarGroup.position.set(0, 0, 0);
    this.dealershipScene.add(this.dealershipCarGroup);

    this.updateDealershipHUD(carData);
  }

  nextCar() {
    this.showCarAtIndex(this.currentCarIndex + 1);
    this.soundManager.playStarterCrank();
  }

  prevCar() {
    this.showCarAtIndex(this.currentCarIndex - 1);
    this.soundManager.playStarterCrank();
  }

  filterCategory(cat) {
    this.activeCategory = cat;
    if (cat === "all") {
      this.filteredCars = CARS_DATA;
    } else {
      this.filteredCars = CARS_DATA.filter(c => c.category === cat);
    }
    this.currentCarIndex = 0;
    this.showCarAtIndex(0);
  }

  updateDealershipHUD(carData) {
    const isOwned = this.storage.isCarOwned(carData.id);
    const isActive = this.storage.getActiveCarId() === carData.id;

    // Nom va brend
    document.getElementById("deal-car-name").textContent = carData.name;
    document.getElementById("deal-car-brand").textContent = carData.brand;
    document.getElementById("deal-car-badge").textContent = `${carData.tier} • (${this.currentCarIndex + 1}/${this.filteredCars.length})`;
    document.getElementById("deal-car-desc").textContent = carData.desc;

    // Texnik parametrlar
    document.getElementById("deal-spec-speed").textContent = `${carData.topSpeed} KM/H`;
    document.getElementById("deal-spec-accel").textContent = `${carData.accel} S`;
    document.getElementById("deal-spec-hp").textContent = `${carData.hp} HP`;
    document.getElementById("deal-spec-weight").textContent = `${carData.weight} KG`;
    document.getElementById("deal-spec-drive").textContent = carData.drive;

    // Narx va Harakat tugmasi
    const priceEl = document.getElementById("deal-car-price");
    const actionBtn = document.getElementById("deal-action-btn");

    if (isOwned) {
      priceEl.textContent = "GARANGIZDA MAVJUD";
      priceEl.style.color = "#22c55e";
      actionBtn.textContent = isActive ? "HAYDAMOQDASIZ (FAOL) ✓" : "USHBU MASHINANI TANLASH";
      actionBtn.className = `action-btn ${isActive ? "btn-selected" : "btn-buy"}`;
      actionBtn.onclick = () => {
        this.storage.setActiveCarId(carData.id);
        if (window.game) window.game.reloadPlayerCar();
        this.updateDealershipHUD(carData);
        if (window.game) window.game.showNotification(`${carData.name} tanlandi!`);
      };
    } else {
      priceEl.textContent = `$${carData.price.toLocaleString()}`;
      priceEl.style.color = "#22c55e";
      actionBtn.textContent = `SOTIB OLISH ($${carData.price.toLocaleString()})`;
      actionBtn.className = "action-btn btn-buy";
      actionBtn.onclick = () => {
        if (this.storage.buyCar(carData.id, carData.price)) {
          this.soundManager.playCoinSound();
          this.storage.setActiveCarId(carData.id);
          if (window.game) {
            window.game.reloadPlayerCar();
            window.game.updateProfileUI();
            window.game.showNotification(`${carData.name} muvaffaqiyatli sotib olindi! 🎉`);
          }
          this.updateDealershipHUD(carData);
        } else {
          if (window.game) window.game.showNotification("Mablag' yetarli emas!");
        }
      };
    }
  }

  // ==========================================================================
  // 2. TYUNING USTAXONASI
  // ==========================================================================
  initPreview(canvasId) {
    const THREE = this.THREE;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x0a0d14);

    this.previewCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.previewCamera.position.set(4.5, 2.2, 5.5);
    this.previewCamera.lookAt(0, 0.7, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.previewRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewRenderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.previewScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    this.previewScene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 32),
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.8 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    this.previewScene.add(floor);

    this.animatePreview();
  }

  animatePreview() {
    requestAnimationFrame(() => this.animatePreview());
    if (this.previewCarGroup) {
      this.previewCarGroup.rotation.y += 0.005;
    }
    if (this.previewRenderer && this.previewScene && this.previewCamera) {
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
  }

  loadCarInPreview(carId) {
    const carData = CARS_DATA.find(c => c.id === carId) || CARS_DATA[0];
    const tuning = this.storage.getCarTuning(carData.id);

    if (this.previewCarGroup) {
      this.previewScene.remove(this.previewCarGroup);
    }

    this.previewCarGroup = this.carBuilder.buildCar(carData, tuning);
    this.previewCarGroup.position.set(0, 0, 0);
    this.previewScene.add(this.previewCarGroup);
    this.isDoorsOpen = false;
  }

  togglePreviewDoors() {
    if (!this.previewCarGroup) return false;
    this.isDoorsOpen = this.carBuilder.toggleDoors(this.previewCarGroup);
    this.soundManager.playStarterCrank();
    return this.isDoorsOpen;
  }

  applyTuningOption(carId, type, value, price = 0) {
    const currentTuning = this.storage.getCarTuning(carId);
    if (price > 0) {
      if (!this.storage.spendMoney(price)) {
        return { success: false, reason: "Mablag' yetarli emas!" };
      }
      this.soundManager.playCoinSound();
    }

    currentTuning[type] = value;
    this.storage.saveCarTuning(carId, currentTuning);
    this.loadCarInPreview(carId);

    return { success: true, balance: this.storage.getMoney() };
  }

  getTuningParts() {
    return TUNING_PARTS;
  }
}
