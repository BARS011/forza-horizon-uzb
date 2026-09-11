// ============================================================================
// FORZA HORIZON UZ - ENCLOSED RACE TRACKS & 3D GUIDING ARROW (30 TA BOSQICH)
// Trassa bo'ylab to'siq panjaralar, 3D yo'naltiruvchi navigatsiya strelkasi va AI botlar
// ============================================================================

export class RaceMode {
  constructor(THREE, scene, soundManager) {
    this.THREE = THREE;
    this.scene = scene;
    this.soundManager = soundManager;

    this.active = false;
    this.currentLevel = 1;
    this.raceType = "circuit";
    this.checkpoints = [];
    this.currentCheckpointIdx = 0;
    this.lap = 1;
    this.totalLaps = 2;
    this.raceTimer = 0;
    this.timeLimit = 120;
    this.position = 1;
    this.totalRacers = 4;

    this.aiBots = [];
    this.checkpointMeshes = [];
    this.trackBarriers = [];
    this.group = new THREE.Group();
    this.group.name = "race_mode_group";

    // 3D Navigatsiya strelkasi (Floating Navigation Arrow)
    this.navArrow = this.createNavArrow();
    this.scene.add(this.navArrow);
    this.navArrow.visible = false;

    this.levelsConfig = this.generate30Levels();
  }

