// ============================================================================
// FORZA HORIZON UZ - MAIN GAME ENGINE (ENHANCED VERSION)
// Festival Asosiy Menyu, 360° Showroom, Rul Sezuvchanligi, Trassalar va 3D Navigatsiya
// ============================================================================

import { CARS_DATA } from "./carsData.js";
import { soundManager } from "./audio.js";
import { CarBuilder } from "./carBuilder.js";
import { CarPhysics } from "./physics.js";
import { CityMap } from "./cityMap.js";
import { TrafficManager } from "./traffic.js";
import { RaceMode } from "./raceMode.js";
import { ParkingMode } from "./parkingMode.js";
import { storage } from "./storage.js";
import { SettingsManager } from "./settings.js";
import { TuningManager } from "./tuning.js";

class Game {
  constructor() {
    this.THREE = window.THREE;
    if (!this.THREE) {
      console.error("Three.js kutubxonasi yuklanmadi!");
      return;
    }

    // Holatlar
    this.currentMode = "free_roam";
    this.isPaused = false;
    this.isInFestivalMenu = true; // O'yin boshlanganda festival menyusi ochiq
    this.festivalCameraAngle = 0;
    this.clock = new this.THREE.Clock();

    // 4 Kamera ko'rinishi (0: Chase, 1: Close, 2: Hood, 3: Cockpit)
    this.cameraMode = 0;
    this.cameraOffsets = [
      { x: 0, y: 3.2, z: -7.5, lookY: 1.4 },
      { x: 0, y: 2.2, z: -5.2, lookY: 1.2 },
      { x: 0, y: 1.5, z: 1.4, lookY: 1.1 },
      { x: -0.25, y: 1.2, z: 0.1, lookY: 1.05 }
    ];

    // Inputlar
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
      nitro: false
    };

    this.turnSignalMode = "off";
    this.turnSignalTimer = 0;
    this.turnSignalState = false;

    // Komponentlar
    this.carBuilder = new CarBuilder(this.THREE);
    this.soundManager = soundManager;
    this.storage = storage;

    this.initRenderer();
    this.settingsManager = new SettingsManager(this.storage, this.soundManager, this.renderer);
    this.settingsManager.applyGraphicsSettings(this.renderer, this.scene, this.camera);

    this.cityMap = new CityMap(this.THREE, this.scene);
    this.traffic = new TrafficManager(this.THREE, this.scene, this.cityMap);
    this.raceMode = new RaceMode(this.THREE, this.scene, this.soundManager);
    this.parkingMode = new ParkingMode(this.THREE, this.scene, this.soundManager, this.cityMap);
    this.tuningManager = new TuningManager(this.THREE, this.carBuilder, this.storage, this.soundManager);

    this.initWorld();
    this.initPlayerCar();
    this.initControls();
    this.initUI();

