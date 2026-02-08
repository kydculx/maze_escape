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
                // 점프 아이템 (스프링 컨셉: 층층이 쌓인 고리들)
                const springGroup = new THREE.Group();
                const ringCount = 5;
                for (let i = 0; i < ringCount; i++) {
                    const ringGeo = new THREE.TorusGeometry(scale, scale * 0.15, 8, 24);
                    const ringMat = new THREE.MeshStandardMaterial({
                        color: color,
                        emissive: color,
                        emissiveIntensity: 0.5 + (i * 0.1)
                    });
                    const ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.y = (i * scale * 0.5) - (scale);
                    springGroup.add(ring);
                }
                return springGroup;
            }
            case 'FLASHLIGHT': {
                // 손전등 모양 (실린더 + 박스 조합)
                const group = new THREE.Group();
                const bodyGeo = new THREE.CylinderGeometry(scale * 0.4, scale * 0.4, scale * 2, 12);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
                const body = new THREE.Mesh(bodyGeo, bodyMat);
                body.rotation.z = Math.PI / 2;
                group.add(body);

                const headGeo = new THREE.CylinderGeometry(scale * 0.6, scale * 0.4, scale * 0.6, 12);
                const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9 });
                const head = new THREE.Mesh(headGeo, headMat);
                head.rotation.z = Math.PI / 2;
                head.position.x = scale;
                group.add(head);

                const lensGeo = new THREE.CircleGeometry(scale * 0.5, 12);
                const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const lens = new THREE.Mesh(lensGeo, lensMat);
                lens.rotation.y = Math.PI / 2;
                lens.position.x = scale + 0.31 * scale;
                group.add(lens);

                return group;
            }
            case 'MAP': {
                // 지도 모양 (둘둘 말린 종이/스크롤)
                const mapGroup = new THREE.Group();
                const scrollGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.5, 12);
                const scrollMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 }); // 파피루스 색
                const scroll = new THREE.Mesh(scrollGeo, scrollMat);
                scroll.rotation.z = Math.PI / 2;
                mapGroup.add(scroll);

                const bandGeo = new THREE.TorusGeometry(scale * 0.32, scale * 0.05, 8, 16);
                const bandMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const band = new THREE.Mesh(bandGeo, bandMat);
                band.rotation.y = Math.PI / 2;
                mapGroup.add(band);
                return mapGroup;
            }
            case 'HAMMER': {
                // 망치 모양
                const hamGroup = new THREE.Group();
                const handleGeo = new THREE.CylinderGeometry(scale * 0.2, scale * 0.2, scale * 2, 8);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                const handle = new THREE.Mesh(handleGeo, handleMat);
                hamGroup.add(handle);

                const headGeo = new THREE.BoxGeometry(scale * 1.2, scale * 0.6, scale * 0.6);
                const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
                const head = new THREE.Mesh(headGeo, headMat);
                head.position.y = scale;
                hamGroup.add(head);
                return hamGroup;
            }
            case 'TRAP': {
                // 함정 모양 (Bear Trap 스타일 - 뾰족한 이빨이 있는 원형)
                const trapGroup = new THREE.Group();

                // 베이스 판
                const baseGeo = new THREE.CylinderGeometry(scale, scale, scale * 0.1, 16);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.position.y = 0;
                trapGroup.add(base);

                // 이빨 (Torus를 반으로 잘라 세움)
                const teethGeo = new THREE.TorusGeometry(scale * 0.9, scale * 0.1, 8, 16, Math.PI);
                const teethMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

                const leftTeeth = new THREE.Mesh(teethGeo, teethMat);
                leftTeeth.rotation.x = -Math.PI / 2;
                leftTeeth.rotation.z = Math.PI / 2; // 세우기
                leftTeeth.position.y = scale * 0.1;
                trapGroup.add(leftTeeth);

                const rightTeeth = new THREE.Mesh(teethGeo, teethMat);
                rightTeeth.rotation.x = -Math.PI / 2;
                rightTeeth.rotation.z = -Math.PI / 2; // 반대쪽
                rightTeeth.position.y = scale * 0.1;
                trapGroup.add(rightTeeth);

                return trapGroup;
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