  createNavArrow() {
    const THREE = this.THREE;
    const arrowGroup = new THREE.Group();
    arrowGroup.name = "race_nav_arrow";

    // Katta neon yashil 3D strelka
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.95 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 8), arrowMat);
    cone.rotation.x = Math.PI * 0.5;
    arrowGroup.add(cone);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 8), arrowMat);
    shaft.position.z = -1.1;
    shaft.rotation.x = Math.PI * 0.5;
    arrowGroup.add(shaft);

    return arrowGroup;
  }

  generate30Levels() {
    const levels = [];
    for (let i = 1; i <= 30; i++) {
      let type = "circuit";
      if (i % 3 === 0) type = "time_trial";
      else if (i % 2 === 0) type = "sprint";

      const baseReward = 1500 + i * 1800 + Math.pow(i, 2) * 80;
      const numBots = type === "time_trial" ? 0 : 3;
      const botSpeedMult = 0.65 + (i / 30) * 0.48;

      levels.push({
        level: i,
        name: `Poyga #${i}: ${i <= 10 ? "Shahar Ko'chalari" : (i <= 20 ? "Katta Trassa & Drift" : "Grand Prix Chempionati")}`,
        type: type,
        laps: type === "sprint" ? 1 : 2,
        timeLimit: Math.max(50, 140 - i * 2),
        reward: Math.round(baseReward),
        numBots: numBots,
        botSpeedMult: botSpeedMult
      });
    }
    return levels;
  }

  startLevel(levelNumber, playerPhysics) {
    this.currentLevel = Math.min(30, Math.max(1, levelNumber));
    const cfg = this.levelsConfig[this.currentLevel - 1];

    this.active = true;
    this.raceType = cfg.type;
    this.totalLaps = cfg.laps;
    this.timeLimit = cfg.timeLimit;
    this.lap = 1;
    this.currentCheckpointIdx = 0;
    this.raceTimer = 0;
    this.totalRacers = 1 + cfg.numBots;
    this.position = this.totalRacers;

    this.cleanup();

    this.generateTrackPath(this.currentLevel);

    // Trassa bo'ylab xavfsizlik to'siqlari va devorlarni o'rnatish
    this.buildTrackBarriers();

    const startPoint = this.checkpoints[0];
    const nextPoint = this.checkpoints[1];
    const startAngle = Math.atan2(nextPoint.x - startPoint.x, nextPoint.z - startPoint.z);

    playerPhysics.position.set(startPoint.x, 0.4, startPoint.z);
    playerPhysics.rotation.y = startAngle;
    playerPhysics.speed = 0;

    this.spawnAIBots(cfg, startPoint, startAngle);

    this.navArrow.visible = true;
    this.scene.add(this.group);
  }

  generateTrackPath(lvl) {
    this.checkpoints = [];
    const radius = 180 + (lvl % 5) * 35;
    const numPoints = 12 + (lvl % 6) * 2;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const wobble = Math.sin(angle * 3 + lvl) * 45;
      const x = Math.sin(angle) * (radius + wobble);
      const z = Math.cos(angle) * (radius - wobble);
      this.checkpoints.push({ x, z });
    }

    const THREE = this.THREE;
    this.checkpointMeshes = [];
    this.checkpoints.forEach((cp, idx) => {
      const archGroup = new THREE.Group();
      archGroup.position.set(cp.x, 0, cp.z);

      const gateMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0x22c55e : 0x00f0ff,
        transparent: true,
        opacity: 0.8
      });

      // Katta darvoza arki
      const torus = new THREE.Mesh(new THREE.TorusGeometry(13, 0.4, 8, 24), gateMat);
      torus.rotation.x = Math.PI * 0.5;
      torus.position.y = 0.2;
      archGroup.add(torus);

      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 30, 8), gateMat);
      beacon.position.y = 15;
      archGroup.add(beacon);

      this.group.add(archGroup);
      this.checkpointMeshes.push(archGroup);
    });

    this.updateCheckpointHighlight();
  }

  // Poyga trassasini to'liq o'rab oluvchi neon to'siqlar
  buildTrackBarriers() {
    const THREE = this.THREE;
    const trackWidth = 14; // Trassa kengligi
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    const neonBarMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    for (let i = 0; i < this.checkpoints.length; i++) {
      const p1 = this.checkpoints[i];
      const p2 = this.checkpoints[(i + 1) % this.checkpoints.length];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      // Normal vektor (yo'lning chap va o'ng tomoni)
      const nx = -Math.sin(angle);
      const nz = Math.cos(angle);

      [-1, 1].forEach(side => {
        const bx = (p1.x + p2.x) * 0.5 + nx * side * trackWidth;
        const bz = (p1.z + p2.z) * 0.5 + nz * side * trackWidth;

        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, len), barrierMat);
        barrier.position.set(bx, 0.6, bz);
        barrier.rotation.y = angle;
        this.group.add(barrier);

        // Ustidagi yorqin neon chizig'i
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, len), neonBarMat);
        topBar.position.set(bx, 1.25, bz);
        topBar.rotation.y = angle;
        this.group.add(topBar);

        this.trackBarriers.push({ position: { x: bx, z: bz }, radius: len * 0.45 });
      });
    }
  }

  spawnAIBots(cfg, startPoint, startAngle) {
    const THREE = this.THREE;
    this.aiBots = [];
    const botColors = [0xdc2626, 0x2563eb, 0x16a34a, 0x9333ea];

    for (let b = 0; b < cfg.numBots; b++) {
      const botGroup = new THREE.Group();
      botGroup.name = `race_bot_${b}`;

      const color = botColors[b % botColors.length];
      const botMat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.85 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 4.4), botMat);
      body.position.y = 0.55;
      body.castShadow = true;
      botGroup.add(body);

      [-1, 1].forEach(x => {
        [-1.3, 1.3].forEach(z => {
          const w = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
          );
          w.rotateZ(Math.PI * 0.5);
          w.position.set(x, 0.35, z);
          botGroup.add(w);
        });
      });

      const offsetX = Math.cos(startAngle) * (b + 1) * 3.8;
      const offsetZ = -Math.sin(startAngle) * (b + 1) * 3.8;
      botGroup.position.set(startPoint.x + offsetX, 0.4, startPoint.z + offsetZ);
      botGroup.rotation.y = startAngle;

      this.group.add(botGroup);

      this.aiBots.push({
        mesh: botGroup,
        currentCp: 1,
        speed: (22 + cfg.botSpeedMult * 26),
        lap: 1
      });
    }
  }

  update(delta, playerPhysics, onRaceComplete) {
    if (!this.active) return;

    this.raceTimer += delta;

    if (this.raceType === "time_trial" && this.raceTimer > this.timeLimit) {
      this.active = false;
      this.navArrow.visible = false;
      if (onRaceComplete) {
        onRaceComplete({ success: false, reason: "Vaqt tugadi! Belgilangan vaqtda marraga yetib kela olmadingiz." });
      }
      return;
    }

    // 1. O'YINCHI CHECKPOINT TEKSHIRUVI
    const targetCp = this.checkpoints[this.currentCheckpointIdx];
    const dx = playerPhysics.position.x - targetCp.x;
    const dz = playerPhysics.position.z - targetCp.z;
    const distToCp = Math.hypot(dx, dz);

    // 3D Navigatsiya strelkasini yangilash (O'yinchining tepasida nishonga qarab turadi)
    if (this.navArrow && this.navArrow.visible) {
      this.navArrow.position.set(playerPhysics.position.x, playerPhysics.position.y + 3.8, playerPhysics.position.z);
      const angleToTarget = Math.atan2(targetCp.x - playerPhysics.position.x, targetCp.z - playerPhysics.position.z);
      this.navArrow.rotation.y = angleToTarget;
      // Kichik tebranish animatsiyasi
      this.navArrow.position.y += Math.sin(this.raceTimer * 5) * 0.2;
    }

    if (distToCp < 18) {
      this.soundManager.playCheckpointSound();
      this.currentCheckpointIdx++;

      if (this.currentCheckpointIdx >= this.checkpoints.length) {
        this.currentCheckpointIdx = 0;
        this.lap++;

        if (this.lap > this.totalLaps) {
          this.active = false;
          this.navArrow.visible = false;
          this.soundManager.playVictorySound();
          const cfg = this.levelsConfig[this.currentLevel - 1];
          if (onRaceComplete) {
            onRaceComplete({
              success: true,
              level: this.currentLevel,
              reward: cfg.reward,
              time: this.raceTimer,
              position: this.position
            });
          }
          return;
        }
      }
      this.updateCheckpointHighlight();
    }

    // 2. AI BOTLAR HARAKATI
    this.aiBots.forEach(bot => {
      const bCp = this.checkpoints[bot.currentCp];
      const bdx = bCp.x - bot.mesh.position.x;
      const bdz = bCp.z - bot.mesh.position.z;
      const bDist = Math.hypot(bdx, bdz);

      const targetAngle = Math.atan2(bdx, bdz);
      let diff = targetAngle - bot.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      bot.mesh.rotation.y += diff * 4 * delta;

      bot.mesh.position.x += Math.sin(bot.mesh.rotation.y) * bot.speed * delta;
      bot.mesh.position.z += Math.cos(bot.mesh.rotation.y) * bot.speed * delta;

      if (bDist < 18) {
        bot.currentCp++;
        if (bot.currentCp >= this.checkpoints.length) {
          bot.currentCp = 0;
          bot.lap++;
        }
      }
    });

    // 3. O'RINNI HISOBLASH
    let aheadCount = 0;
    const playerTotalCp = (this.lap - 1) * this.checkpoints.length + this.currentCheckpointIdx;
    this.aiBots.forEach(bot => {
      const botTotalCp = (bot.lap - 1) * this.checkpoints.length + bot.currentCp;
      if (botTotalCp > playerTotalCp) aheadCount++;
    });
    this.position = 1 + aheadCount;
  }

  updateCheckpointHighlight() {
    this.checkpointMeshes.forEach((mesh, idx) => {
      const isTarget = idx === this.currentCheckpointIdx;
      mesh.visible = isTarget || idx === (this.currentCheckpointIdx + 1) % this.checkpoints.length;
      if (mesh.children[0]) {
        mesh.children[0].material.color.setHex(isTarget ? 0x22c55e : 0x00f0ff);
        mesh.children[0].material.opacity = isTarget ? 0.95 : 0.4;
      }
    });
  }

  cleanup() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.checkpointMeshes = [];
    this.aiBots = [];
    this.trackBarriers = [];
    if (this.navArrow) this.navArrow.visible = false;
  }
}
