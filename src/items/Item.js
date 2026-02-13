import * as THREE from 'three';

/**
 * 미로 내 수집 가능한 아이템 클래스
 */
export class Item {
    constructor(type, config, visualConfig) {
        this.type = type;
        this.config = config; // 전역 ITEMS 설정
        this.visual = visualConfig; // KEY, GEM 등 세부 설정
        this.metadata = {}; // 추가 데이터 (예: 지도 조각의 영역 인덱스)

        this.group = new THREE.Group();
        this.mesh = this._createMesh();
        this.group.add(this.mesh);

        // 애니메이션용 변수
        this.baseY = 0.4; // 바닥에서 확실히 띄움
        this.elapsedTime = 0; // 누적 시간
        this.animationOffset = Math.random() * Math.PI * 2;
        this.group.position.y = this.baseY;
    }

    _createMesh() {
        let geo, mat;
        const color = this.visual.COLOR;
        const scale = this.visual.SCALE;

        switch (this.type) {
            case 'JUMP': {
                // 스프링 모양 (Coiled Spring) ➰
                const springGroup = new THREE.Group();

                // 나선형 튜브 생성
                const path = new THREE.Curve();
                path.getPoint = function (t) {
                    const r = scale * 0.5; // 반지름
                    const h = scale * 2.0; // 높이
                    const turns = 4; // 회전 수
                    const angle = t * Math.PI * 2 * turns;
                    const x = r * Math.cos(angle);
                    const z = r * Math.sin(angle);
                    const y = (t - 0.5) * h;
                    return new THREE.Vector3(x, y, z);
                };

                const tubeGeo = new THREE.TubeGeometry(path, 64, scale * 0.1, 8, false);
                const tubeMat = new THREE.MeshStandardMaterial({
                    color: 0xffff00,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0x444400
                });
                const spring = new THREE.Mesh(tubeGeo, tubeMat);
                spring.castShadow = true;
                springGroup.add(spring);

                // 양 끝단 마개
                const capGeo = new THREE.SphereGeometry(scale * 0.1, 8, 8);
                const capTop = new THREE.Mesh(capGeo, tubeMat);
                const startPt = path.getPoint(0);
                capTop.position.copy(startPt);

                const capBottom = new THREE.Mesh(capGeo, tubeMat);
                const endPt = path.getPoint(1);
                capBottom.position.copy(endPt);

                springGroup.add(capTop);
                springGroup.add(capBottom);

                return springGroup;
            }
            case 'FLASHLIGHT': {
                // 디테일한 손전등
                const group = new THREE.Group();

                // 1. 몸통 (그립감 있는 텍스처 느낌)
                const bodyGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.5, 16);
                const bodyMat = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    metalness: 0.7,
                    roughness: 0.4
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.rotation.z = Math.PI / 2;
                body.castShadow = true;
                group.add(body);

                // 2. 그립 링 (장식)
                const ringGeo = new THREE.TorusGeometry(scale * 0.32, scale * 0.03, 8, 16);
                const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
                for (let i = 0; i < 3; i++) {
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.y = Math.PI / 2;
                    ring.position.x = -scale * 0.3 + (i * scale * 0.3);
                    group.add(ring);
                }

                // 3. 헤드 (곡선형)
                const headPoints = [];
                headPoints.push(new THREE.Vector2(0, 0));
                headPoints.push(new THREE.Vector2(0.3 * scale, 0));
                headPoints.push(new THREE.Vector2(0.6 * scale, 0.5 * scale)); // 넓어지는 부분
                headPoints.push(new THREE.Vector2(0.6 * scale, 0.8 * scale)); // 렌즈 앞부분
                headPoints.push(new THREE.Vector2(0, 0.8 * scale)); // 닫기

                const headGeo = new THREE.LatheGeometry(headPoints, 16);
                const headMat = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const head = new THREE.Mesh(headGeo, headMat);
                head.rotation.z = -Math.PI / 2;
                head.position.x = scale * 0.75; // 몸통 끝에 연결
                head.castShadow = true;
                group.add(head);

                // 4. 스위치 버튼
                const btnGeo = new THREE.BoxGeometry(scale * 0.2, scale * 0.1, scale * 0.15);
                const btnMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
                const btn = new THREE.Mesh(btnGeo, btnMat);
                btn.position.set(0, scale * 0.3, 0);
                group.add(btn);

                // 5. 렌즈 (빛나는 부분)
                const lensGeo = new THREE.CircleGeometry(scale * 0.55, 16);
                const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
                const lens = new THREE.Mesh(lensGeo, lensMat);
                lens.rotation.y = Math.PI / 2;
                lens.position.x = scale * 0.75 + scale * 0.8; // 헤드 길이만큼
                group.add(lens);

                return group;
            }
            case 'MAP_PIECE': {
                // 고대 두루마리 지도 조각 (기존 MAP 모델 재사용 또는 약간 변형)
                const mapGroup = new THREE.Group();

                // 말린 종이 본체
                const scrollGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.5, 16);
                const scrollMat = new THREE.MeshStandardMaterial({
                    color: 0xf5deb3,
                    roughness: 0.9
                });
                const scroll = new THREE.Mesh(scrollGeo, scrollMat);
                scroll.rotation.z = Math.PI / 2;
                scroll.castShadow = true;
                mapGroup.add(scroll);

                // 붉은 끈 (한쪽에만 묶음)
                const ribbonGeo = new THREE.TorusGeometry(scale * 0.31, scale * 0.05, 8, 32);
                const ribbonMat = new THREE.MeshStandardMaterial({
                    color: 0xcc0000,
                    roughness: 0.4
                });
                const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbon.rotation.y = Math.PI / 2;
                ribbon.position.x = scale * 0.4;
                ribbon.castShadow = true;
                mapGroup.add(ribbon);

                return mapGroup;
            }
            case 'MAP': { // 레거시 지원용 (기존 MAP 아이템 로직이 남아있을 경우 대비)
                // 고대 두루마리 지도
                const mapGroup = new THREE.Group();

                // 말린 종이 본체
                const scrollGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 2.0, 16);
                const scrollMat = new THREE.MeshStandardMaterial({
                    color: 0xf5deb3,
                    roughness: 0.9,
                    map: null // 텍스처가 있다면 좋겠지만 컬러로 대체
                });
                const scroll = new THREE.Mesh(scrollGeo, scrollMat);
                scroll.rotation.z = Math.PI / 2;
                scroll.castShadow = true;
                mapGroup.add(scroll);

