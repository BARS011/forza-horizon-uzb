// ============================================================================
// FORZA HORIZON UZ - ENHANCED CAR PHYSICS & DRIFT WITH SENSITIVITY CONTROL
// Rul sezuvchanligi, shina tutuni, skid-marks va silliq barqaror boshqaruv
// ============================================================================

export class CarPhysics {
  constructor(carGroup, specs, tuning = {}, steeringSensitivity = 0.45) {
    this.car = carGroup;
    this.specs = specs;
    this.tuning = tuning;
    this.steeringSensitivity = steeringSensitivity; // 0.2 (juda silliq) - 1.2 (o'ta tez)

    this.position = this.car.position;
    this.rotation = this.car.rotation;
    this.speed = 0;
    this.speedKmh = 0;
    this.steerAngle = 0;
    this.slipAngle = 0;

    this.isEngineRunning = false;
    this.gear = 1;
    this.rpm = 800;
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = false;
    this.nitro = false;
    this.nitroAmount = 100;

    const engineStage = tuning.engineStage || 0;
    const hpBonus = engineStage * 45;
    const speedBonus = engineStage * 18;

    this.hp = (specs.hp || 100) + hpBonus;
    this.maxSpeedKmh = (specs.topSpeed || 180) + speedBonus;
    this.maxSpeedMs = this.maxSpeedKmh / 3.6;
    this.weight = specs.weight || 1200;
    this.baseHandling = (specs.handling || 80) / 100;
    this.baseBraking = (specs.braking || 80) / 100;

    this.accelPower = (this.hp / this.weight) * 28;
    this.bodyRoll = 0;
    this.bodyPitch = 0;
    this.colliderRadius = Math.max(specs.dimensions.width, specs.dimensions.length) * 0.45;

    // Shina tutuni va drift holati
    this.isDrifting = false;
  }

  setSteeringSensitivity(val) {
    this.steeringSensitivity = Math.max(0.15, Math.min(1.2, val));
  }

  startEngine() {
    this.isEngineRunning = true;
    this.rpm = 900;
  }

  stopEngine() {
    this.isEngineRunning = false;
    this.rpm = 0;
    this.throttle = 0;
  }

  update(delta, input, colliders = []) {
    delta = Math.min(delta, 0.08);

    if (!this.isEngineRunning) {
      this.speed *= Math.pow(0.92, delta * 60);
      this.speedKmh = Math.abs(this.speed * 3.6);
      this.rpm = Math.max(0, this.rpm - 1500 * delta);
      this.updateMeshTransforms(delta);
      return;
    }

    let forwardInput = 0;
    if (input.forward) forwardInput += 1;
    if (input.backward) forwardInput -= 1;

    let steerInput = 0;
    if (input.left) steerInput += 1;
    if (input.right) steerInput -= 1;

    this.handbrake = input.handbrake;
    this.nitro = input.nitro && this.nitroAmount > 5;

    if (this.nitro) {
      this.nitroAmount = Math.max(0, this.nitroAmount - 35 * delta);
    } else {
      this.nitroAmount = Math.min(100, this.nitroAmount + 12 * delta);
    }

    // 1. TEZLANISH VA TORMOZ
    const nitroMult = this.nitro ? 1.55 : 1.0;
    const currentMaxSpeed = this.maxSpeedMs * (this.nitro ? 1.2 : 1.0);

    if (forwardInput > 0) {
      if (this.speed < -0.5) {
        this.brake = 1.0;
        this.speed += this.baseBraking * 22 * delta;
        this.gear = 1;
      } else {
        this.brake = 0;
        this.throttle = forwardInput;
        this.gear = Math.max(1, this.gear);
        const speedFactor = Math.max(0.12, 1.0 - (this.speed / currentMaxSpeed));
        this.speed += this.accelPower * speedFactor * nitroMult * delta;
        if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
      }
    } else if (forwardInput < 0) {
      if (this.speed > 0.5) {
        this.brake = 1.0;
        this.throttle = 0;
        this.speed -= this.baseBraking * 26 * delta;
        if (this.speed < 0) this.speed = 0;
      } else {
        this.brake = 0;
        this.gear = -1;
        const maxRev = -this.maxSpeedMs * 0.28;
        this.speed -= this.accelPower * 0.45 * delta;
        if (this.speed < maxRev) this.speed = maxRev;
      }
    } else {
      this.throttle = 0;
      this.brake = 0;
      this.speed *= Math.pow(0.985, delta * 60);
    }

    // Qo'l tormozi
    if (this.handbrake) {
      this.speed *= Math.pow(0.96, delta * 60);
      this.slipAngle = Math.min(1.0, this.slipAngle + 4.0 * delta);
    } else {
      this.slipAngle = Math.max(0, this.slipAngle - 2.8 * delta);
    }

    this.speedKmh = Math.abs(this.speed * 3.6);
    this.isDrifting = (this.slipAngle > 0.35 || (this.handbrake && this.speedKmh > 20));

    // 2. RUL VA SEZUVCHANLIKNI BOSHQARISH (SILLIQ VA ANIQ BURILISH)
    // Yuqori tezlikda burilish burchagini sezilarli darajada barqarorlashtirish
    const speedRatio = Math.min(1.0, this.speedKmh / this.maxSpeedKmh);
    const dynamicMaxAngle = (0.5 - speedRatio * 0.32) * this.steeringSensitivity;

    const targetSteer = steerInput * dynamicMaxAngle;
    // Silliq burilish interpolatsiyasi (keskin burilishni oldini oladi)
    const steerSmoothSpeed = 6.5 * this.steeringSensitivity;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, steerSmoothSpeed * delta);

