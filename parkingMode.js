// ============================================================================
// FORZA HORIZON UZ - ENCLOSED PARKING & 3D GUIDING ARROW (40 TA BOSQICH)
// To'siq koridorlari, 3D yo'naltiruvchi strelka va har 10-bosqichda Qoidalar Imtihoni
// ============================================================================

export class ParkingMode {
  constructor(THREE, scene, soundManager, cityMap) {
    this.THREE = THREE;
    this.scene = scene;
    this.soundManager = soundManager;
    this.cityMap = cityMap;

    this.active = false;
    this.currentLevel = 1;
    this.isExamLevel = false;

    this.targetParkingSlot = null;
    this.obstacles = [];
    this.obstacleMeshes = [];
    this.collisionsCount = 0;
    this.maxAllowedCollisions = 3;
    this.violationsCount = 0;
    this.parkTimer = 0;
    this.parkedTimeInside = 0;

    this.group = new THREE.Group();
    this.group.name = "parking_mode_group";

    // 3D Yo'naltiruvchi Navigatsiya Strelkasi
    this.navArrow = this.createNavArrow();
    this.scene.add(this.navArrow);
    this.navArrow.visible = false;

    this.levelsConfig = this.generate40Levels();
  }

  createNavArrow() {
    const THREE = this.THREE;
    const arrowGroup = new THREE.Group();
    arrowGroup.name = "parking_nav_arrow";

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.95 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.6, 8), arrowMat);
    cone.rotation.x = Math.PI * 0.5;
    arrowGroup.add(cone);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 8), arrowMat);
    shaft.position.z = -0.95;
    shaft.rotation.x = Math.PI * 0.5;
    arrowGroup.add(shaft);

    return arrowGroup;
  }

  generate40Levels() {
    const levels = [];
    for (let i = 1; i <= 40; i++) {
      const isExam = i % 10 === 0;
      let name = "";
      let reward = 800 + i * 900 + (isExam ? 15000 : 0);

      if (isExam) {
        if (i === 10) name = "1-Imtihon: Shaharda Svetafor va Piyodalar";
        else if (i === 20) name = "2-Imtihon: Katta Chorrahalar va Qat'iy Qoidalar";
        else if (i === 30) name = "3-Imtihon: Tungi Shahar & Tig'iz Harakat";
        else if (i === 40) name = "FINAL: Haydovchilik Akademiyasi Grand Imtihoni";
      } else {
        if (i <= 9) name = `Boshlang'ich Parkovka #${i}: Konuslar va To'siqlar`;
        else if (i <= 19) name = `Oraliq Parkovka #${i}: Orqaga va Parallel`;
        else if (i <= 29) name = `Murakkab Parkovka #${i}: Tor Yo'laklar`;
        else name = `Professional Parkovka #${i}: Ekstremal Joylashuv`;
      }

      levels.push({
        level: i,
        name: name,
        isExam: isExam,
        reward: Math.round(reward),
        maxCollisions: isExam ? 0 : Math.max(1, 4 - Math.floor(i / 12)),
        timeLimit: isExam ? 180 : Math.max(45, 90 - i)
      });
    }
    return levels;
  }

  startLevel(levelNumber, playerPhysics) {
    this.currentLevel = Math.min(40, Math.max(1, levelNumber));
    const cfg = this.levelsConfig[this.currentLevel - 1];

    this.active = true;
    this.isExamLevel = cfg.isExam;
    this.collisionsCount = 0;
    this.violationsCount = 0;
    this.maxAllowedCollisions = cfg.maxCollisions;
    this.parkTimer = 0;
    this.parkedTimeInside = 0;

    this.cleanup();

    if (this.isExamLevel) {
      this.setupExamCourse(this.currentLevel, playerPhysics);
    } else {
      this.setupStandardParking(this.currentLevel, playerPhysics);
    }

    this.navArrow.visible = true;
    this.scene.add(this.group);
  }

  setupStandardParking(lvl, playerPhysics) {
    const THREE = this.THREE;

    const startX = 20;
    const startZ = 20;
    playerPhysics.position.set(startX, 0.4, startZ);
    playerPhysics.rotation.y = 0;
    playerPhysics.speed = 0;

    const targetZ = startZ + 38 + (lvl % 8) * 8;
    const targetX = startX + (lvl % 2 === 0 ? 12 : -12);
    this.targetParkingSlot = {
      x: targetX,
      z: targetZ,
      width: 4.2,
      length: 7.2,
      rotation: (lvl % 3 === 0 ? Math.PI * 0.5 : 0)
    };

    this.drawParkingBay(this.targetParkingSlot);

    // Parkovka maydonining atrofiga himoya to'siqlarini o'rnatish
    this.buildParkingEnclosure(startX, startZ, targetX, targetZ);

    // Konuslar
    const numCones = 12 + lvl * 2;
    for (let c = 0; c < numCones; c++) {
      const coneX = startX - 16 + Math.random() * 32;
      const coneZ = startZ + 8 + Math.random() * 42;

      const dStart = Math.hypot(coneX - startX, coneZ - startZ);
      const dTarget = Math.hypot(coneX - targetX, coneZ - targetZ);
      if (dStart < 7 || dTarget < 7) continue;

      this.spawnTrafficCone(coneX, coneZ);
    }
  }

  buildParkingEnclosure(startX, startZ, targetX, targetZ) {
    const THREE = this.THREE;
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });

    const minX = Math.min(startX, targetX) - 15;
    const maxX = Math.max(startX, targetX) + 15;
    const minZ = startZ - 10;
    const maxZ = targetZ + 18;

    const walls = [
      { x: (minX + maxX) * 0.5, z: minZ, w: maxX - minX, d: 0.6 },
      { x: (minX + maxX) * 0.5, z: maxZ, w: maxX - minX, d: 0.6 },
      { x: minX, z: (minZ + maxZ) * 0.5, w: 0.6, d: maxZ - minZ },
      { x: maxX, z: (minZ + maxZ) * 0.5, w: 0.6, d: maxZ - minZ }
    ];

    walls.forEach(w => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w.w, 1.2, w.d), barrierMat);
      b.position.set(w.x, 0.6, w.z);
      this.group.add(b);
      this.obstacles.push({ position: { x: w.x, z: w.z }, radius: 1.5 });
    });
  }

  setupExamCourse(lvl, playerPhysics) {
    const THREE = this.THREE;
    const startX = 0;
    const startZ = -140;
    playerPhysics.position.set(startX, 0.4, startZ);
    playerPhysics.rotation.y = 0;
    playerPhysics.speed = 0;

    const targetX = 0;
    const targetZ = 140;
    this.targetParkingSlot = {
      x: targetX,
      z: targetZ,
      width: 4.5,
      length: 7.5,
      rotation: 0
    };

    this.drawParkingBay(this.targetParkingSlot);

    // Stop belgilari
    const stopPole = new THREE.Group();
    stopPole.position.set(13, 0, -20);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8), new THREE.MeshStandardMaterial({ color: 0x777777 }));
    pole.position.y = 2.25;
    stopPole.add(pole);

    const sign = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    sign.rotation.x = Math.PI * 0.5;
    sign.position.y = 4.0;
    stopPole.add(sign);
    this.group.add(stopPole);
  }

  drawParkingBay(slot) {
    const THREE = this.THREE;
    const bayGroup = new THREE.Group();
    bayGroup.position.set(slot.x, 0.05, slot.z);
    bayGroup.rotation.y = slot.rotation;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(slot.width, slot.length),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.4 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    bayGroup.add(floor);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(slot.width, slot.length)),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    outline.rotation.x = -Math.PI * 0.5;
    bayGroup.add(outline);

    // 3D "P" harfi ustuni
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    beacon.position.y = 6;
    bayGroup.add(beacon);

    this.group.add(bayGroup);
  }

  spawnTrafficCone(x, z) {
    const THREE = this.THREE;
    const coneGroup = new THREE.Group();
    coneGroup.position.set(x, 0, z);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 })
    );
    cone.position.y = 0.4;
    coneGroup.add(cone);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    base.position.y = 0.03;
    coneGroup.add(base);

    this.group.add(coneGroup);
    this.obstacles.push({ position: { x, z }, radius: 0.55 });
    this.obstacleMeshes.push(coneGroup);
  }

  update(delta, playerPhysics, onParkingComplete) {
    if (!this.active) return;

    this.parkTimer += delta;
    const cfg = this.levelsConfig[this.currentLevel - 1];

    if (this.parkTimer > cfg.timeLimit) {
      this.active = false;
      this.navArrow.visible = false;
      if (onParkingComplete) {
        onParkingComplete({ success: false, reason: "Vaqt tugadi! Belgilangan muddatda parkovka qilib ulgurmadingiz." });
      }
      return;
    }

    // 3D Navigatsiya strelkasini yangilash
    if (this.targetParkingSlot && this.navArrow && this.navArrow.visible) {
      this.navArrow.position.set(playerPhysics.position.x, playerPhysics.position.y + 3.8, playerPhysics.position.z);
      const angle = Math.atan2(this.targetParkingSlot.x - playerPhysics.position.x, this.targetParkingSlot.z - playerPhysics.position.z);
      this.navArrow.rotation.y = angle;
      this.navArrow.position.y += Math.sin(this.parkTimer * 5) * 0.2;
    }

    // To'siqlar bilan to'qnashuv
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dx = playerPhysics.position.x - obs.position.x;
      const dz = playerPhysics.position.z - obs.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < playerPhysics.colliderRadius + obs.radius) {
        this.collisionsCount++;
        this.soundManager.playCrash();

        if (this.obstacleMeshes[i]) {
          this.group.remove(this.obstacleMeshes[i]);
          this.obstacleMeshes.splice(i, 1);
        }
        this.obstacles.splice(i, 1);

        if (this.collisionsCount > this.maxAllowedCollisions) {
          this.active = false;
          this.navArrow.visible = false;
          if (onParkingComplete) {
            onParkingComplete({
              success: false,
              reason: this.isExamLevel
                ? "Imtihondan yiqildingiz! To'siqqa urildingiz (Imtihonda 0 xatolik talab etiladi)."
                : `Juda ko'p to'qnashuvlar (${this.collisionsCount}/${this.maxAllowedCollisions})!`
            });
          }
          return;
        }
        break;
      }
    }

    // Imtihonda svetofor tekshiruvi
    if (this.isExamLevel) {
      this.checkTrafficRules(playerPhysics, onParkingComplete);
    }

    // Parkovkani tekshirish
    if (this.targetParkingSlot) {
      const t = this.targetParkingSlot;
      const dx = Math.abs(playerPhysics.position.x - t.x);
      const dz = Math.abs(playerPhysics.position.z - t.z);

      const inside = (dx < t.width * 0.6 && dz < t.length * 0.6);
      const stopped = playerPhysics.speedKmh < 1.0;

      if (inside && stopped) {
        this.parkedTimeInside += delta;
        if (this.parkedTimeInside > 1.5) {
          this.active = false;
          this.navArrow.visible = false;
          this.soundManager.playVictorySound();
          if (onParkingComplete) {
            onParkingComplete({
              success: true,
              level: this.currentLevel,
              isExam: this.isExamLevel,
              reward: cfg.reward,
              time: this.parkTimer,
              collisions: this.collisionsCount
            });
          }
        }
      } else {
        this.parkedTimeInside = Math.max(0, this.parkedTimeInside - delta * 2);
      }
    }
  }

  checkTrafficRules(playerPhysics, onParkingComplete) {
    for (const tl of this.cityMap.trafficLights) {
      const dx = playerPhysics.position.x - tl.intersection.x;
      const dz = playerPhysics.position.z - tl.intersection.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 18 && playerPhysics.speedKmh > 10) {
        if (tl.state === "RED") {
          this.active = false;
          this.navArrow.visible = false;
          this.soundManager.playCrash();
          if (onParkingComplete) {
            onParkingComplete({
              success: false,
              reason: "Imtihondan yiqildingiz! QIZIL chiroqqa o'tdingiz. Yo'l harakati qoidalariga qat'iy rioya qiling!"
            });
          }
          return;
        }
      }
    }
  }

  cleanup() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.obstacles = [];
    this.obstacleMeshes = [];
    this.targetParkingSlot = null;
    if (this.navArrow) this.navArrow.visible = false;
  }
}
