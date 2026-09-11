// ============================================================================
// FORZA HORIZON UZ - ULTRA-REALISTIC 3D CAR GENERATOR & PBR BUILDER (THREE.JS)
// Fotorealistik metallik bo'yoq, akslanishlar, LED optika, tormoz disklari va detallar
// ============================================================================

export class CarBuilder {
  constructor(THREE) {
    this.THREE = THREE;
    this.textures = this.generateProceduralTextures();
  }

  generateProceduralTextures() {
    const THREE = this.THREE;

    // 1. Karbon tola teksturasi (Carbon Fiber Weave)
    const carbonCanvas = document.createElement("canvas");
    carbonCanvas.width = 64;
    carbonCanvas.height = 64;
    const cctx = carbonCanvas.getContext("2d");
    cctx.fillStyle = "#161616";
    cctx.fillRect(0, 0, 64, 64);
    cctx.fillStyle = "#262626";
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        if ((x / 8 + y / 8) % 2 === 0) {
          cctx.fillRect(x, y, 8, 8);
        }
      }
    }
    const carbonTexture = new THREE.CanvasTexture(carbonCanvas);
    carbonTexture.wrapS = THREE.RepeatWrapping;
    carbonTexture.wrapT = THREE.RepeatWrapping;
    carbonTexture.repeat.set(8, 8);

    // 2. Teshikli sport tormoz diski teksturasi (Drilled Brake Rotor)
    const rotorCanvas = document.createElement("canvas");
    rotorCanvas.width = 128;
    rotorCanvas.height = 128;
    const rctx = rotorCanvas.getContext("2d");
    rctx.fillStyle = "#b0b0b0";
    rctx.fillRect(0, 0, 128, 128);
    // Konsentrik aylanalar va teshiklar
    rctx.fillStyle = "#333333";
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      for (let r = 25; r < 55; r += 10) {
        const hx = 64 + Math.cos(a + r * 0.05) * r;
        const hy = 64 + Math.sin(a + r * 0.05) * r;
        rctx.beginPath();
        rctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        rctx.fill();
      }
    }
    const rotorTexture = new THREE.CanvasTexture(rotorCanvas);

    // 3. O'zbekiston Davlat Raqami ("01 | 777 AAA")
    const plateCanvas = document.createElement("canvas");
    plateCanvas.width = 128;
    plateCanvas.height = 32;
    const pctx = plateCanvas.getContext("2d");
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 128, 32);
    pctx.lineWidth = 2;
    pctx.strokeStyle = "#111111";
    pctx.strokeRect(2, 2, 124, 28);
    // Chap tomondagi viloyat kodi (01 - Toshkent)
    pctx.fillStyle = "#111111";
    pctx.font = "bold 16px monospace";
    pctx.fillText("01", 6, 22);
    pctx.fillRect(32, 4, 2, 24);
    // Raqam va seriya
    pctx.font = "bold 17px sans-serif";
    pctx.fillText("777 AAA", 40, 22);
    // O'zbekiston bayrog'i belgisi
    pctx.fillStyle = "#0099b5";
    pctx.fillRect(116, 6, 8, 6);
    pctx.fillStyle = "#ce1126";
    pctx.fillRect(116, 12, 8, 2);
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(116, 14, 8, 4);
    pctx.fillStyle = "#ce1126";
    pctx.fillRect(116, 18, 8, 2);
    pctx.fillStyle = "#1eb53a";
    pctx.fillRect(116, 20, 8, 6);
    const plateTexture = new THREE.CanvasTexture(plateCanvas);

    // 4. LED Optika Kristall Faralar teksturasi
    const hlCanvas = document.createElement("canvas");
    hlCanvas.width = 128;
    hlCanvas.height = 64;
    const hlctx = hlCanvas.getContext("2d");
    hlctx.fillStyle = "#111111";
    hlctx.fillRect(0, 0, 128, 64);
    hlctx.strokeStyle = "#00f0ff";
    hlctx.lineWidth = 4;
    // DRL Halo halqasi
    hlctx.beginPath();
    hlctx.arc(40, 32, 20, 0, Math.PI * 2);
    hlctx.stroke();
    hlctx.beginPath();
    hlctx.arc(90, 32, 16, 0, Math.PI * 2);
    hlctx.stroke();
    const hlTexture = new THREE.CanvasTexture(hlCanvas);

    return { carbonTexture, rotorTexture, plateTexture, hlTexture };
  }

  buildCar(carData, tuning = {}) {
    const THREE = this.THREE;
    const car = new THREE.Group();
    car.name = `car_${carData.id}`;

    const dim = carData.dimensions || { length: 4.5, width: 1.8, height: 1.4 };
    const L = dim.length;
    const W = dim.width;
    const H = dim.height;
    const bType = carData.bodyType || "sedan";

    // Tyuning parametrlari
    const bodyColor = tuning.color || carData.color || "#ffffff";
    const headlightHex = tuning.headlightColor || "#ffffff";
    const rimType = tuning.rimId || "sport5";
    const rimColorHex = tuning.rimColor || "#1a1a1a";
    const spoilerType = tuning.spoilerId || "none";
    const doorStyle = tuning.doorStyle || "normal";
    const neonHex = tuning.neonColor || null;
    const windowTint = tuning.windowTint !== undefined ? tuning.windowTint : 0.45;
    const suspensionOffset = (tuning.suspension || 0) * 0.08;

    // Fotorealistik PBR Bo'yoq (Forza Horizon avto-lak effekti)
    const paintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(bodyColor),
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      envMapIntensity: 2.0
    });

    // Karbon tola materiali
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      map: this.textures.carbonTexture,
      roughness: 0.35,
      metalness: 0.8
    });

    // Qoraytirilgan oyna
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      roughness: 0.05,
      metalness: 0.95,
      transmission: 0.65 - windowTint * 0.5,
      transparent: true,
      opacity: 0.55 + windowTint * 0.4,
      reflectivity: 1.0
    });

    // Xrom detal materiali
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.05
    });

    const darkTrim = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 0.7,
      metalness: 0.2
    });

    const groundClearance = 0.35 + suspensionOffset;
    const chassisGroup = new THREE.Group();
    chassisGroup.name = "chassis";

    // 1. ASOSIY KORPUS VA AERODINAMIK KONTURLAR
    let lowerBodyGeo, upperCabinGeo;
    if (bType === "van") {
      lowerBodyGeo = new THREE.BoxGeometry(W, H * 0.52, L);
      upperCabinGeo = new THREE.BoxGeometry(W * 0.96, H * 0.55, L * 0.9);
    } else if (bType === "hatchback") {
      lowerBodyGeo = new THREE.BoxGeometry(W, H * 0.46, L);
      upperCabinGeo = new THREE.BoxGeometry(W * 0.9, H * 0.46, L * 0.65);
    } else if (bType === "suv") {
      lowerBodyGeo = new THREE.BoxGeometry(W, H * 0.52, L);
      upperCabinGeo = new THREE.BoxGeometry(W * 0.94, H * 0.48, L * 0.72);
    } else if (bType === "hypercar") {
      lowerBodyGeo = new THREE.BoxGeometry(W * 1.06, H * 0.36, L);
      upperCabinGeo = new THREE.BoxGeometry(W * 0.76, H * 0.38, L * 0.52);
    } else {
      lowerBodyGeo = new THREE.BoxGeometry(W, H * 0.44, L);
      upperCabinGeo = new THREE.BoxGeometry(W * 0.88, H * 0.44, L * 0.6);
    }

    const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMaterial);
    lowerBody.position.y = groundClearance + H * 0.23;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    chassisGroup.add(lowerBody);

    // Aerodinamik old splitter (Front Carbon Splitter)
    const splitterGeo = new THREE.BoxGeometry(W * 1.02, 0.05, 0.4);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, groundClearance + 0.04, L * 0.5 + 0.1);
    chassisGroup.add(splitter);

    // Yon yubkalar (Side Skirts)
    [-1, 1].forEach(side => {
      const skirtGeo = new THREE.BoxGeometry(0.08, 0.08, L * 0.75);
      const skirt = new THREE.Mesh(skirtGeo, carbonMaterial);
      skirt.position.set(side * (W * 0.5 + 0.02), groundClearance + 0.04, 0);
      chassisGroup.add(skirt);
    });

    // Orqa diffuzor va sport glushitellar
    const diffuserGeo = new THREE.BoxGeometry(W * 0.9, 0.18, 0.35);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, groundClearance + 0.1, -L * 0.5 - 0.08);
    chassisGroup.add(diffuser);

    // Kabina
    const cabin = new THREE.Mesh(upperCabinGeo, paintMaterial);
    const cabinZOffset = bType === "van" ? -L * 0.02 : (bType === "hypercar" ? -L * 0.05 : -L * 0.08);
    cabin.position.set(0, groundClearance + H * 0.62, cabinZOffset);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    chassisGroup.add(cabin);

    // Yon ko'zgular (Side Mirrors)
    [-1, 1].forEach(side => {
      const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), darkTrim);
      mirrorArm.position.set(side * (W * 0.48), cabin.position.y - 0.1, cabin.position.z + L * 0.18);
      const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), paintMaterial);
      mirrorCap.position.set(side * 0.08, 0.03, 0);
      mirrorArm.add(mirrorCap);
      chassisGroup.add(mirrorArm);
    });

    // Oynalar (Old, orqa, yon)
    this.addWindows(chassisGroup, W, H, L, bType, cabin.position, glassMaterial);

    // Salon & Interyer (Rul, torpedo, sport o'rindiqlar)
    this.addInterior(chassisGroup, W, H, L, groundClearance, cabin.position);

    // Radiator panjarasi (Front Grille)
    const grillGeo = new THREE.BoxGeometry(W * 0.65, H * 0.22, 0.08);
    const grill = new THREE.Mesh(grillGeo, darkTrim);
    grill.position.set(0, groundClearance + H * 0.22, L * 0.5 + 0.03);
    chassisGroup.add(grill);

    // O'zbekiston Davlat Raqami (Oldi va orqada)
    const plateMat = new THREE.MeshBasicMaterial({ map: this.textures.plateTexture });
    const frontPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), plateMat);
    frontPlate.position.set(0, groundClearance + 0.16, L * 0.5 + 0.08);
    chassisGroup.add(frontPlate);

    const rearPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), plateMat);
    rearPlate.position.set(0, groundClearance + 0.28, -L * 0.5 - 0.08);
    rearPlate.rotation.y = Math.PI;
    chassisGroup.add(rearPlate);

    // 2. YUQORI ANIQLIKDAGI KRISTALL FARALAR (HEADLIGHTS)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(headlightHex),
      emissive: new THREE.Color(headlightHex),
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.9,
      map: this.textures.hlTexture
    });

    const hlGeo = new THREE.BoxGeometry(W * 0.22, H * 0.14, 0.12);
    const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
    hlLeft.position.set(-W * 0.35, groundClearance + H * 0.3, L * 0.5 + 0.03);
    const hlRight = new THREE.Mesh(hlGeo, headlightMat);
    hlRight.position.set(W * 0.35, groundClearance + H * 0.3, L * 0.5 + 0.03);
    chassisGroup.add(hlLeft);
    chassisGroup.add(hlRight);

    // 3D Yorug'lik nurlari (Spotlights on road)
    const leftSpot = new THREE.SpotLight(new THREE.Color(headlightHex), 3.0, 55, Math.PI / 5.5, 0.4, 1.2);
    leftSpot.position.set(-W * 0.35, groundClearance + H * 0.3, L * 0.5);
    const leftTarget = new THREE.Object3D();
    leftTarget.position.set(-W * 0.35, groundClearance, L * 0.5 + 28);
    chassisGroup.add(leftTarget);
    leftSpot.target = leftTarget;

    const rightSpot = new THREE.SpotLight(new THREE.Color(headlightHex), 3.0, 55, Math.PI / 5.5, 0.4, 1.2);
    rightSpot.position.set(W * 0.35, groundClearance + H * 0.3, L * 0.5);
    const rightTarget = new THREE.Object3D();
    rightTarget.position.set(W * 0.35, groundClearance, L * 0.5 + 28);
    chassisGroup.add(rightTarget);
    rightSpot.target = rightTarget;

    chassisGroup.add(leftSpot);
    chassisGroup.add(rightSpot);

    // 3. ORQA CHIROQLAR (TAILLIGHTS)
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff0022,
      emissive: 0xbb0011,
      emissiveIntensity: 1.2,
      roughness: 0.15
    });
    const tlGeo = new THREE.BoxGeometry(W * 0.25, H * 0.12, 0.08);
    const tlLeft = new THREE.Mesh(tlGeo, tlMat);
    tlLeft.position.set(-W * 0.34, groundClearance + H * 0.3, -L * 0.5 - 0.03);
    const tlRight = new THREE.Mesh(tlGeo, tlMat);
    tlRight.position.set(W * 0.34, groundClearance + H * 0.3, -L * 0.5 - 0.03);
    chassisGroup.add(tlLeft);
    chassisGroup.add(tlRight);

    // 4. BURILISH CHIROQLARI (TURN SIGNALS)
    const turnMat = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.2
    });
    const turnGeo = new THREE.BoxGeometry(0.12, 0.06, 0.06);
    const turnFL = new THREE.Mesh(turnGeo, turnMat.clone());
    turnFL.position.set(-W * 0.48, groundClearance + H * 0.3, L * 0.48);
    const turnFR = new THREE.Mesh(turnGeo, turnMat.clone());
    turnFR.position.set(W * 0.48, groundClearance + H * 0.3, L * 0.48);
    const turnRL = new THREE.Mesh(turnGeo, turnMat.clone());
    turnRL.position.set(-W * 0.48, groundClearance + H * 0.3, -L * 0.48);
    const turnRR = new THREE.Mesh(turnGeo, turnMat.clone());
    turnRR.position.set(W * 0.48, groundClearance + H * 0.3, -L * 0.48);

    chassisGroup.add(turnFL);
    chassisGroup.add(turnFR);
    chassisGroup.add(turnRL);
    chassisGroup.add(turnRR);

    // 5. OYNA TOZALAGICHLAR (WIPERS)
    const wiperGroup = this.addWipers(chassisGroup, W, H, L, groundClearance, cabin.position);

    // 6. ESHIKLAR (Lambo / Scissor / Gullwing)
    const doors = this.addDoors(chassisGroup, W, H, L, groundClearance, paintMaterial, doorStyle);

    // 7. SPOYLER
    if (spoilerType !== "none") {
      this.addSpoiler(chassisGroup, W, H, L, groundClearance, spoilerType, carbonMaterial);
    }

    // 8. NEON TAG YORITGICHLAR
    let neonLights = [];
    if (neonHex) {
      neonLights = this.addNeon(chassisGroup, W, L, groundClearance, neonHex);
    }

    // 9. NITRO ALANGA GLUSHITELLAR
    const nitroFlames = this.addExhaust(chassisGroup, W, H, L, groundClearance);

    car.add(chassisGroup);

    // 10. SPORT DISKLAR VA SHINALAR (4 G'ILDIRAK)
    const wheels = this.addWheels(car, W, L, groundClearance, rimType, rimColorHex, bType, this.textures.rotorTexture);

    // User data biriktirish
    car.userData = {
      id: carData.id,
      chassis: chassisGroup,
      wheels: wheels,
      doors: doors,
      doorStyle: doorStyle,
      doorsOpen: false,
      wiperGroup: wiperGroup,
      wipersActive: false,
      wiperAngle: 0,
      wiperDirection: 1,
      headlights: [hlLeft, hlRight],
      spotlights: [leftSpot, rightSpot],
      headlightsOn: true,
      taillights: [tlLeft, tlRight],
      turnFrontLeft: turnFL,
      turnFrontRight: turnFR,
      turnRearLeft: turnRL,
      turnRearRight: turnRR,
      neonLights: neonLights,
      nitroFlames: nitroFlames,
      steeringWheel: chassisGroup.getObjectByName("steering_wheel"),
      paintMaterial: paintMaterial,
      headlightMat: headlightMat,
      bType: bType,
      specs: carData
    };

    return car;
  }

  addWindows(parent, W, H, L, bType, cabinPos, glassMat) {
    const THREE = this.THREE;

    // Old oynasi
    const wsGeo = new THREE.PlaneGeometry(W * 0.84, H * 0.4);
    const ws = new THREE.Mesh(wsGeo, glassMat);
    ws.position.set(0, cabinPos.y, cabinPos.z + (bType === "van" ? L * 0.45 : L * 0.32));
    ws.rotation.x = bType === "van" ? -Math.PI * 0.08 : -Math.PI * 0.25;
    parent.add(ws);

    // Orqa oynasi
    const rwGeo = new THREE.PlaneGeometry(W * 0.82, H * 0.36);
    const rw = new THREE.Mesh(rwGeo, glassMat);
    rw.position.set(0, cabinPos.y, cabinPos.z - (bType === "van" ? L * 0.44 : L * 0.3));
    rw.rotation.x = bType === "van" ? Math.PI * 0.02 : Math.PI * 0.22;
    rw.rotation.y = Math.PI;
    parent.add(rw);

    // Yon oynalar
    [-1, 1].forEach(side => {
      const swGeo = new THREE.PlaneGeometry(bType === "van" ? L * 0.8 : L * 0.54, H * 0.3);
      const sw = new THREE.Mesh(swGeo, glassMat);
      sw.position.set(side * W * 0.45, cabinPos.y + 0.02, cabinPos.z);
      sw.rotation.y = side * Math.PI * 0.5;
      parent.add(sw);
    });
  }

  addInterior(parent, W, H, L, groundClearance, cabinPos) {
    const THREE = this.THREE;
    const interiorGroup = new THREE.Group();
    interiorGroup.name = "interior";

    const dashMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.85 });
    const stitchMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });

    // Torpedo
    const dash = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.2, 0.38), dashMat);
    dash.position.set(0, cabinPos.y - 0.08, cabinPos.z + 0.32);
    interiorGroup.add(dash);

    // Rul
    const wheelGroup = new THREE.Group();
    wheelGroup.name = "steering_wheel";
    wheelGroup.position.set(-W * 0.22, cabinPos.y - 0.02, cabinPos.z + 0.18);
    wheelGroup.rotation.x = -Math.PI * 0.22;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 12, 28), stitchMat);
    wheelGroup.add(ring);
    const center = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), dashMat);
    center.rotation.x = Math.PI * 0.5;
    wheelGroup.add(center);
    interiorGroup.add(wheelGroup);

    // O'rindiqlar
    [-1, 1].forEach(side => {
      const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.44), seatMat);
      bottom.position.set(side * W * 0.22, groundClearance + 0.18, cabinPos.z - 0.05);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.52, 0.12), seatMat);
      back.position.set(side * W * 0.22, groundClearance + 0.46, cabinPos.z - 0.25);
      back.rotation.x = -Math.PI * 0.07;

      interiorGroup.add(bottom);
      interiorGroup.add(back);
    });

    parent.add(interiorGroup);
  }

  addWipers(parent, W, H, L, groundClearance, cabinPos) {
    const THREE = this.THREE;
    const wiperGroup = new THREE.Group();
    wiperGroup.name = "wipers";
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    [-1, 1].forEach((side, idx) => {
      const pivot = new THREE.Group();
      pivot.name = `wiper_pivot_${idx}`;
      pivot.position.set(side * 0.25, cabinPos.y - 0.13, cabinPos.z + 0.46);
      pivot.rotation.x = -Math.PI * 0.25;

      const bladeGeo = new THREE.BoxGeometry(0.015, 0.3, 0.015);
      bladeGeo.translate(0, 0.15, 0);
      const blade = new THREE.Mesh(bladeGeo, wiperMat);
      pivot.add(blade);
      wiperGroup.add(pivot);
    });

    parent.add(wiperGroup);
    return wiperGroup;
  }

  addDoors(parent, W, H, L, groundClearance, paintMat, style) {
    const THREE = this.THREE;
    const doors = { left: null, right: null, style: style };
    const doorGeo = new THREE.BoxGeometry(0.06, H * 0.4, L * 0.4);

    const leftPivot = new THREE.Group();
    leftPivot.position.set(-W * 0.45, groundClearance + H * 0.26, L * 0.1);
    const leftMesh = new THREE.Mesh(doorGeo, paintMat);
    leftMesh.position.set(0, 0, -L * 0.2);
    leftPivot.add(leftMesh);
    parent.add(leftPivot);
    doors.left = leftPivot;

    const rightPivot = new THREE.Group();
    rightPivot.position.set(W * 0.45, groundClearance + H * 0.26, L * 0.1);
    const rightMesh = new THREE.Mesh(doorGeo, paintMat);
    rightMesh.position.set(0, 0, -L * 0.2);
    rightPivot.add(rightMesh);
    parent.add(rightPivot);
    doors.right = rightPivot;

    return doors;
  }

  addSpoiler(parent, W, H, L, groundClearance, type, carbonMat) {
    const THREE = this.THREE;
    const spoilerGroup = new THREE.Group();
    spoilerGroup.name = "spoiler";

    if (type === "ducktail") {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.08, 0.2), carbonMat);
      wing.position.set(0, groundClearance + H * 0.48, -L * 0.47);
      wing.rotation.x = -Math.PI * 0.14;
      spoilerGroup.add(wing);
    } else {
      const isMassive = type === "massive";
      const hMult = isMassive ? 1.5 : 1.0;

      [-1, 1].forEach(side => {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28 * hMult, 0.14), carbonMat);
        stand.position.set(side * W * 0.3, groundClearance + H * 0.46 + 0.14 * hMult, -L * 0.45);
        spoilerGroup.add(stand);
      });

      const blade = new THREE.Mesh(new THREE.BoxGeometry(W * (isMassive ? 1.12 : 0.92), 0.04, 0.28), carbonMat);
      blade.position.set(0, groundClearance + H * 0.46 + 0.28 * hMult, -L * 0.48);
      blade.rotation.x = -Math.PI * 0.09;
      spoilerGroup.add(blade);
    }

    parent.add(spoilerGroup);
  }

  addNeon(parent, W, L, groundClearance, hex) {
    const THREE = this.THREE;
    const lights = [];
    const color = new THREE.Color(hex);

    [-0.35, 0.35].forEach(x => {
      [-0.45, 0.45].forEach(z => {
        const pLight = new THREE.PointLight(color, 2.5, 4.0);
        pLight.position.set(x * W, groundClearance * 0.4, z * L);
        parent.add(pLight);
        lights.push(pLight);
      });
    });

    const neonPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.85, L * 0.85),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 })
    );
    neonPlane.rotation.x = -Math.PI * 0.5;
    neonPlane.position.y = 0.04;
    parent.add(neonPlane);

    return lights;
  }

  addExhaust(parent, W, H, L, groundClearance) {
    const THREE = this.THREE;
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.95, roughness: 0.1 });
    const flames = [];

    [-0.22, 0.22].forEach(side => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.14, 16), pipeMat);
      pipe.rotation.x = Math.PI * 0.5;
      pipe.position.set(side * W * 0.44, groundClearance + 0.09, -L * 0.5 - 0.05);
      parent.add(pipe);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.4, 12),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0 })
      );
      flame.rotation.x = -Math.PI * 0.5;
      flame.position.set(side * W * 0.44, groundClearance + 0.09, -L * 0.5 - 0.22);
      parent.add(flame);
      flames.push(flame);
    });

    return flames;
  }

  addWheels(parent, W, L, groundClearance, rimType, rimColorHex, bType, rotorTexture) {
    const THREE = this.THREE;
    const wheelRadius = bType === "suv" ? 0.43 : (bType === "hypercar" ? 0.35 : 0.37);
    const wheelWidth = bType === "hypercar" ? 0.34 : 0.26;

    // Kauchuk protektorli shina
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.88,
      metalness: 0.08
    });

    // Yaltiroq diska
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(rimColorHex),
      metalness: 0.95,
      roughness: 0.2,
      clearcoat: 0.8
    });

    // Perforatsiyalangan sport tormoz diski
    const rotorMat = new THREE.MeshStandardMaterial({
      map: rotorTexture,
      metalness: 0.9,
      roughness: 0.3
    });

    // Qizil Brembo support
    const caliperMat = new THREE.MeshPhysicalMaterial({
      color: 0xd90429,
      metalness: 0.7,
      roughness: 0.25,
      clearcoat: 0.9
    });

    const wheelPositions = [
      { name: "FL", x: -W * 0.53, z: L * 0.32, steer: true },
      { name: "FR", x: W * 0.53, z: L * 0.32, steer: true },
      { name: "RL", x: -W * 0.53, z: -L * 0.32, steer: false },
      { name: "RR", x: W * 0.53, z: -L * 0.32, steer: false }
    ];

    const wheelsObj = { FL: null, FR: null, RL: null, RR: null, steerNodes: [] };

    wheelPositions.forEach(pos => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(pos.x, wheelRadius, pos.z);

      const spinGroup = new THREE.Group();
      spinGroup.name = `wheel_spin_${pos.name}`;

      // Shina
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 28);
      tireGeo.rotateZ(Math.PI * 0.5);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      spinGroup.add(tire);

      // Diska
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.76, wheelRadius * 0.76, wheelWidth * 1.02, 20);
      rimGeo.rotateZ(Math.PI * 0.5);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      spinGroup.add(rim);

      // 5-Spoke yoki BBS detallari
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(wheelWidth * 1.03, wheelRadius * 0.68, 0.04), rimMat);
        spoke.rotation.x = (i * Math.PI * 2) / 5;
        spinGroup.add(spoke);
      }

      // Tormoz diski (Rotor)
      const rotorGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.02, 20);
      rotorGeo.rotateZ(Math.PI * 0.5);
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.x = pos.x < 0 ? 0.04 : -0.04;
      spinGroup.add(rotor);

      // Brembo Caliper (Aylanmaydi, g'ildirak burilishi bilan birga turadi)
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(wheelWidth * 0.45, wheelRadius * 0.38, 0.1), caliperMat);
      caliper.position.set(pos.x < 0 ? 0.05 : -0.05, wheelRadius * 0.32, 0);
      steerPivot.add(caliper);

      steerPivot.add(spinGroup);
      parent.add(steerPivot);

      wheelsObj[pos.name] = spinGroup;
      if (pos.steer) {
        wheelsObj.steerNodes.push(steerPivot);
      }
    });

    return wheelsObj;
  }

  toggleDoors(car, open) {
    const userData = car.userData;
    if (!userData || !userData.doors) return false;

    userData.doorsOpen = open !== undefined ? open : !userData.doorsOpen;
    const isOpening = userData.doorsOpen;
    const style = userData.doorStyle || "normal";
    const left = userData.doors.left;
    const right = userData.doors.right;
    if (!left || !right) return false;

    if (style === "scissor") {
      const targetAngle = isOpening ? Math.PI * 0.42 : 0;
      left.rotation.z = targetAngle;
      right.rotation.z = -targetAngle;
      left.rotation.y = isOpening ? -Math.PI * 0.08 : 0;
      right.rotation.y = isOpening ? Math.PI * 0.08 : 0;
    } else if (style === "gullwing") {
      const targetAngle = isOpening ? Math.PI * 0.5 : 0;
      left.rotation.x = targetAngle;
      right.rotation.x = targetAngle;
      left.rotation.z = isOpening ? Math.PI * 0.18 : 0;
      right.rotation.z = isOpening ? -Math.PI * 0.18 : 0;
    } else {
      const targetAngle = isOpening ? -Math.PI * 0.38 : 0;
      left.rotation.y = targetAngle;
      right.rotation.y = -targetAngle;
      left.rotation.z = 0;
      right.rotation.z = 0;
    }

    return userData.doorsOpen;
  }
}