                // 종이 끝부분 (속이 빈 느낌)
                const innerGeo = new THREE.CylinderGeometry(scale * 0.1, scale * 0.1, scale * 2.02, 16);
                const innerMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // 어두운 안쪽
                const inner = new THREE.Mesh(innerGeo, innerMat);
                inner.rotation.z = Math.PI / 2;
                mapGroup.add(inner);

                // 붉은 리본 (가운데 묶음)
                const ribbonGeo = new THREE.TorusGeometry(scale * 0.31, scale * 0.08, 8, 32);
                const ribbonMat = new THREE.MeshStandardMaterial({
                    color: 0xcc0000,
                    roughness: 0.4,
                    emissive: 0x330000
                });
                const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbon.rotation.y = Math.PI / 2;
                ribbon.castShadow = true;
                mapGroup.add(ribbon);

                // 리본 매듭
                const knotGeo = new THREE.SphereGeometry(scale * 0.15, 8, 8);
                const knot = new THREE.Mesh(knotGeo, ribbonMat);
                knot.position.set(0, scale * 0.35, 0);
                mapGroup.add(knot);

                return mapGroup;
            }
            case 'TRAP': {
                // 초정밀 곰 덫 (Bear Trap) 모델
                const trapGroup = new THREE.Group();

                // 1. 원형 프레임 (금속 고리 2개)
                const rimGeo = new THREE.TorusGeometry(scale * 1.1, scale * 0.05, 8, 24);
                const metalMat = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.9,
                    roughness: 0.2
                });

                const rim1 = new THREE.Mesh(rimGeo, metalMat);
                rim1.rotation.x = Math.PI / 2;
                trapGroup.add(rim1);

                // 2. 톱니 이빨 (Jaws) - 반쯤 열린 상태
                const jawGeo = new THREE.TorusGeometry(scale * 1.05, scale * 0.06, 8, 24, Math.PI);
                const jawMat = new THREE.MeshStandardMaterial({
                    color: 0x777777,
                    metalness: 1.0,
                    roughness: 0.1
                });

                const leftJaw = new THREE.Mesh(jawGeo, jawMat);
                leftJaw.rotation.x = -Math.PI / 4;
                leftJaw.rotation.z = Math.PI / 2;
                trapGroup.add(leftJaw);

                const rightJaw = new THREE.Mesh(jawGeo, jawMat);
                rightJaw.rotation.x = Math.PI / 4;
                rightJaw.rotation.z = -Math.PI / 2;
                trapGroup.add(rightJaw);

                // 톱니 이빨들 (작은 원뿔형)
                const toothGeo = new THREE.ConeGeometry(scale * 0.05, scale * 0.2, 4);
                const toothMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 1.0 });

                for (let i = 0; i < 8; i++) {
                    const angle = (i / 7) * Math.PI;
                    // 왼쪽 이빨
                    const tL = new THREE.Mesh(toothGeo, toothMat);
                    tL.position.set(
                        Math.cos(angle) * scale * 1.05,
                        Math.sin(angle) * scale * 1.05,
                        0
                    );
                    tL.rotation.z = angle - Math.PI / 2;
                    leftJaw.add(tL);

                    // 오른쪽 이빨
                    const tR = new THREE.Mesh(toothGeo, toothMat);
                    tR.position.set(
                        Math.cos(angle) * scale * 1.05,
                        Math.sin(angle) * scale * 1.05,
                        0
                    );
                    tR.rotation.z = angle - Math.PI / 2;
                    rightJaw.add(tR);
                }

                // 3. 중앙 압력판 (트리거)
                const plateGeo = new THREE.CylinderGeometry(scale * 0.5, scale * 0.5, scale * 0.05, 16);
                const plateMat = new THREE.MeshStandardMaterial({
                    color: 0xff0000,
                    emissive: 0x220000,
                    roughness: 0.8
                });
                const plate = new THREE.Mesh(plateGeo, plateMat);
                plate.position.y = 0;
                trapGroup.add(plate);

                // 4. 스프링 및 기계 장치 (양옆)
                const springGeo = new THREE.CylinderGeometry(scale * 0.12, scale * 0.12, scale * 0.4, 8);
                const springMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });

                const spring1 = new THREE.Mesh(springGeo, springMat);
                spring1.rotation.z = Math.PI / 2;
                spring1.position.set(scale * 1.15, 0, 0);
                trapGroup.add(spring1);

                const spring2 = new THREE.Mesh(springGeo, springMat);
                spring2.rotation.z = Math.PI / 2;
                spring2.position.set(-scale * 1.15, 0, 0);
                trapGroup.add(spring2);

                return trapGroup;
            }
            case 'TELEPORT': {
                // 신비한 룬 스톤 (Runestones)
                const portalGroup = new THREE.Group();

                // 중앙 에너지 구체
                const coreGeo = new THREE.IcosahedronGeometry(scale * 0.6, 1);
                const coreMat = new THREE.MeshStandardMaterial({
                    color: 0xaa00ff,
                    emissive: 0x8800ff,
                    emissiveIntensity: 2.0,
                    flatShading: true,
                    transparent: true,
                    opacity: 0.9
                });
                const core = new THREE.Mesh(coreGeo, coreMat);
                portalGroup.add(core);

                // 궤도 도는 돌들
                const stoneGeo = new THREE.BoxGeometry(scale * 0.3, scale * 0.3, scale * 0.3);
                const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.2 });

                for (let i = 0; i < 3; i++) {
                    const stone = new THREE.Mesh(stoneGeo, stoneMat);
                    // 위치는 update에서 애니메이션으로 처리하겠지만 초기 배치
                    const angle = (i / 3) * Math.PI * 2;
                    stone.position.set(Math.cos(angle) * scale * 1.5, 0, Math.sin(angle) * scale * 1.5);
                    portalGroup.add(stone);

                    // 돌마다 랜덤 회전
                    stone.rotation.set(Math.random(), Math.random(), Math.random());
                }

                return portalGroup;
            }
            case 'SENSOR': {
                // 휴대용 고성능 음파 탐지기 (Portable Handheld Sonar) 모델 📡
                const sensorGroup = new THREE.Group();

                // 1. 단말기 본체 (세로형 직사각형 몸체)
                const bodyGeo = new THREE.BoxGeometry(scale * 1.2, scale * 1.8, scale * 0.4);
                const bodyMat = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    metalness: 0.7,
                    roughness: 0.3
                });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = scale * 1.2;
                sensorGroup.add(body);

                // 2. 손잡이 (Handle/Grip)
                const handleGeo = new THREE.CylinderGeometry(scale * 0.15, scale * 0.15, scale * 0.8, 12);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
                const handle = new THREE.Mesh(handleGeo, handleMat);
                handle.position.y = scale * 0.4;
                sensorGroup.add(handle);

                // 3. 전면부 원형 소나 화면 (Radar Screen)
                const screenGroup = new THREE.Group();
                screenGroup.position.set(0, scale * 1.4, scale * 0.21); // 본체 전면에 부착

                const screenRimGeo = new THREE.TorusGeometry(scale * 0.45, scale * 0.05, 8, 24);
                const screenRimMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
                const screenRim = new THREE.Mesh(screenRimGeo, screenRimMat);
                screenGroup.add(screenRim);

                const screenGeo = new THREE.CircleGeometry(scale * 0.45, 24);
                const screenMat = new THREE.MeshStandardMaterial({
                    color: 0x00ffff,
                    emissive: 0x004444,
                    transparent: true,
                    opacity: 0.8
                });
                const screen = new THREE.Mesh(screenGeo, screenMat);
                screenGroup.add(screen);

                // 화면 위 스캔 라인 (Glowing Line)
                const lineGeo = new THREE.BoxGeometry(scale * 0.85, scale * 0.02, scale * 0.01);
                const lineMat = new THREE.BasicMaterial ? new THREE.MeshBasicMaterial({ color: 0x00ffff }) : new THREE.MeshBasicMaterial({ color: 0x00ffff });
                const scanLine = new THREE.Mesh(lineGeo, lineMat);
                scanLine.rotation.z = Math.PI / 4;
                screenGroup.add(scanLine);

                sensorGroup.add(screenGroup);

                // 4. 상단 수신 헤드 (Acoustic Head)
                const headGeo = new THREE.SphereGeometry(scale * 0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
                const head = new THREE.Mesh(headGeo, headMat);
                head.position.y = scale * 2.1;
                sensorGroup.add(head);

                // 5. 측면 상태 LED 및 버튼
                const ledGeo = new THREE.SphereGeometry(scale * 0.05, 8, 8);
                const ledMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                for (let i = 0; i < 3; i++) {
                    const led = new THREE.Mesh(ledGeo, ledMat);
                    led.position.set(scale * 0.61, scale * (1.6 - i * 0.3), 0);
                    sensorGroup.add(led);
                }

                return sensorGroup;
            }
            case 'ZOMBIE_DISGUISE': {
                // 초정밀 좀비 가면 (Zombie Disguise Mask) 모델 🧟
                const maskGroup = new THREE.Group();

                // 1. 가면 본체 (더 입체적인 곡면 형태)
                const maskBodyGeo = new THREE.CylinderGeometry(
                    scale * 1.0, scale * 0.8, scale * 1.6,
                    32, 1, true,
                    0, Math.PI
                );
                const maskMat = new THREE.MeshStandardMaterial({
                    color: 0x667755, // 창백한 녹가루색
                    roughness: 0.8,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                const mask = new THREE.Mesh(maskBodyGeo, maskMat);
                mask.rotation.y = -Math.PI / 2;
                maskGroup.add(mask);

                // 2. 눈구멍 & 그림자 (깊이감 부여)
                const eyeSocketGeo = new THREE.SphereGeometry(scale * 0.35, 16, 8);
                const socketMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });

                const leftSocket = new THREE.Mesh(eyeSocketGeo, socketMat);
                leftSocket.scale.set(1, 0.8, 0.4);
                leftSocket.position.set(-scale * 0.45, scale * 0.25, scale * 0.7);
                maskGroup.add(leftSocket);

                const rightSocket = new THREE.Mesh(eyeSocketGeo, socketMat);
                rightSocket.scale.set(1, 0.8, 0.4);
                rightSocket.position.set(scale * 0.45, scale * 0.25, scale * 0.7);
                maskGroup.add(rightSocket);

                // 3. 눈동자 (빛나는 노란색/빨간색)
                const pupilGeo = new THREE.SphereGeometry(scale * 0.1, 8, 8);
                const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 }); // 노랑 안광

                const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
                leftPupil.position.set(-scale * 0.45, scale * 0.25, scale * 0.85);
                maskGroup.add(leftPupil);

                const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
                rightPupil.position.set(scale * 0.45, scale * 0.25, scale * 0.85);
                maskGroup.add(rightPupil);

                // 4. 코 부분 (약간의 돌출)
                const noseGeo = new THREE.BoxGeometry(scale * 0.15, scale * 0.4, scale * 0.2);
                const nose = new THREE.Mesh(noseGeo, maskMat);
                nose.position.set(0, scale * 0.05, scale * 0.95);
                maskGroup.add(nose);

                // 5. 입/턱 부분 (갈라진 턱 및 구멍)
                const mouthGeo = new THREE.BoxGeometry(scale * 0.7, scale * 0.1, scale * 0.1);
                const mouthMat = new THREE.MeshStandardMaterial({ color: 0x221111 }); // 어두운 입 안
                const mouth = new THREE.Mesh(mouthGeo, mouthMat);
                mouth.position.set(0, -scale * 0.4, scale * 0.85);
                maskGroup.add(mouth);

                return maskGroup;
            }
            case 'C4': {
                // 초정밀 C4 폭탄 모델 (Dropped 아이템 버전)
                const c4Group = new THREE.Group();

                // 1. 베이스 플레이트 (검은색 금속판)
                const baseGeo = new THREE.BoxGeometry(scale * 1.8, scale * 1.2, scale * 0.1);
                const baseMat = new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    metalness: 0.8,
                    roughness: 0.2
                });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.castShadow = true;
                c4Group.add(base);

                // 2. C4 폭약 블록 (3개, 베이지색/회색)
                const packGeo = new THREE.BoxGeometry(scale * 0.45, scale * 0.9, scale * 0.3);
                const packMat = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    roughness: 0.9
                });

                for (let i = 0; i < 3; i++) {
                    const pack = new THREE.Mesh(packGeo, packMat);
                    pack.position.set(scale * (-0.6 + i * 0.6), 0, scale * 0.2);
                    c4Group.add(pack);
                }

                // 3. 타이머 유닛 (중앙)
                const timerGeo = new THREE.BoxGeometry(scale * 0.8, scale * 0.4, scale * 0.2);
                const timerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                const timer = new THREE.Mesh(timerGeo, timerMat);
                timer.position.set(0, 0, scale * 0.4);
                c4Group.add(timer);

                // 타이머 스크린
                const screenGeo = new THREE.PlaneGeometry(scale * 0.6, scale * 0.2);
                const screenMat = new THREE.MeshStandardMaterial({
                    color: 0x330000,
                    emissive: 0xaa0000,
                    emissiveIntensity: 0.5
                });
                const screen = new THREE.Mesh(screenGeo, screenMat);
                screen.position.set(0, 0, scale * 0.11);
                timer.add(screen);

                // 4. 전선 (빨강, 파랑)
                const wireGeo = new THREE.BoxGeometry(scale * 0.05, scale * 0.8, scale * 0.05);
                const redWireMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const blueWireMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });

                const wire1 = new THREE.Mesh(wireGeo, redWireMat);
                wire1.position.set(-scale * 0.4, 0, scale * 0.35);
                wire1.rotation.z = Math.PI / 4;
                c4Group.add(wire1);

                const wire2 = new THREE.Mesh(wireGeo, blueWireMat);
                wire2.position.set(scale * 0.4, 0, scale * 0.35);
                wire2.rotation.z = -Math.PI / 4;
                c4Group.add(wire2);

                // 5. 램프 (아이템은 고정형 램프)
                const lampGeo = new THREE.SphereGeometry(scale * 0.1, 8, 8);
                const lampMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const lamp = new THREE.Mesh(lampGeo, lampMat);
                lamp.position.set(scale * 0.3, scale * 0.1, scale * 0.51);
                c4Group.add(lamp);

                return c4Group;
            }
            default:
                geo = new THREE.BoxGeometry(scale, scale, scale);
                mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        return mesh;
    }

    update(deltaTime) {
        this.elapsedTime += deltaTime;

        // 1. 회전 애니메이션
        this.mesh.rotation.y += 1.2 * deltaTime;
        this.mesh.rotation.z += 0.6 * deltaTime;

        // 2. 부유 애니메이션 (Bobbing)
        const t = this.elapsedTime + this.animationOffset;
        this.group.position.y = this.baseY + Math.sin(t * 2) * 0.08;
    }

    dispose() {
        this.group.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