    if (Math.abs(this.speed) > 0.4) {
      const dirSign = this.speed >= 0 ? 1 : -1;
      const driftBoost = this.handbrake ? 2.0 : (1.0 + this.slipAngle * 0.6);
      const turnRate = (this.steerAngle * this.baseHandling * 2.2 * driftBoost * dirSign);
      this.rotation.y += turnRate * (Math.abs(this.speed) / (14 + Math.abs(this.speed) * 0.6)) * delta * 8;
    }

    // 3. POZITSIYANI SILJITISH
    const fX = Math.sin(this.rotation.y);
    const fZ = Math.cos(this.rotation.y);

    const sX = Math.cos(this.rotation.y);
    const sZ = -Math.sin(this.rotation.y);
    const lateralSlip = this.slipAngle * steerInput * 0.28 * Math.abs(this.speed);

    this.position.x += (fX * this.speed + sX * lateralSlip) * delta;
    this.position.z += (fZ * this.speed + sZ * lateralSlip) * delta;

    // 4. TO'QNASHUV
    this.checkCollisions(colliders);

    // 5. UZATMA VA RPM
    this.calculateGearsAndRPM();

    // 6. VIZUAL G'ILDIRAKLAR VA KUZOV CHAYQALISHI
    this.updateMeshTransforms(delta);
  }

  calculateGearsAndRPM() {
    if (this.gear === -1) {
      this.rpm = 1000 + (Math.abs(this.speedKmh) / 45) * 4500;
      return;
    }

    const ratios = [0, 35, 75, 120, 175, 235, 450];
    let detectedGear = 1;
    for (let g = 1; g < ratios.length; g++) {
      if (this.speedKmh > ratios[g - 1]) detectedGear = g;
    }
    this.gear = detectedGear;

    const lower = ratios[this.gear - 1];
    const upper = ratios[this.gear] || 500;
    const frac = (this.speedKmh - lower) / Math.max(1, upper - lower);
    this.rpm = 1000 + Math.min(1.0, Math.max(0, frac)) * 6500;
    if (this.throttle > 0) this.rpm += 400;
  }

  checkCollisions(colliders) {
    if (!colliders || colliders.length === 0) return;

    for (const obs of colliders) {
      if (!obs.position) continue;
      const dx = this.position.x - obs.position.x;
      const dz = this.position.z - obs.position.z;
      const distSq = dx * dx + dz * dz;
      const minDist = this.colliderRadius + (obs.radius || 1.8);

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const pushDist = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        this.position.x += nx * pushDist;
        this.position.z += nz * pushDist;

        this.speed *= -0.32;
        this.slipAngle = 0.4;

        if (this.onCollision) {
          this.onCollision(obs, Math.abs(this.speedKmh));
        }
        break;
      }
    }
  }

  updateMeshTransforms(delta) {
    const userData = this.car.userData;
    if (!userData) return;

    if (userData.wheels && userData.wheels.steerNodes) {
      userData.wheels.steerNodes.forEach(node => {
        node.rotation.y = this.steerAngle;
      });
    }

    const spinRate = (this.speed / 0.35) * delta;
    if (userData.wheels) {
      ["FL", "FR", "RL", "RR"].forEach(wName => {
        const wMesh = userData.wheels[wName];
        if (wMesh) wMesh.rotation.x += spinRate;
      });
    }

    if (userData.steeringWheel) {
      userData.steeringWheel.rotation.z = -this.steerAngle * 2.5;
    }

    const targetRoll = -this.steerAngle * (this.speed / 24);
    const targetPitch = (this.throttle * 0.035) - (this.brake * 0.05);

    this.bodyRoll += (targetRoll - this.bodyRoll) * 6 * delta;
    this.bodyPitch += (targetPitch - this.bodyPitch) * 6 * delta;

    if (userData.chassis) {
      userData.chassis.rotation.z = this.bodyRoll;
      userData.chassis.rotation.x = this.bodyPitch;
    }

    if (userData.nitroFlames) {
      const op = this.nitro ? 0.95 : 0;
      userData.nitroFlames.forEach(f => {
        f.material.opacity = op;
        if (this.nitro) f.scale.y = 0.8 + Math.random() * 0.6;
      });
    }

    if (userData.wipersActive && userData.wiperGroup) {
      const speedWiper = 8.0;
      userData.wiperAngle += userData.wiperDirection * speedWiper * delta;
      if (userData.wiperAngle > Math.PI * 0.35) {
        userData.wiperAngle = Math.PI * 0.35;
        userData.wiperDirection = -1;
      } else if (userData.wiperAngle < -Math.PI * 0.05) {
        userData.wiperAngle = -Math.PI * 0.05;
        userData.wiperDirection = 1;
      }
      userData.wiperGroup.children.forEach(pivot => {
        pivot.rotation.z = userData.wiperAngle;
      });
    }
  }

  toggleWipers() {
    if (!this.car.userData) return false;
    this.car.userData.wipersActive = !this.car.userData.wipersActive;
    return this.car.userData.wipersActive;
  }

  toggleHeadlights() {
    const ud = this.car.userData;
    if (!ud) return false;
    ud.headlightsOn = !ud.headlightsOn;
    if (ud.spotlights) {
      ud.spotlights.forEach(spot => spot.visible = ud.headlightsOn);
    }
    if (ud.headlights) {
      ud.headlights.forEach(hl => hl.material.emissiveIntensity = ud.headlightsOn ? 2.2 : 0.1);
    }
    return ud.headlightsOn;
  }
}