    this.animate();
  }

  initRenderer() {
    const THREE = this.THREE;
    this.container = document.getElementById("game-canvas-container");

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.0018);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 1400);
    this.camera.position.set(0, 5, -10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("game-canvas"),
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initWorld() {
    const THREE = this.THREE;

    // Quyosh va atrof yoritgichlari (Forza Horizon quyosh nurlari)
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.9);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1f2937, 0.85);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    this.sunLight.position.set(120, 180, 140);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 500;
    const shadowDist = 140;
    this.sunLight.shadow.camera.left = -shadowDist;
    this.sunLight.shadow.camera.right = shadowDist;
    this.sunLight.shadow.camera.top = shadowDist;
    this.sunLight.shadow.camera.bottom = -shadowDist;
    this.scene.add(this.sunLight);

    this.cityMap.build();
    this.traffic.init();
  }

  initPlayerCar() {
    const activeCarId = this.storage.getActiveCarId();
    const carData = CARS_DATA.find(c => c.id === activeCarId) || CARS_DATA[0];
    const tuning = this.storage.getCarTuning(carData.id);
    const sensitivity = this.storage.state.settings.steeringSensitivity || 0.45;

    if (this.playerCar) {
      this.scene.remove(this.playerCar);
    }

    this.playerCar = this.carBuilder.buildCar(carData, tuning);
    this.playerCar.position.set(0, 0.4, 0);
    this.scene.add(this.playerCar);

    this.playerPhysics = new CarPhysics(this.playerCar, carData, tuning, sensitivity);

    this.playerPhysics.onCollision = (obs, speedKmh) => {
      if (speedKmh > 15) {
        this.soundManager.playCrash();
      }
    };
  }

  reloadPlayerCar() {
    const prevPos = this.playerPhysics.position.clone();
    const prevRot = this.playerPhysics.rotation.y;
    const wasRunning = this.playerPhysics.isEngineRunning;

    this.initPlayerCar();

    this.playerPhysics.position.copy(prevPos);
    this.playerPhysics.rotation.y = prevRot;
    if (wasRunning) {
      this.playerPhysics.startEngine();
      this.soundManager.startEngine();
    }
  }

  initControls() {
    window.addEventListener("keydown", (e) => {
      this.soundManager.resumeContext();

      if (e.code === "KeyW" || e.code === "ArrowUp") this.input.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.input.backward = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.input.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.input.right = true;
      if (e.code === "Space") this.input.handbrake = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.input.nitro = true;

      if (e.code === "KeyE") this.toggleEngine();
      if (e.code === "KeyL") this.toggleHeadlights();
      if (e.code === "KeyQ") this.setTurnSignal(this.turnSignalMode === "left" ? "off" : "left");
      if (e.code === "KeyR") this.setTurnSignal(this.turnSignalMode === "right" ? "off" : "right");
      if (e.code === "KeyH") this.setTurnSignal(this.turnSignalMode === "hazard" ? "off" : "hazard");
      if (e.code === "KeyP") this.toggleWipers();
      if (e.code === "KeyF") this.soundManager.playHorn(true);
      if (e.code === "KeyC") this.cycleCamera();
      if (e.code === "KeyM") {
        const p = this.soundManager.toggleRadio();
        this.showNotification(p ? "Radio: Yoqildi 🎵" : "Radio: O'chirildi 🔇");
      }
      if (e.code === "Escape") this.toggleMainMenu();
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") this.input.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") this.input.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") this.input.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") this.input.right = false;
      if (e.code === "Space") this.input.handbrake = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.input.nitro = false;
      if (e.code === "KeyF") this.soundManager.playHorn(false);
    });
  }

  toggleEngine() {
    this.soundManager.resumeContext();
    if (this.playerPhysics.isEngineRunning) {
      this.playerPhysics.stopEngine();
      this.soundManager.stopEngine();
      this.showNotification("Dvigatel o'chirildi [STOP]");
    } else {
      this.playerPhysics.startEngine();
      this.soundManager.startEngine();
      this.showNotification("Dvigatel o't oldirildi [START] 🚀");
    }
    this.updateDashboardButtonsUI();
  }

  toggleHeadlights() {
    const on = this.playerPhysics.toggleHeadlights();
    this.showNotification(on ? "Fara chiroqlari: YOQILDI 💡" : "Fara chiroqlari: O'CHIRILDI");
    this.updateDashboardButtonsUI();
  }

  toggleWipers() {
    const on = this.playerPhysics.toggleWipers();
    if (on) this.soundManager.playWiperSound();
    this.showNotification(on ? "Oyna tozalagich: ISHLAMOQDA" : "Oyna tozalagich: TO'XTATILDI");
    this.updateDashboardButtonsUI();
  }

  setTurnSignal(mode) {
    this.turnSignalMode = mode;
    this.turnSignalTimer = 0;
    this.turnSignalState = false;
    this.applyTurnSignalVisuals();
    this.updateDashboardButtonsUI();
  }

  cycleCamera() {
    this.cameraMode = (this.cameraMode + 1) % this.cameraOffsets.length;
    const names = ["3-Shaxs (Orqadan)", "Yaqin Action", "Kapotdan Ko'rinish", "Salon / Interyer (Rul)"];
    this.showNotification(`Kamera: ${names[this.cameraMode]}`);
  }

  updateTurnSignals(delta) {
    if (this.turnSignalMode === "off") {
      this.applyTurnSignalVisuals();
      return;
    }

    this.turnSignalTimer += delta;
    if (this.turnSignalTimer >= 0.38) {
      this.turnSignalTimer = 0;
      this.turnSignalState = !this.turnSignalState;
      this.soundManager.playTurnSignalClick(this.turnSignalState);
      this.applyTurnSignalVisuals();
    }
  }

  applyTurnSignalVisuals() {
    const ud = this.playerCar.userData;
    if (!ud) return;

    const leftOn = this.turnSignalState && (this.turnSignalMode === "left" || this.turnSignalMode === "hazard");
    const rightOn = this.turnSignalState && (this.turnSignalMode === "right" || this.turnSignalMode === "hazard");

    if (ud.turnFrontLeft) ud.turnFrontLeft.material.emissiveIntensity = leftOn ? 2.5 : 0;
    if (ud.turnRearLeft) ud.turnRearLeft.material.emissiveIntensity = leftOn ? 2.5 : 0;
    if (ud.turnFrontRight) ud.turnFrontRight.material.emissiveIntensity = rightOn ? 2.5 : 0;
    if (ud.turnRearRight) ud.turnRearRight.material.emissiveIntensity = rightOn ? 2.5 : 0;
  }

  updateCamera(delta) {
    if (!this.playerCar) return;

    // Festival Asosiy Menyusida sekin aylanuvchi kamera
    if (this.isInFestivalMenu) {
      this.festivalCameraAngle += 0.005;
      const dist = 6.8;
      const cx = Math.sin(this.festivalCameraAngle) * dist;
      const cz = Math.cos(this.festivalCameraAngle) * dist;
      this.camera.position.set(cx, 2.2, cz);
      this.camera.lookAt(0, 0.8, 0);
      return;
    }

    const cfg = this.cameraOffsets[this.cameraMode];
    const carPos = this.playerPhysics.position;
    const carRot = this.playerPhysics.rotation.y;

    if (this.cameraMode === 3) {
      const eyeOffset = new this.THREE.Vector3(cfg.x, cfg.y, cfg.z);
      eyeOffset.applyAxisAngle(new this.THREE.Vector3(0, 1, 0), carRot);
      this.camera.position.copy(carPos).add(eyeOffset);

      const lookTarget = new this.THREE.Vector3(0, cfg.lookY, 15);
      lookTarget.applyAxisAngle(new this.THREE.Vector3(0, 1, 0), carRot);
      this.camera.lookAt(carPos.clone().add(lookTarget));
    } else {
      const targetOffset = new this.THREE.Vector3(cfg.x, cfg.y, cfg.z);
      targetOffset.applyAxisAngle(new this.THREE.Vector3(0, 1, 0), carRot);

      const targetCamPos = carPos.clone().add(targetOffset);
      const lerpSpeed = Math.min(1.0, 7.5 * delta);
      this.camera.position.lerp(targetCamPos, lerpSpeed);

      const lookTarget = carPos.clone().add(new this.THREE.Vector3(0, cfg.lookY, 0));
      this.camera.lookAt(lookTarget);
    }

    if (this.sunLight) {
      this.sunLight.position.set(carPos.x + 80, carPos.y + 120, carPos.z + 90);
      this.sunLight.target.position.copy(carPos);
      this.sunLight.target.updateMatrixWorld();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    if (!this.settingsManager.shouldRenderFrame(now)) return;

    const delta = this.clock.getDelta();
    const currentFps = this.settingsManager.updateFpsCounter();
    const fpsEl = document.getElementById("hud-fps");
    if (fpsEl) fpsEl.textContent = `${currentFps} FPS`;

    if (!this.isPaused && !this.isInFestivalMenu) {
      const allColliders = [...this.cityMap.colliders, ...(this.raceMode.trackBarriers || [])];
      this.playerPhysics.update(delta, this.input, allColliders);

      const rpmRatio = (this.playerPhysics.rpm - 800) / 7200;
      this.soundManager.updateEngine(rpmRatio, this.input.forward, this.playerPhysics.speedKmh);
      this.soundManager.updateTireDrift(this.playerPhysics.slipAngle);

      this.updateTurnSignals(delta);
      this.cityMap.update(delta);
      this.traffic.update(delta, this.playerPhysics.position);

      if (this.currentMode === "free_roam") {
        const nearGarage = this.cityMap.checkGarageTrigger(this.playerPhysics.position);
        const garagePrompt = document.getElementById("garage-prompt");
        if (nearGarage) {
          if (garagePrompt) garagePrompt.classList.add("active");
        } else {
          if (garagePrompt) garagePrompt.classList.remove("active");
        }
      }

      if (this.currentMode === "race") {
        this.raceMode.update(delta, this.playerPhysics, (res) => this.onRaceFinished(res));
        this.updateRaceHUD();
      }

      if (this.currentMode === "parking") {
        this.parkingMode.update(delta, this.playerPhysics, (res) => this.onParkingFinished(res));
        this.updateParkingHUD();
      }

      this.updateSpeedometerHUD();
      this.updateMinimap();
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }

  updateSpeedometerHUD() {
    const kmh = Math.round(this.playerPhysics.speedKmh);
    const speedDigital = document.getElementById("speed-digital");
    if (speedDigital) speedDigital.textContent = kmh;

    const gearEl = document.getElementById("gear-indicator");
    if (gearEl) {
      const g = this.playerPhysics.gear;
      gearEl.textContent = g === -1 ? "R" : (g === 0 ? "N" : g);
    }

    const needle = document.getElementById("speedo-needle");
    if (needle) {
      const maxSpeed = this.playerPhysics.maxSpeedKmh || 250;
      const angle = -130 + (Math.min(kmh, maxSpeed) / maxSpeed) * 260;
      needle.style.transform = `rotate(${angle}deg)`;
    }

    const nitroFill = document.getElementById("nitro-fill");
    if (nitroFill) {
      nitroFill.style.width = `${this.playerPhysics.nitroAmount}%`;
    }
  }

  updateMinimap() {
    const radar = document.getElementById("radar-canvas");
    if (!radar) return;
    const ctx = radar.getContext("2d");
    const W = radar.width;
    const H = radar.height;

    ctx.clearRect(0, 0, W, H);

    const pPos = this.playerPhysics.position;
    const pRot = this.playerPhysics.rotation.y;

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.rotate(-pRot);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    const scale = 0.35;

    this.cityMap.garages.forEach(g => {
      const gx = (g.position.x - pPos.x) * scale;
      const gz = -(g.position.z - pPos.z) * scale;
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.arc(gx, gz, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.currentMode === "race") {
      this.raceMode.checkpoints.forEach((cp, idx) => {
        const cx = (cp.x - pPos.x) * scale;
        const cz = -(cp.z - pPos.z) * scale;
        ctx.fillStyle = idx === this.raceMode.currentCheckpointIdx ? "#22c55e" : "#eab308";
        ctx.beginPath();
        ctx.arc(cx, cz, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (this.currentMode === "parking" && this.parkingMode.targetParkingSlot) {
      const ps = this.parkingMode.targetParkingSlot;
      const px = (ps.x - pPos.x) * scale;
      const pz = -(ps.z - pPos.z) * scale;
      ctx.fillStyle = "#10b981";
      ctx.fillRect(px - 5, pz - 8, 10, 16);
    }

    ctx.restore();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.5 - 7);
    ctx.lineTo(W * 0.5 - 5, H * 0.5 + 6);
    ctx.lineTo(W * 0.5 + 5, H * 0.5 + 6);
    ctx.closePath();
    ctx.fill();
  }

  updateRaceHUD() {
    const posEl = document.getElementById("hud-race-pos");
    if (posEl) posEl.textContent = `${this.raceMode.position}/${this.raceMode.totalRacers}`;

    const lapEl = document.getElementById("hud-race-lap");
    if (lapEl) lapEl.textContent = `${this.raceMode.lap}/${this.raceMode.totalLaps}`;

    const timeEl = document.getElementById("hud-race-time");
    if (timeEl) {
      const t = this.raceMode.raceTimer;
      const mins = Math.floor(t / 60);
      const secs = (t % 60).toFixed(1);
      timeEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
  }

  updateParkingHUD() {
    const lvlEl = document.getElementById("hud-parking-level");
    if (lvlEl) lvlEl.textContent = `#${this.parkingMode.currentLevel}`;

    const colEl = document.getElementById("hud-parking-collisions");
    if (colEl) colEl.textContent = `${this.parkingMode.collisionsCount}/${this.parkingMode.maxAllowedCollisions}`;

    const timeEl = document.getElementById("hud-parking-time");
    if (timeEl) {
      const t = this.parkingMode.parkTimer;
      const mins = Math.floor(t / 60);
      const secs = (t % 60).toFixed(1);
      timeEl.textContent = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
  }

  onRaceFinished(result) {
    if (result.success) {
      this.storage.addMoney(result.reward);
      this.storage.unlockRaceLevel(result.level + 1);
      this.showModal("result-modal", {
        title: "G'ALABA! POYGA YAKUNLANDI 🏆",
        text: `Siz ${result.position}-o'rinni egalladingiz!\nVaqt: ${result.time.toFixed(1)}s`,
        reward: `+ $${result.reward.toLocaleString()}`,
        nextLevel: result.level < 30 ? result.level + 1 : null,
        mode: "race"
      });
    } else {
      this.showModal("result-modal", {
        title: "MAG'LUBIYAT! ❌",
        text: result.reason,
        reward: "$0",
        nextLevel: null,
        mode: "race"
      });
    }
    this.updateProfileUI();
  }

  onParkingFinished(result) {
    if (result.success) {
      this.storage.addMoney(result.reward);
      this.storage.unlockParkingLevel(result.level + 1);
      this.showModal("result-modal", {
        title: result.isExam ? "TABRIKLAYMIZ! IMTIHON TOPSHIRILDI 🎓" : "PARKOVKA BAJARILDI! 🅿️",
        text: `To'siqlarga tegish: ${result.collisions} marta\nVaqt: ${result.time.toFixed(1)}s`,
        reward: `+ $${result.reward.toLocaleString()}`,
        nextLevel: result.level < 40 ? result.level + 1 : null,
        mode: "parking"
      });
    } else {
      this.showModal("result-modal", {
        title: "XATOLIK! ⚠️",
        text: result.reason,
        reward: "$0",
        nextLevel: null,
        mode: "parking"
      });
    }
    this.updateProfileUI();
  }

  initUI() {
    this.updateProfileUI();
    this.checkFirstLaunchUsername();
    this.bindHUDButtons();
    this.bindMenuButtons();
    this.bindFestivalButtons();
    this.settingsManager.translateDOM();
  }

  checkFirstLaunchUsername() {
    const existingName = this.storage.getUsername();
    if (!existingName) {
      const modal = document.getElementById("username-modal");
      if (modal) modal.classList.add("active");
    } else {
      const nameEl = document.getElementById("profile-username");
      if (nameEl) nameEl.textContent = existingName;
    }
  }

  updateProfileUI() {
    const nameEl = document.getElementById("profile-username");
    if (nameEl) nameEl.textContent = this.storage.getUsername() || "Poygachi";

    const moneyEl = document.getElementById("profile-money");
    if (moneyEl) moneyEl.textContent = `$${this.storage.getMoney().toLocaleString()}`;
  }

  bindFestivalButtons() {
    // 1. O'yinni boshlash -> Rejimlarni tanlash
    document.getElementById("fest-btn-play")?.addEventListener("click", () => {
      this.showModal("modes-select-modal");
    });

    // 2. Avtosalon 3D Showroom
    document.getElementById("fest-btn-dealership")?.addEventListener("click", () => {
      this.openDealershipModal();
    });

    // 3. Garaj va Tyuning
    document.getElementById("fest-btn-garage")?.addEventListener("click", () => {
      this.openGarageModal();
    });

    // 4. Sozlamalar
    document.getElementById("fest-btn-settings")?.addEventListener("click", () => {
      this.openSettingsModal();
    });
  }

  bindHUDButtons() {
    document.getElementById("btn-engine")?.addEventListener("click", () => this.toggleEngine());
    document.getElementById("btn-lights")?.addEventListener("click", () => this.toggleHeadlights());
    document.getElementById("btn-turn-left")?.addEventListener("click", () => {
      this.setTurnSignal(this.turnSignalMode === "left" ? "off" : "left");
    });
    document.getElementById("btn-turn-right")?.addEventListener("click", () => {
      this.setTurnSignal(this.turnSignalMode === "right" ? "off" : "right");
    });
    document.getElementById("btn-hazard")?.addEventListener("click", () => {
      this.setTurnSignal(this.turnSignalMode === "hazard" ? "off" : "hazard");
    });
    document.getElementById("btn-wipers")?.addEventListener("click", () => this.toggleWipers());

    const btnHorn = document.getElementById("btn-horn");
    if (btnHorn) {
      btnHorn.onmousedown = () => this.soundManager.playHorn(true);
      btnHorn.onmouseup = () => this.soundManager.playHorn(false);
      btnHorn.ontouchstart = () => this.soundManager.playHorn(true);
      btnHorn.ontouchend = () => this.soundManager.playHorn(false);
    }

    document.getElementById("btn-cam")?.addEventListener("click", () => this.cycleCamera());
    document.getElementById("btn-open-menu")?.addEventListener("click", () => this.toggleMainMenu());
  }

  updateDashboardButtonsUI() {
    const btnEngine = document.getElementById("btn-engine");
    if (btnEngine) {
      btnEngine.classList.toggle("active-green", this.playerPhysics.isEngineRunning);
    }
    const btnLights = document.getElementById("btn-lights");
    if (btnLights) {
      btnLights.classList.toggle("active-cyan", this.playerCar.userData.headlightsOn);
    }

    document.getElementById("btn-turn-left")?.classList.toggle("active-amber", this.turnSignalMode === "left");
    document.getElementById("btn-turn-right")?.classList.toggle("active-amber", this.turnSignalMode === "right");
    document.getElementById("btn-hazard")?.classList.toggle("active-red", this.turnSignalMode === "hazard");
  }

  bindMenuButtons() {
    // Username Saqlash
    document.getElementById("btn-save-username")?.addEventListener("click", () => {
      const inp = document.getElementById("username-input");
      const val = (inp ? inp.value : "").trim();
      if (val) {
        this.storage.setUsername(val);
        this.updateProfileUI();
        document.getElementById("username-modal").classList.remove("active");
        this.soundManager.playStarterCrank();
      }
    });

    // Rejimlarni boshlash
    document.getElementById("menu-btn-free")?.addEventListener("click", () => {
      this.startActualGameplay("free_roam");
    });
    document.getElementById("menu-btn-race")?.addEventListener("click", () => {
      this.openRaceLevelSelect();
    });
    document.getElementById("menu-btn-parking")?.addEventListener("click", () => {
      this.openParkingLevelSelect();
    });

    // Pauza menyusi tugmalari
    document.getElementById("pause-btn-resume")?.addEventListener("click", () => {
      this.closeAllModals();
    });
    document.getElementById("pause-btn-modes")?.addEventListener("click", () => {
      this.showModal("modes-select-modal");
    });
    document.getElementById("pause-btn-dealership")?.addEventListener("click", () => {
      this.openDealershipModal();
    });
    document.getElementById("pause-btn-garage")?.addEventListener("click", () => {
      this.openGarageModal();
    });
    document.getElementById("pause-btn-settings")?.addEventListener("click", () => {
      this.openSettingsModal();
    });

    // Close buttons
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
      btn.onclick = () => this.closeAllModals();
    });

    document.getElementById("btn-enter-garage")?.addEventListener("click", () => {
      this.openGarageModal();
    });
  }

  startActualGameplay(mode, level = 1) {
    this.isInFestivalMenu = false;
    document.getElementById("festival-start-screen")?.classList.remove("active");
    this.closeAllModals();
    this.switchMode(mode, level);

    if (!this.playerPhysics.isEngineRunning) {
      this.toggleEngine();
    }
  }

  switchMode(newMode, level = 1) {
    this.currentMode = newMode;

    const raceHUD = document.getElementById("hud-race-panel");
    const parkingHUD = document.getElementById("hud-parking-panel");
    if (raceHUD) raceHUD.style.display = newMode === "race" ? "flex" : "none";
    if (parkingHUD) parkingHUD.style.display = newMode === "parking" ? "flex" : "none";

    if (newMode === "free_roam") {
      this.raceMode.cleanup();
      this.parkingMode.cleanup();
      this.playerPhysics.position.set(0, 0.4, 0);
      this.playerPhysics.rotation.y = 0;
      this.playerPhysics.speed = 0;
      this.showNotification("Erkin Shahar Rejimi Faol 🏙️");
    } else if (newMode === "race") {
      this.parkingMode.cleanup();
      this.raceMode.startLevel(level, this.playerPhysics);
      this.showNotification(`Poyga #${level} Boshlandi! 🏁`);
    } else if (newMode === "parking") {
      this.raceMode.cleanup();
      this.parkingMode.startLevel(level, this.playerPhysics);
      this.showNotification(level % 10 === 0 ? `QOIDALAR IMTIHONI #${level} 🚦` : `Parkovka #${level} 🅿️`);
    }
  }

  openRaceLevelSelect() {
    const list = document.getElementById("race-levels-grid");
    if (!list) return;
    list.innerHTML = "";

    const unlocked = this.storage.state.unlockedRaceLevel || 1;
    this.raceMode.levelsConfig.forEach(lvl => {
      const isUnlocked = lvl.level <= unlocked;
      const card = document.createElement("div");
      card.className = `level-card ${isUnlocked ? "unlocked" : "locked"}`;
      card.innerHTML = `
        <div class="lvl-num">#${lvl.level}</div>
        <div class="lvl-title">${lvl.name}</div>
        <div class="lvl-reward">Mukofot: $${lvl.reward.toLocaleString()}</div>
        <div class="lvl-type">${lvl.type === "time_trial" ? "⏱️ Vaqtga qarshi" : "🏎️ Botlar bilan (Yopiq Trassa)"}</div>
      `;
      if (isUnlocked) {
        card.onclick = () => {
          this.startActualGameplay("race", lvl.level);
        };
      }
      list.appendChild(card);
    });

    this.showModal("race-select-modal");
  }

  openParkingLevelSelect() {
    const list = document.getElementById("parking-levels-grid");
    if (!list) return;
    list.innerHTML = "";

    const unlocked = this.storage.state.unlockedParkingLevel || 1;
    this.parkingMode.levelsConfig.forEach(lvl => {
      const isUnlocked = lvl.level <= unlocked;
      const card = document.createElement("div");
      card.className = `level-card ${isUnlocked ? "unlocked" : "locked"} ${lvl.isExam ? "exam-card" : ""}`;
      card.innerHTML = `
        <div class="lvl-num">${lvl.isExam ? "🎓 IMTIHON" : `#${lvl.level}`}</div>
        <div class="lvl-title">${lvl.name}</div>
        <div class="lvl-reward">Mukofot: $${lvl.reward.toLocaleString()}</div>
        <div class="lvl-type">${lvl.isExam ? "🚦 Svetafor & Qoidalar (0 xato)" : "🅿️ To'siqlar & 3D Strelka"}</div>
      `;
      if (isUnlocked) {
        card.onclick = () => {
          this.startActualGameplay("parking", lvl.level);
        };
      }
      list.appendChild(card);
    });

    this.showModal("parking-select-modal");
  }

  // ALOHIDA TO'LIQ 360° 3D AVTOSALON SHOWROOM
  openDealershipModal() {
    this.showModal("dealership-modal");

    // Showroomni ishga tushirish
    setTimeout(() => {
      this.tuningManager.initDealershipShowroom("dealership-canvas");

      // Oldingi va keyingi tugmalarni ulash
      document.getElementById("btn-showroom-prev").onclick = () => this.tuningManager.prevCar();
      document.getElementById("btn-showroom-next").onclick = () => this.tuningManager.nextCar();
      document.getElementById("btn-close-dealership").onclick = () => this.closeAllModals();

      // Kategoriya tugmalari
      document.querySelectorAll(".deal-cat-btn").forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll(".deal-cat-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.tuningManager.filterCategory(btn.dataset.cat);
        };
      });
    }, 50);
  }

  openGarageModal() {
    const activeCarId = this.storage.getActiveCarId();
    this.tuningManager.initPreview("tuning-preview-canvas");
    this.tuningManager.loadCarInPreview(activeCarId);
    this.renderTuningOptions();
    this.showModal("garage-modal");
  }

  renderTuningOptions() {
    const activeCarId = this.storage.getActiveCarId();
    const parts = this.tuningManager.getTuningParts();

    document.getElementById("btn-test-doors").onclick = () => {
      const open = this.tuningManager.togglePreviewDoors();
      document.getElementById("btn-test-doors").textContent = open ? "Eshiklarni Yopish" : "Eshiklarni Sinash";
    };

    // Ranglar
    const colorContainer = document.getElementById("tuning-colors-container");
    if (colorContainer) {
      colorContainer.innerHTML = "";
      parts.colors.forEach(col => {
        const opt = document.createElement("button");
        opt.className = "color-dot";
        opt.style.backgroundColor = col.hex;
        opt.title = `${col.name} ($${col.price})`;
        opt.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "color", col.hex, col.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Rang o'zgartirildi: ${col.name}`);
        };
        colorContainer.appendChild(opt);
      });
    }

    // Fara chiroqlari
    const hlContainer = document.getElementById("tuning-headlights-container");
    if (hlContainer) {
      hlContainer.innerHTML = "";
      parts.headlightColors.forEach(hl => {
        const opt = document.createElement("button");
        opt.className = "color-dot";
        opt.style.backgroundColor = hl.hex;
        opt.title = `${hl.name} ($${hl.price})`;
        opt.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "headlightColor", hl.hex, hl.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Fara nuri: ${hl.name}`);
        };
        hlContainer.appendChild(opt);
      });
    }

    // Eshik uslublari
    const doorContainer = document.getElementById("tuning-doors-container");
    if (doorContainer) {
      doorContainer.innerHTML = "";
      parts.doorStyles.forEach(ds => {
        const btn = document.createElement("button");
        btn.className = "tuning-btn";
        btn.textContent = `${ds.name} ($${ds.price})`;
        btn.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "doorStyle", ds.id, ds.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Eshik uslubi: ${ds.name}`);
        };
        doorContainer.appendChild(btn);
      });
    }

    // Spoylerlar
    const spoilerContainer = document.getElementById("tuning-spoilers-container");
    if (spoilerContainer) {
      spoilerContainer.innerHTML = "";
      parts.spoilers.forEach(sp => {
        const btn = document.createElement("button");
        btn.className = "tuning-btn";
        btn.textContent = `${sp.name} ($${sp.price})`;
        btn.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "spoilerId", sp.id, sp.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Spoyler o'rnatildi: ${sp.name}`);
        };
        spoilerContainer.appendChild(btn);
      });
    }

    // Neon
    const neonContainer = document.getElementById("tuning-neon-container");
    if (neonContainer) {
      neonContainer.innerHTML = "";
      parts.neonUnderglow.forEach(n => {
        const btn = document.createElement("button");
        btn.className = "tuning-btn";
        btn.textContent = `${n.name} ($${n.price})`;
        btn.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "neonColor", n.hex, n.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Neon: ${n.name}`);
        };
        neonContainer.appendChild(btn);
      });
    }

    // Dvigatel
    const engineContainer = document.getElementById("tuning-engine-container");
    if (engineContainer) {
      engineContainer.innerHTML = "";
      parts.engineStages.forEach(st => {
        const btn = document.createElement("button");
        btn.className = "tuning-btn";
        btn.textContent = `${st.name} (+${st.hpBonus}HP / $${st.price})`;
        btn.onclick = () => {
          this.tuningManager.applyTuningOption(activeCarId, "engineStage", st.stage, st.price);
          this.reloadPlayerCar();
          this.updateProfileUI();
          this.showNotification(`Dvigatel: ${st.name}!`);
        };
        engineContainer.appendChild(btn);
      });
    }
  }

  // SOZLAMALAR (RUL SEZUVCHANLIGI, GRAFIKA, FPS, TIL)
  openSettingsModal() {
    const s = this.storage.getSettings();

    // Rul sezuvchanligi
    const sensSlider = document.getElementById("setting-steering-sens");
    const sensVal = document.getElementById("setting-sens-val");
    if (sensSlider) {
      const currentSensPercent = Math.round((s.steeringSensitivity || 0.45) * 100);
      sensSlider.value = currentSensPercent;
      if (sensVal) sensVal.textContent = `${currentSensPercent}%`;

      sensSlider.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        if (sensVal) sensVal.textContent = `${val}%`;
        const factor = val / 100;
        this.playerPhysics.setSteeringSensitivity(factor);
        this.storage.updateSettings({ steeringSensitivity: factor });
      };
    }

    const graphicsSelect = document.getElementById("setting-graphics");
    if (graphicsSelect) {
      graphicsSelect.value = s.graphics || "ultra";
      graphicsSelect.onchange = (e) => {
        this.storage.updateSettings({ graphics: e.target.value });
        this.settingsManager.applyGraphicsSettings(this.renderer, this.scene, this.camera);
        this.showNotification("Grafika sozlamalari yangilandi!");
      };
    }

    const fpsSelect = document.getElementById("setting-fps");
    if (fpsSelect) {
      fpsSelect.value = s.fpsLimit || 60;
      fpsSelect.onchange = (e) => {
        this.settingsManager.setFpsLimit(e.target.value);
        this.showNotification(`FPS: ${e.target.value}`);
      };
    }

    const langSelect = document.getElementById("setting-language");
    if (langSelect) {
      langSelect.value = s.language || "uz";
      langSelect.onchange = (e) => {
        this.settingsManager.setLanguage(e.target.value);
        this.showNotification("Til o'zgartirildi!");
      };
    }

    const masterVol = document.getElementById("setting-vol-master");
    if (masterVol) {
      masterVol.value = (s.masterVolume || 0.8) * 100;
      masterVol.oninput = (e) => {
        const val = e.target.value / 100;
        this.soundManager.setMasterVolume(val);
        this.storage.updateSettings({ masterVolume: val });
      };
    }

    this.showModal("settings-modal");
  }

  showModal(id, extraData = {}) {
    this.closeAllModals();
    const m = document.getElementById(id);
    if (!m) return;

    if (id === "result-modal") {
      document.getElementById("res-title").textContent = extraData.title || "";
      document.getElementById("res-text").textContent = extraData.text || "";
      document.getElementById("res-reward").textContent = extraData.reward || "";

      const btnNext = document.getElementById("btn-res-next");
      if (btnNext) {
        if (extraData.nextLevel) {
          btnNext.style.display = "inline-block";
          btnNext.onclick = () => {
            this.startActualGameplay(extraData.mode, extraData.nextLevel);
          };
        } else {
          btnNext.style.display = "none";
        }
      }

      document.getElementById("btn-res-retry").onclick = () => {
        if (extraData.mode === "race") this.startActualGameplay("race", this.raceMode.currentLevel);
        else if (extraData.mode === "parking") this.startActualGameplay("parking", this.parkingMode.currentLevel);
      };
    }

    m.classList.add("active");
  }

  closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
  }

  toggleMainMenu() {
    if (this.isInFestivalMenu) return;
    const m = document.getElementById("main-menu-modal");
    if (m) {
      if (m.classList.contains("active")) {
        m.classList.remove("active");
      } else {
        this.closeAllModals();
        m.classList.add("active");
      }
    }
  }

  showNotification(text) {
    const notif = document.getElementById("notification-toast");
    if (!notif) return;
    notif.textContent = text;
    notif.classList.add("show");
    clearTimeout(this.notifTimer);
    this.notifTimer = setTimeout(() => {
      notif.classList.remove("show");
    }, 2800);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
