// ============================================================================
// FORZA HORIZON UZ - REALISTIC 3D CITY ENVIRONMENT & TEXTURED ROADS
// Haqiqiy donador asfalt teksturasi, bordyurlar, osmono'parlar va yoritish
// ============================================================================

export class CityMap {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.colliders = [];
    this.garages = [];
    this.trafficLights = [];
    this.intersections = [];
    this.mapSize = 1400;
    this.cityGroup = new THREE.Group();
    this.cityGroup.name = "city_map";

    this.textures = this.generateCityTextures();
  }

  generateCityTextures() {
    const THREE = this.THREE;

    // 1. Donador Asfalt Teksturasi (Grainy Road Texture)
    const asphaltCanvas = document.createElement("canvas");
    asphaltCanvas.width = 256;
    asphaltCanvas.height = 256;
    const actx = asphaltCanvas.getContext("2d");
    actx.fillStyle = "#22262e";
    actx.fillRect(0, 0, 256, 256);
    // Donador toshchalar
    for (let i = 0; i < 6000; i++) {
      const gX = Math.random() * 256;
      const gY = Math.random() * 256;
      const shade = Math.floor(25 + Math.random() * 35);
      actx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 7})`;
      actx.fillRect(gX, gY, 1.8, 1.8);
    }
    const asphaltTexture = new THREE.CanvasTexture(asphaltCanvas);
    asphaltTexture.wrapS = THREE.RepeatWrapping;
    asphaltTexture.wrapT = THREE.RepeatWrapping;
    asphaltTexture.repeat.set(16, 16);

    // 2. Sariq/Qora Poyga Bordyurlari (Racing Curbs)
    const curbCanvas = document.createElement("canvas");
    curbCanvas.width = 128;
    curbCanvas.height = 32;
    const cctx = curbCanvas.getContext("2d");
    for (let x = 0; x < 128; x += 32) {
      cctx.fillStyle = (x / 32) % 2 === 0 ? "#ef4444" : "#ffffff";
      cctx.fillRect(x, 0, 32, 32);
    }
    const curbTexture = new THREE.CanvasTexture(curbCanvas);
    curbTexture.wrapS = THREE.RepeatWrapping;
    curbTexture.wrapT = THREE.RepeatWrapping;
    curbTexture.repeat.set(10, 1);

    // 3. Shisha Osmono'par Oynalari (Glass Skyscraper Facade)
    const bldgCanvas = document.createElement("canvas");
    bldgCanvas.width = 256;
    bldgCanvas.height = 256;
    const bctx = bldgCanvas.getContext("2d");
    bctx.fillStyle = "#0f172a";
    bctx.fillRect(0, 0, 256, 256);
    // Yoniq va o'chiq ofis oynalari
    for (let bx = 6; bx < 250; bx += 18) {
      for (let by = 6; by < 250; by += 24) {
        const isLit = Math.random() > 0.4;
        bctx.fillStyle = isLit ? "#fef08a" : "#1e293b";
        bctx.fillRect(bx, by, 12, 16);
      }
    }
    const bldgTexture = new THREE.CanvasTexture(bldgCanvas);
    bldgTexture.wrapS = THREE.RepeatWrapping;
    bldgTexture.wrapT = THREE.RepeatWrapping;

    return { asphaltTexture, curbTexture, bldgTexture };
  }

  build() {
    this.buildTerrainAndRoads();
    this.buildBuildings();
    this.buildParks();
    this.buildGarages();
    this.buildTrafficLights();
    this.buildStreetLamps();
    this.scene.add(this.cityGroup);
  }

  buildTerrainAndRoads() {
    const THREE = this.THREE;

    // Asosiy zamin (Ground)
    const groundGeo = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.95,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.receiveShadow = true;
    this.cityGroup.add(ground);

    const roadWidth = 26;
    const blockSize = 140;
    const numBlocks = 6;

    // Fotorealistik Asfalt materiali (PBR lak va donadorlik)
    const roadMat = new THREE.MeshPhysicalMaterial({
      map: this.textures.asphaltTexture,
      color: 0x3b4252,
      roughness: 0.45,
      metalness: 0.35,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2
    });

    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    for (let i = -numBlocks; i <= numBlocks; i++) {
      const coord = i * blockSize;

      // X yo'l
      const roadX = new THREE.Mesh(new THREE.PlaneGeometry(this.mapSize, roadWidth), roadMat);
      roadX.rotation.x = -Math.PI * 0.5;
      roadX.position.set(0, 0.02, coord);
      roadX.receiveShadow = true;
      this.cityGroup.add(roadX);

      // Z yo'l
      const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, this.mapSize), roadMat);
      roadZ.rotation.x = -Math.PI * 0.5;
      roadZ.position.set(coord, 0.02, 0);
      roadZ.receiveShadow = true;
      this.cityGroup.add(roadZ);

      // Sariq chiziqlar
      for (let s = -this.mapSize / 2; s < this.mapSize / 2; s += 22) {
        const strX = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.4), yellowLineMat);
        strX.rotation.x = -Math.PI * 0.5;
        strX.position.set(s, 0.04, coord);
        this.cityGroup.add(strX);

        const strZ = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.4), yellowLineMat);
        strZ.rotation.x = -Math.PI * 0.5;
        strZ.rotation.z = Math.PI * 0.5;
        strZ.position.set(coord, 0.04, s);
        this.cityGroup.add(strZ);
      }

      for (let j = -numBlocks; j <= numBlocks; j++) {
        this.intersections.push({ x: i * blockSize, z: j * blockSize });
      }
    }

    // Piyodalar o'tish yo'laklari (Zebra crossings)
    this.intersections.forEach(inter => {
      const offsets = [
        { x: 0, z: roadWidth * 0.82, rot: 0 },
        { x: 0, z: -roadWidth * 0.82, rot: 0 },
        { x: roadWidth * 0.82, z: 0, rot: Math.PI * 0.5 },
        { x: -roadWidth * 0.82, z: 0, rot: Math.PI * 0.5 }
      ];

      offsets.forEach(off => {
        for (let stripe = -9; stripe <= 9; stripe += 2.2) {
          const zMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(off.rot === 0 ? 1.4 : 5.2, off.rot === 0 ? 5.2 : 1.4),
            whiteLineMat
          );
          zMesh.rotation.x = -Math.PI * 0.5;
          zMesh.position.set(
            inter.x + off.x + (off.rot === 0 ? stripe : 0),
            0.05,
            inter.z + off.z + (off.rot !== 0 ? stripe : 0)
          );
          this.cityGroup.add(zMesh);
        }
      });
    });
  }

  buildBuildings() {
    const THREE = this.THREE;
    const blockSize = 140;
    const roadWidth = 26;
    const buildableSize = blockSize - roadWidth - 10;
    const numBlocks = 5;

    // Osmono'par teksturali materiallar
    const glassBuildingMat = new THREE.MeshStandardMaterial({
      map: this.textures.bldgTexture,
      roughness: 0.15,
      metalness: 0.85
    });

    const modernWhite = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.3
    });

    const cyberDark = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.6
    });

    for (let i = -numBlocks; i <= numBlocks; i++) {
      for (let j = -numBlocks; j <= numBlocks; j++) {
        if (i === 0 && j === 0) continue;
        if (i === 1 && j === 0) continue;

        const blockCenterX = i * blockSize + blockSize * 0.5;
        const blockCenterZ = j * blockSize + blockSize * 0.5;

        const subPositions = [
          { dx: -buildableSize * 0.25, dz: -buildableSize * 0.25 },
          { dx: buildableSize * 0.25, dz: -buildableSize * 0.25 },
          { dx: -buildableSize * 0.25, dz: buildableSize * 0.25 },
          { dx: buildableSize * 0.25, dz: buildableSize * 0.25 }
        ];

        subPositions.forEach((sp, bIdx) => {
          const bx = blockCenterX + sp.dx;
          const bz = blockCenterZ + sp.dz;
          const distFromCenter = Math.hypot(bx, bz);

          let bHeight = 40 + Math.random() * 85;
          if (distFromCenter < 260) {
            bHeight = 110 + Math.random() * 150;
          }

          const bWidth = 36 + Math.random() * 14;
          const bDepth = 36 + Math.random() * 14;
          const mat = bIdx % 2 === 0 ? glassBuildingMat : (bIdx === 1 ? modernWhite : cyberDark);

          const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
          const bMesh = new THREE.Mesh(bGeo, mat);
          bMesh.position.set(bx, bHeight * 0.5, bz);
          bMesh.castShadow = true;
          bMesh.receiveShadow = true;

          // Tomdagi neon mayoq (Roof beacon)
          if (bHeight > 90) {
            const ant = new THREE.Mesh(
              new THREE.CylinderGeometry(0.4, 0.4, 18),
              new THREE.MeshBasicMaterial({ color: 0xef4444 })
            );
            ant.position.set(0, bHeight * 0.5 + 9, 0);
            bMesh.add(ant);
          }

          this.cityGroup.add(bMesh);

          this.colliders.push({
            position: { x: bx, z: bz },
            radius: Math.max(bWidth, bDepth) * 0.55
          });
        });
      }
    }
  }

  buildParks() {
    const THREE = this.THREE;
    const parkX = 70;
    const parkZ = 70;
    const parkSize = 104;

    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(parkSize, parkSize),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 })
    );
    grass.rotation.x = -Math.PI * 0.5;
    grass.position.set(parkX, 0.06, parkZ);
    this.cityGroup.add(grass);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.65 });

    for (let t = 0; t < 38; t++) {
      const tx = parkX - 44 + Math.random() * 88;
      const tz = parkZ - 44 + Math.random() * 88;

      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4.5, 8), trunkMat);
      trunk.position.y = 2.25;
      trunk.castShadow = true;
      tree.add(trunk);

      [
        { r: 2.8, h: 4.0, y: 5.0 },
        { r: 2.2, h: 3.5, y: 7.2 },
        { r: 1.5, h: 2.8, y: 9.0 }
      ].forEach(layer => {
        const crown = new THREE.Mesh(new THREE.ConeGeometry(layer.r, layer.h, 8), foliageMat);
        crown.position.y = layer.y;
        crown.castShadow = true;
        tree.add(crown);
      });

      this.cityGroup.add(tree);
      this.colliders.push({ position: { x: tx, z: tz }, radius: 1.0 });
    }
  }

  buildGarages() {
    const THREE = this.THREE;
    const garagePositions = [
      { x: 140 + 70, z: 70, name: "Markaziy Tyuning Garaji" },
      { x: -140 - 70, z: 140 + 70, name: "G'arbiy Drift Garaji" },
      { x: 280 + 70, z: -140 - 70, name: "Sharqiy Giperkar Garaji" }
    ];

    garagePositions.forEach(gp => {
      const garageGroup = new THREE.Group();
      garageGroup.position.set(gp.x, 0, gp.z);

      const gMesh = new THREE.Mesh(
        new THREE.BoxGeometry(45, 14, 40),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
      );
      gMesh.position.y = 7;
      gMesh.castShadow = true;
      garageGroup.add(gMesh);

      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 9),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
      );
      door.position.set(0, 4.5, 20.05);
      garageGroup.add(door);

      // Neon yoritgich ustuni
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 0.4, 24),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.55 })
      );
      beacon.position.set(0, 0.2, 28);
      garageGroup.add(beacon);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 75, 16),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 })
      );
      beam.position.set(0, 37.5, 28);
      garageGroup.add(beam);

      this.cityGroup.add(garageGroup);
      this.colliders.push({ position: { x: gp.x, z: gp.z }, radius: 24 });
      this.garages.push({ position: { x: gp.x, z: gp.z + 28 }, radius: 9, name: gp.name });
    });
  }

  buildTrafficLights() {
    const THREE = this.THREE;
    const blockSize = 140;

    const selectedIntersections = [
      { x: 0, z: 0 },
      { x: blockSize, z: 0 },
      { x: -blockSize, z: 0 },
      { x: 0, z: blockSize },
      { x: 0, z: -blockSize }
    ];

    selectedIntersections.forEach((inter, idx) => {
      const tlData = {
        intersection: inter,
        state: "GREEN",
        timer: (idx * 4) % 15,
        meshes: []
      };

      const corners = [
        { dx: 14, dz: 14, rotY: 0 },
        { dx: -14, dz: 14, rotY: Math.PI * 0.5 },
        { dx: -14, dz: -14, rotY: Math.PI },
        { dx: 14, dz: -14, rotY: -Math.PI * 0.5 }
      ];

      corners.forEach(c => {
        const poleGroup = new THREE.Group();
        poleGroup.position.set(inter.x + c.dx, 0, inter.z + c.dz);
        poleGroup.rotation.y = c.rotY;

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 7.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7 })
        );
        pole.position.y = 3.75;
        poleGroup.add(pole);

        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 2.2, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x111827 })
        );
        box.position.set(0, 6.2, 0.6);
        poleGroup.add(box);

        const lightGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16);
        lightGeo.rotateX(Math.PI * 0.5);

        const redMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0x000000 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0x554400, emissive: 0x000000 });
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x005500, emissive: 0x00ff00, emissiveIntensity: 2.0 });

        const red = new THREE.Mesh(lightGeo, redMat);
        red.position.set(0, 6.8, 0.95);
        const yellow = new THREE.Mesh(lightGeo, yellowMat);
        yellow.position.set(0, 6.2, 0.95);
        const green = new THREE.Mesh(lightGeo, greenMat);
        green.position.set(0, 5.6, 0.95);

        poleGroup.add(red);
        poleGroup.add(yellow);
        poleGroup.add(green);

        this.cityGroup.add(poleGroup);
        tlData.meshes.push({ red, yellow, green, redMat, yellowMat, greenMat });
      });

      this.trafficLights.push(tlData);
    });
  }

  buildStreetLamps() {
    const THREE = this.THREE;
    const blockSize = 140;
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

    for (let x = -280; x <= 280; x += 70) {
      for (let z = -280; z <= 280; z += 70) {
        if (Math.abs(x % blockSize) < 15 || Math.abs(z % blockSize) < 15) continue;

        const lamp = new THREE.Group();
        lamp.position.set(x, 0, z);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), lampMat);
        post.position.y = 4.5;
        lamp.add(post);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
        bulb.position.set(0, 9, 1.2);
        lamp.add(bulb);

        this.cityGroup.add(lamp);
        this.colliders.push({ position: { x, z }, radius: 0.6 });
      }
    }
  }

  update(delta) {
    this.trafficLights.forEach(tl => {
      tl.timer += delta;
      const cycle = tl.timer % 23;
      let newState = "GREEN";
      if (cycle < 10) newState = "GREEN";
      else if (cycle < 13) newState = "YELLOW";
      else newState = "RED";

      if (newState !== tl.state) {
        tl.state = newState;
        tl.meshes.forEach(m => {
          m.redMat.emissive.setHex(newState === "RED" ? 0xff0000 : 0x000000);
          m.redMat.emissiveIntensity = newState === "RED" ? 2.5 : 0;

          m.yellowMat.emissive.setHex(newState === "YELLOW" ? 0xffbb00 : 0x000000);
          m.yellowMat.emissiveIntensity = newState === "YELLOW" ? 2.5 : 0;

          m.greenMat.emissive.setHex(newState === "GREEN" ? 0x00ff44 : 0x000000);
          m.greenMat.emissiveIntensity = newState === "GREEN" ? 2.5 : 0;
        });
      }
    });
  }

  checkGarageTrigger(playerPos) {
    for (const g of this.garages) {
      const dx = playerPos.x - g.position.x;
      const dz = playerPos.z - g.position.z;
      if (dx * dx + dz * dz < g.radius * g.radius) {
        return g;
      }
    }
    return null;
  }
}
