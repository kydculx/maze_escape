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
        this.baseY = 0.3; // 바닥에서 약간 띄움
        this.animationOffset = Math.random() * Math.PI * 2;
        this.group.position.y = this.baseY;
    }

    _createMesh() {
        let geo, mat;
        const color = this.visual.COLOR;
        const scale = this.visual.SCALE;

        switch (this.type) {
            case 'JUMP': {
                // 로켓 모양 (🚀)
                const rocketGroup = new THREE.Group();

                // 몸통
                const bodyGeo = new THREE.CylinderGeometry(scale * 0.5, scale * 0.5, scale * 2, 12);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.5 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.rotation.z = Math.PI / 4; // 45도 기울기
                rocketGroup.add(body);

                // 코 (빨강)
                const noseGeo = new THREE.ConeGeometry(scale * 0.5, scale * 0.8, 12);
                const noseMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const nose = new THREE.Mesh(noseGeo, noseMat);
                nose.position.y = scale; // 몸통 위
                // 회전 및 위치 조정 (몸통 기준)
                nose.rotation.z = Math.PI / 4;
                nose.position.set(scale * 0.7, scale * 0.7, 0);
                rocketGroup.add(nose);

                // 날개 (3개)
                const finGeo = new THREE.BoxGeometry(scale * 0.8, scale * 0.5, scale * 0.1);
                const finMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                for (let i = 0; i < 3; i++) {
                    const fin = new THREE.Mesh(finGeo, finMat);
                    fin.position.set(-scale * 0.5, -scale * 0.5, 0);
                    // 날개 배치 로직은 복잡하니 단순화: 몸통 하단에 박스 배치
                }
                // 심플 로켓: 몸통 + 코 + 창문
                const windowGeo = new THREE.CylinderGeometry(scale * 0.2, scale * 0.2, scale * 0.1, 8);
                const windowMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.5 });
                const win = new THREE.Mesh(windowGeo, windowMat);
                win.rotation.x = Math.PI / 2;
                win.position.set(0, 0, scale * 0.45); // 앞쪽으로 튀어나옴
                // 로켓 전체 회전 그룹에 추가하기 위해 별도 처리 대신 단순화

                // 다시 작성: 그룹 내에서 로컬 좌표로 조립
                rocketGroup.clear();

                // 로켓 컨테이너 (기울기 적용용)
                const rocket = new THREE.Group();
                rocket.rotation.z = Math.PI / 4;

                const rBody = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.4, scale * 0.4, scale * 1.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0xffffff })
                );
                rocket.add(rBody);

                const rNose = new THREE.Mesh(
                    new THREE.ConeGeometry(scale * 0.4, scale * 0.6, 12),
                    new THREE.MeshStandardMaterial({ color: 0xff0000 })
                );
                rNose.position.y = scale * 0.75 + scale * 0.3;
                rocket.add(rNose);

                const rFinGeo = new THREE.BoxGeometry(scale * 0.4, scale * 0.8, scale * 0.05);
                const rFinMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

                const fin1 = new THREE.Mesh(rFinGeo, rFinMat);
                fin1.position.set(0, -scale * 0.5, 0);
                fin1.rotation.y = 0;
                rocket.add(fin1);

                const fin2 = new THREE.Mesh(rFinGeo, rFinMat);
                fin2.position.set(0, -scale * 0.5, 0);
                fin2.rotation.y = Math.PI / 2;
                rocket.add(fin2);

                const rWin = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.15, scale * 0.15, scale * 0.45, 8),
                    new THREE.MeshStandardMaterial({ color: 0x00ffff })
                );
                rWin.rotation.x = Math.PI / 2;
                rWin.position.y = scale * 0.2;
                rocket.add(rWin);

                rocketGroup.add(rocket);
                return rocketGroup;
            }
            case 'FLASHLIGHT': {
                // 손전등 (검은 몸체 + 노란 렌즈)
                const group = new THREE.Group();
                // 몸통
                const body = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
                );
                body.rotation.z = Math.PI / 2;
                group.add(body);

                // 헤드 (약간 커짐)
                const head = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.5, scale * 0.3, scale * 0.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0x333333 })
                );
                head.rotation.z = Math.PI / 2;
                head.position.x = scale * 0.75 + scale * 0.25;
                group.add(head);

                // 렌즈 (발광)
                const lens = new THREE.Mesh(
                    new THREE.CircleGeometry(scale * 0.4, 12),
                    new THREE.MeshBasicMaterial({ color: 0xffffaa })
                );
                lens.rotation.y = Math.PI / 2;
                lens.position.x = scale * 1.0 + scale * 0.26;
                group.add(lens);

                return group;
            }
            case 'MAP': {
                // 지도 (돌돌 말린 종이 + 리본)
                const mapGroup = new THREE.Group();
                // 종이
                const scroll = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.8 })
                );
                scroll.rotation.z = Math.PI / 2;
                mapGroup.add(scroll);

                // 리본 (빨강)
                const band = new THREE.Mesh(
                    new THREE.TorusGeometry(scale * 0.31, scale * 0.05, 8, 16),
                    new THREE.MeshStandardMaterial({ color: 0xff0000 })
                );
                band.rotation.y = Math.PI / 2;
                mapGroup.add(band);
                return mapGroup;
            }
            case 'HAMMER': {
                // 망치 (나무 손잡이 + 묵직한 쇠머리)
                const hamGroup = new THREE.Group();
                // 손잡이
                const handle = new THREE.Mesh(
                    new THREE.CylinderGeometry(scale * 0.15, scale * 0.15, scale * 1.8, 8),
                    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
                );
                hamGroup.add(handle);

                // 머리 (Box)
                const head = new THREE.Mesh(
                    new THREE.BoxGeometry(scale * 1.2, scale * 0.6, scale * 0.6),
                    new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6, roughness: 0.3 })
                );
                head.position.y = scale * 0.7;
                hamGroup.add(head);

                // 회전 (아이콘처럼 비스듬히)
                hamGroup.rotation.z = -Math.PI / 4;
                return hamGroup;
            }
            case 'TRAP': {
                // 거미줄 모양 (🕸️)
                const webGroup = new THREE.Group();

                // 방사형 선 (십자 + 대각선)
                const lineGeo = new THREE.BoxGeometry(scale * 2.5, scale * 0.05, scale * 0.05);
                const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

                for (let i = 0; i < 4; i++) {
                    const line = new THREE.Mesh(lineGeo, lineMat);
                    line.rotation.y = (Math.PI / 4) * i;
                    webGroup.add(line);
                }

                // 동심원 (고리)
                const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
                for (let i = 1; i <= 3; i++) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(scale * 0.4 * i, scale * 0.03, 4, 16),
                        ringMat
                    );
                    ring.rotation.x = Math.PI / 2;
                    webGroup.add(ring);
                }

                // 바닥에 눕히기
                // webGroup.rotation.x = -Math.PI / 2; // 이미 Torus가 누워있고 Box는 y축 회전함 -> Box는 서있는 상태?
                // BoxGeometry 기본은 x,y,z. rotation.y 하면 수평면상에서 회전.
                // 하지만 현재 아이템은 공중에 떠서 돔. 
                // 거미줄은 수직으로 세우는게 아이콘처럼 잘 보일듯.

                // 아이콘(🕸️)처럼 보이게 세우자.
                webGroup.rotation.z = Math.PI / 4; // 약간 기울기

                return webGroup;
            }
            case 'TELEPORT': {
                // 포털/소용돌이 모양 (🌀/🔮)
                const portalGroup = new THREE.Group();

                // 소용돌이 파티클 느낌의 고리들
                const spiralMat = new THREE.MeshStandardMaterial({
                    color: 0xaa00ff,
                    emissive: 0xaa00ff,
                    emissiveIntensity: 0.8,
                    transparent: true,
                    opacity: 0.7
                });

                for (let i = 0; i < 5; i++) {
                    const torus = new THREE.Mesh(
                        new THREE.TorusGeometry(scale * (0.5 + i * 0.2), scale * 0.05, 8, 16),
                        spiralMat
                    );
                    // 각 고리를 조금씩 틀어서 소용돌이 느낌
                    torus.rotation.x = Math.PI / 2;
                    torus.rotation.y = i * 0.5;
                    portalGroup.add(torus);
                }

                // 중앙 구체
                const core = new THREE.Mesh(
                    new THREE.SphereGeometry(scale * 0.4, 16, 16),
                    new THREE.MeshStandardMaterial({
                        color: 0x00ffff,
                        emissive: 0x00ffff,
                        emissiveIntensity: 1
                    })
                );
                portalGroup.add(core);

                return portalGroup;
            }
            default:
                geo = new THREE.BoxGeometry(scale, scale, scale);
                mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        return mesh;
    }

    update(time) {
        // 1. 회전 애니메이션
        this.mesh.rotation.y += 0.02;
        this.mesh.rotation.z += 0.01;

        // 2. 부유 애니메이션 (Bobbing)
        const t = time + this.animationOffset;
        this.group.position.y = this.baseY + Math.sin(t * 2) * 0.05;
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
