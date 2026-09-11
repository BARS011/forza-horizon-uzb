// ============================================================================
// FORZA HORIZON UZ - LOCAL STORAGE & PROFILE MANAGEMENT
// Foydalanuvchi profili, balans, ochilgan mashinalar, tyuning va sozlamalarni saqlash
// ============================================================================

const STORAGE_KEY = "forza_horizon_uz_save_v1";

const DEFAULT_STATE = {
  username: "",
  money: 10000, // Boshlang'ich kapital
  ownedCars: ["matiz"],
  activeCarId: "matiz",
  unlockedRaceLevel: 1,
  unlockedParkingLevel: 1,
  customizations: {
    matiz: {
      color: "#e63946",
      headlightColor: "#ffffff",
      doorStyle: "normal",
      spoilerId: "none",
      rimId: "stock",
      rimColor: "#111111",
      neonColor: null,
      engineStage: 0,
      windowTint: 0.2,
      suspension: 0
    }
  },
  settings: {
    graphics: "ultra", // ultra, super, medium, low
    fpsLimit: 60,      // 30, 60, 90, 120, 0 (unlimited)
    steeringSensitivity: 0.45, // 0.15 dan 1.2 gacha
    language: "uz",    // uz, en, ru
    masterVolume: 0.8,
    engineVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4
  }
};

export class StorageManager {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_STATE, ...parsed, settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) } };
      }
    } catch (e) {
      console.warn("Storage yuklashda xatolik:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Storage saqlashda xatolik:", e);
    }
  }

  getUsername() {
    return this.state.username;
  }

  setUsername(name) {
    this.state.username = name.trim();
    this.save();
  }

  getMoney() {
    return this.state.money;
  }

  addMoney(amount) {
    this.state.money += amount;
    this.save();
    return this.state.money;
  }

  spendMoney(amount) {
    if (this.state.money >= amount) {
      this.state.money -= amount;
      this.save();
      return true;
    }
    return false;
  }

  getOwnedCars() {
    return this.state.ownedCars;
  }

  isCarOwned(carId) {
    return this.state.ownedCars.includes(carId);
  }

  buyCar(carId, price) {
    if (this.isCarOwned(carId)) return true;
    if (this.spendMoney(price)) {
      this.state.ownedCars.push(carId);
      if (!this.state.customizations[carId]) {
        this.state.customizations[carId] = {
          color: null,
          headlightColor: "#ffffff",
          doorStyle: "normal",
          spoilerId: "none",
          rimId: "stock",
          rimColor: "#111111",
          neonColor: null,
          engineStage: 0,
          windowTint: 0.3,
          suspension: 0
        };
      }
      this.save();
      return true;
    }
    return false;
  }

  getActiveCarId() {
    return this.state.activeCarId || "matiz";
  }

  setActiveCarId(carId) {
    if (this.isCarOwned(carId)) {
      this.state.activeCarId = carId;
      this.save();
      return true;
    }
    return false;
  }

  getCarTuning(carId) {
    return this.state.customizations[carId] || {};
  }

  saveCarTuning(carId, tuningObj) {
    this.state.customizations[carId] = {
      ...(this.state.customizations[carId] || {}),
      ...tuningObj
    };
    this.save();
  }

  unlockRaceLevel(lvl) {
    if (lvl > this.state.unlockedRaceLevel) {
      this.state.unlockedRaceLevel = Math.min(30, lvl);
      this.save();
    }
  }

  unlockParkingLevel(lvl) {
    if (lvl > this.state.unlockedParkingLevel) {
      this.state.unlockedParkingLevel = Math.min(40, lvl);
      this.save();
    }
  }

  getSettings() {
    return this.state.settings;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();
  }
}

export const storage = new StorageManager();
