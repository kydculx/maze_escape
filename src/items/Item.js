import * as THREE from 'three';

/**
 * 미로 내 수집 가능한 아이템 클래스
 */
export class Item {
    constructor(type, config, visualConfig) {
        this.type = type;
        this.config = config; // 전역 ITEMS 설정
        this.visual = visualConfig; // KEY, GEM 등 세부 설정

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
            case 'MAP': {
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
            case 'HAMMER': {
                // 워해머 스타일
                const hamGroup = new THREE.Group();

                // 1. 손잡이 (가죽 감긴 느낌)
                const handleGeo = new THREE.CylinderGeometry(scale * 0.15, scale * 0.2, scale * 2.5, 8);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
                const handle = new THREE.Mesh(handleGeo, handleMat);
                handle.castShadow = true;
                hamGroup.add(handle);

                // 손잡이 장식 (링)
                const gripGeo = new THREE.TorusGeometry(scale * 0.18, scale * 0.05, 4, 8);
                const gripMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
                const grip1 = new THREE.Mesh(gripGeo, gripMat); grip1.position.y = -scale * 0.8; hamGroup.add(grip1);
                const grip2 = new THREE.Mesh(gripGeo, gripMat); grip2.position.y = -scale * 1.0; hamGroup.add(grip2);

                // 2. 헤드 (육중한 금속)
                const headGroup = new THREE.Group();
                headGroup.position.y = scale * 1.0;

                // 중앙 블록
                const coreGeo = new THREE.BoxGeometry(scale * 0.6, scale * 0.8, scale * 0.6);
                const metalMat = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: 0.9,
                    roughness: 0.2
                });
                const core = new THREE.Mesh(coreGeo, metalMat);
                core.castShadow = true;
                headGroup.add(core);

                // 타격부 (양쪽)
                const faceGeo = new THREE.CylinderGeometry(scale * 0.5, scale * 0.5, scale * 0.4, 8);
                faceGeo.rotateZ(Math.PI / 2);

                const leftFace = new THREE.Mesh(faceGeo, metalMat);
                leftFace.position.x = -scale * 0.5;
                headGroup.add(leftFace);

                const rightFace = new THREE.Mesh(faceGeo, metalMat);
                rightFace.position.x = scale * 0.5;
                headGroup.add(rightFace);

                hamGroup.add(headGroup);

                // 3. 배치 각도 수정
                hamGroup.rotation.z = -Math.PI / 3;
                return hamGroup;
            }
            case 'TRAP': {
                // 곰 덫 (Bear Trap) 스타일
                const trapGroup = new THREE.Group();

                // 1. 베이스 판
                const baseGeo = new THREE.CylinderGeometry(scale * 1.2, scale * 1.2, scale * 0.1, 16);
                const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.5 });
                const base = new THREE.Mesh(baseGeo, metalMat);
                base.castShadow = true;
                trapGroup.add(base);

                // 2. 이빨 (Jaws) - 반쯤 열린 상태
                const jawGeo = new THREE.TorusGeometry(scale * 1.0, scale * 0.1, 8, 16, Math.PI);
                const toothMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });

                const leftJaw = new THREE.Mesh(jawGeo, toothMat);
                leftJaw.rotation.x = -Math.PI / 4; // 약간 위로
                leftJaw.rotation.z = Math.PI / 2;
                trapGroup.add(leftJaw);

                const rightJaw = new THREE.Mesh(jawGeo, toothMat);
                rightJaw.rotation.x = Math.PI / 4; // 약간 위로
                rightJaw.rotation.z = -Math.PI / 2;
                trapGroup.add(rightJaw);

                // 3. 중앙 압력판 (트리거)
                const triggerGeo = new THREE.CylinderGeometry(scale * 0.4, scale * 0.4, scale * 0.15, 8);
                const triggerMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x330000 });
                const trigger = new THREE.Mesh(triggerGeo, triggerMat);
                trigger.position.y = scale * 0.05;
                trapGroup.add(trigger);

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
                // 레이더 장비
                const sensorGroup = new THREE.Group();

                // 1. 삼각대 다리
                const legGeo = new THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale * 1.5, 8);
                const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

                for (let i = 0; i < 3; i++) {
                    const leg = new THREE.Mesh(legGeo, legMat);
                    const angle = (i / 3) * Math.PI * 2;
                    leg.position.y = scale * 0.5;
                    leg.rotation.z = 0.5; // 벌어짐
                    leg.rotation.y = angle;
                    // 위치 보정
                    leg.position.x = Math.cos(angle) * scale * 0.5;
                    leg.position.z = Math.sin(angle) * scale * 0.5;
                    sensorGroup.add(leg);
                }

                // 2. 본체 박스
                const bodyGeo = new THREE.BoxGeometry(scale * 0.8, scale * 0.5, scale * 0.8);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.position.y = scale * 1.2;
                sensorGroup.add(body);

                // 3. 회전하는 접시 (안테나)
                const dishGroup = new THREE.Group();
                dishGroup.position.y = scale * 1.5;

                const dishGeo = new THREE.ConeGeometry(scale * 0.8, scale * 0.4, 16, 1, true);
                const dishMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
                const dish = new THREE.Mesh(dishGeo, dishMat);
                dish.rotation.x = -Math.PI / 2; // 앞을 보게
                dishGroup.add(dish);

                // 안테나 침
                const pinGeo = new THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale * 1.0, 8);
                const pinMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const pin = new THREE.Mesh(pinGeo, pinMat);
                pin.rotation.x = -Math.PI / 2;
                pin.position.z = scale * 0.5;
                dishGroup.add(pin);

                sensorGroup.add(dishGroup);
                return sensorGroup;
            }
            case 'ZOMBIE_DISGUISE': {
                // 가면 (Mask) - 곡면 형태 🎭
                const maskGroup = new THREE.Group();

                // 1. 가면 본체 (원통의 일부를 잘라서 사용)
                // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
                const maskGeo = new THREE.CylinderGeometry(
                    scale * 1.0, scale * 0.9, scale * 1.5,
                    32, 1, true,
                    0, Math.PI // 반원 (180도)
                );
                const maskMat = new THREE.MeshStandardMaterial({
                    color: 0x55aa55, // 썩은 녹색
                    roughness: 0.6,
                    side: THREE.DoubleSide
                });
                const mask = new THREE.Mesh(maskGeo, maskMat);
                mask.rotation.y = -Math.PI / 2; // 볼록한 부분이 앞으로 오게
                maskGroup.add(mask);

                // 2. 눈구멍 (검은색 원)
                const eyeGeo = new THREE.CircleGeometry(scale * 0.25, 16);
                const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

                const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
                leftEye.position.set(-scale * 0.4, scale * 0.2, scale * 0.95);
                // 곡면에 맞춰 약간 회전 (선택 사항이나 평면이라도 괜찮음)
                leftEye.rotation.y = -0.3;
                maskGroup.add(leftEye);

                const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
                rightEye.position.set(scale * 0.4, scale * 0.2, scale * 0.95);
                rightEye.rotation.y = 0.3;
                maskGroup.add(rightEye);

                // 3. 끈 (뒤쪽)
                const strapGeo = new THREE.TorusGeometry(scale * 0.95, scale * 0.05, 8, 32, Math.PI);
                const strapMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
                const strap = new THREE.Mesh(strapGeo, strapMat);
                strap.rotation.y = Math.PI / 2; // 뒤쪽 반원
                strap.rotation.z = Math.PI / 2; // 수평으로
                maskGroup.add(strap);

                return maskGroup;
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
