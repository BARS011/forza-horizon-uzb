// ============================================================================
// FORZA HORIZON UZ - TRAFFIC & PEDESTRIAN AI (THREE.JS)
// Shahardagi AI mashinalar, piyodalar va svetoforlarga rioya qilish tizimi
// ============================================================================

export class TrafficManager {
  constructor(THREE, scene, cityMap) {
    this.THREE = THREE;
    this.scene = scene;
    this.cityMap = cityMap;
    this.trafficCars = [];
    this.pedestrians = [];
    this.numCars = 18;
    this.numPeds = 24;
    this.group = new THREE.Group();
    this.group.name = "traffic_group";
  }

  init() {
    this.spawnCars();
    this.spawnPedestrians();
    this.scene.add(this.group);
  }

  spawnCars() {
    const THREE = this.THREE;
    const colors = [0xffffff, 0x111111, 0x2563eb, 0xdc2626, 0x9ca3af, 0xeab308];
    const blockSize = 140;

    for (let i = 0; i < this.numCars; i++) {
      const carGroup = new THREE.Group();
      carGroup.name = `traffic_car_${i}`;

      const color = colors[i % colors.length];
      const paintMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

      // Kuzov
      const bodyGeo = new THREE.BoxGeometry(1.8, 0.9, 4.2);
      const body = new THREE.Mesh(bodyGeo, paintMat);
      body.position.y = 0.65;
      body.castShadow = true;
      carGroup.add(body);

      // Kabina
      const cabinGeo = new THREE.BoxGeometry(1.5, 0.7, 2.4);
      const cabin = new THREE.Mesh(cabinGeo, paintMat);
      cabin.position.set(0, 1.4, -0.2);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // G'ildiraklar
      [-0.95, 0.95].forEach(x => {
        [-1.3, 1.3].forEach(z => {
          const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12);
          wGeo.rotateZ(Math.PI * 0.5);
          const wheel = new THREE.Mesh(wGeo, darkMat);
          wheel.position.set(x, 0.35, z);
          carGroup.add(wheel);
        });
      });

      // Faralar
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
      const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), hlMat);
      hl1.position.set(-0.6, 0.7, 2.12);
      const hl2 = hl1.clone();
      hl2.position.set(0.6, 0.7, 2.12);
      carGroup.add(hl1);
      carGroup.add(hl2);

      // Tasodifiy yo'lga joylashtirish (X yoki Z yo'nalishida)
      const axis = i % 2 === 0 ? "X" : "Z";
      const laneOffset = (i % 4 < 2 ? 4.5 : -4.5); // O'ng yoki chap qator
      const blockIndex = ((i % 5) - 2) * blockSize;

      let posX = 0, posZ = 0, rotY = 0;
      if (axis === "X") {
        posX = -400 + Math.random() * 800;
        posZ = blockIndex + laneOffset;
        rotY = laneOffset > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      } else {
        posX = blockIndex + laneOffset;
        posZ = -400 + Math.random() * 800;
        rotY = laneOffset > 0 ? 0 : Math.PI;
      }

      carGroup.position.set(posX, 0, posZ);
      carGroup.rotation.y = rotY;

      this.group.add(carGroup);

      const carData = {
        mesh: carGroup,
        speed: 8 + Math.random() * 6, // 30-50 km/h
        axis: axis,
        laneOffset: laneOffset,
        direction: (laneOffset > 0 ? 1 : -1),
        radius: 2.2
      };

      this.trafficCars.push(carData);
      this.cityMap.colliders.push(carData);
    }
  }

  spawnPedestrians() {
    const THREE = this.THREE;
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.8 });
    const shirtColors = [0xef4444, 0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b];
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

    for (let i = 0; i < this.numPeds; i++) {
      const pedGroup = new THREE.Group();
      pedGroup.name = `pedestrian_${i}`;

      const shirtMat = new THREE.MeshStandardMaterial({
        color: shirtColors[i % shirtColors.length],
        roughness: 0.7
      });

      // Bosh
      const headGeo = new THREE.SphereGeometry(0.18, 10, 10);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.62;
      pedGroup.add(head);

      // Tana (Torso)
      const torsoGeo = new THREE.BoxGeometry(0.38, 0.55, 0.22);
      const torso = new THREE.Mesh(torsoGeo, shirtMat);
      torso.position.y = 1.15;
      pedGroup.add(torso);

      // Oyoqlar (Legs with animation pivot)
      const legGeo = new THREE.BoxGeometry(0.14, 0.65, 0.14);
      legGeo.translate(0, -0.32, 0);

      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.11, 0.7, 0);
      pedGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.11, 0.7, 0);
      pedGroup.add(rightLeg);

      // Joylashtirish: piyodalar yo'lkasida yoki chorraha yaqinida
      const pX = -200 + Math.random() * 400;
      const pZ = -200 + Math.random() * 400;
      pedGroup.position.set(pX, 0, pZ);

      this.group.add(pedGroup);

      this.pedestrians.push({
        mesh: pedGroup,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        speed: 1.2 + Math.random() * 0.6,
        walkCycle: Math.random() * Math.PI * 2,
        direction: Math.random() * Math.PI * 2,
        changeDirTimer: 3 + Math.random() * 5
      });
    }
  }

  update(delta, playerCarPos) {
    // 1. AI MASHINALAR HARAKATI VA SVETOFORGA TO'XTASH
    this.trafficCars.forEach(car => {
      let isStopping = false;

      // Yaqin chorrahadagi svetofor qizil ekanligini tekshirish
      for (const tl of this.cityMap.trafficLights) {
        const dx = car.mesh.position.x - tl.intersection.x;
        const dz = car.mesh.position.z - tl.intersection.z;
        const distToCenter = Math.sqrt(dx * dx + dz * dz);

        // Agar chorrahaga 15-25 metr qolgan bo'lsa va svetofor qizil bo'lsa to'xtaydi
        if (distToCenter < 24 && distToCenter > 8) {
          if (tl.state === "RED" || tl.state === "YELLOW") {
            isStopping = true;
            break;
          }
        }
      }

      // O'yinchi mashinasi oldida bo'lsa to'xtash
      if (playerCarPos) {
        const pdx = playerCarPos.x - car.mesh.position.x;
        const pdz = playerCarPos.z - car.mesh.position.z;
        const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
        if (pDist < 9) {
          isStopping = true;
        }
      }

      if (!isStopping) {
        const moveDist = car.speed * delta * car.direction;
        if (car.axis === "X") {
          car.mesh.position.x += moveDist;
          if (car.mesh.position.x > 550) car.mesh.position.x = -550;
          if (car.mesh.position.x < -550) car.mesh.position.x = 550;
        } else {
          car.mesh.position.z += moveDist;
          if (car.mesh.position.z > 550) car.mesh.position.z = -550;
          if (car.mesh.position.z < -550) car.mesh.position.z = 550;
        }
      }
    });

    // 2. PIYODALAR QADAM BOSISH ANIMATSIYASI
    this.pedestrians.forEach(ped => {
      ped.walkCycle += delta * 6;
      ped.leftLeg.rotation.x = Math.sin(ped.walkCycle) * 0.6;
      ped.rightLeg.rotation.x = -Math.sin(ped.walkCycle) * 0.6;

      ped.mesh.position.x += Math.sin(ped.direction) * ped.speed * delta;
      ped.mesh.position.z += Math.cos(ped.direction) * ped.speed * delta;
      ped.mesh.rotation.y = ped.direction;

      ped.changeDirTimer -= delta;
      if (ped.changeDirTimer <= 0) {
        ped.direction += (Math.random() - 0.5) * Math.PI * 0.8;
        ped.changeDirTimer = 4 + Math.random() * 6;
      }
    });
  }
}
