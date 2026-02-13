import * as THREE from 'three';
import { CONFIG } from '../Config.js';

/**
 * 설치된 함정(Trap)을 관리하는 클래스
 */
export class TrapManager {
    constructor(scene) {
        this.scene = scene;
        this.traps = [];
        this.trapGroup = new THREE.Group();
        this.trapGroup.name = 'placed-traps';
        this.scene.add(this.trapGroup);
    }

    /**
     * 지정된 위치에 함정 설치
     * @param {THREE.Vector3} position 
     */
    placeTrap(position) {
        // 초정밀 곰 덫 (Bear Trap) 모델 생성
        const trapGroup = new THREE.Group();
        const scale = 0.25; // 설치 시 크기 조절

        // 1. 원형 프레임
        const rimGeo = new THREE.TorusGeometry(scale * 1.1, scale * 0.05, 8, 24);
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.9,
            roughness: 0.2
        });
        const rim = new THREE.Mesh(rimGeo, metalMat);
        rim.rotation.x = Math.PI / 2;
        trapGroup.add(rim);

        // 2. 톱니 이빨 (Jaws)
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

        // 톱니들
        const toothGeo = new THREE.ConeGeometry(scale * 0.05, scale * 0.2, 4);
        const toothMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 1.0 });

        for (let i = 0; i < 8; i++) {
            const angle = (i / 7) * Math.PI;
            const tL = new THREE.Mesh(toothGeo, toothMat);
            tL.position.set(Math.cos(angle) * scale * 1.05, Math.sin(angle) * scale * 1.05, 0);
            tL.rotation.z = angle - Math.PI / 2;
            leftJaw.add(tL);

            const tR = new THREE.Mesh(toothGeo, toothMat);
            tR.position.set(Math.cos(angle) * scale * 1.05, Math.sin(angle) * scale * 1.05, 0);
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
        trapGroup.add(plate);

        // 4. 스프링
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

        trapGroup.position.copy(position);
        trapGroup.position.y = 0.01; // 바닥에 아주 가깝게

        // 모든 자식 메쉬에 그림자 설정
        trapGroup.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.trapGroup.add(trapGroup);
        this.traps.push({
            mesh: trapGroup,
            active: true
        });

        console.log(`Trap placed at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
    }

    /**
     * 함정 업데이트 및 충돌 체크
     * @param {number} deltaTime 
     * @param {Array} monsters - 현재 활성화된 몬스터 목록
     */
    update(deltaTime, monsters) {
        if (!monsters || monsters.length === 0) return;

        const config = CONFIG.ITEMS.TRAP;
        const triggerRadiusSq = config.TRIGGER_RADIUS * config.TRIGGER_RADIUS;

        // 역순 순회 (삭제 대응)
        for (let i = this.traps.length - 1; i >= 0; i--) {
            const trap = this.traps[i];
            if (!trap.active) continue;

            // 몬스터와의 충돌 체크
            for (const monster of monsters) {
                if (monster.isFrozen) continue; // 이미 얼어있는 몬스터는 패스

                const dx = monster.position.x - trap.mesh.position.x;
                const dz = monster.position.z - trap.mesh.position.z;
                const distSq = dx * dx + dz * dz;

                if (distSq <= triggerRadiusSq) {
                    // 함정 발동!
                    this._triggerTrap(i, monster);
                    break; // 하나의 함정은 하나의 몬스터만 잡음
                }
            }
        }
    }

    /**
     * 함정 발동 처리
     */
    _triggerTrap(index, monster) {
        const trap = this.traps[index];
        trap.active = false;

        // 몬스터 얼리기
        const freezeDuration = CONFIG.ITEMS.TRAP.FREEZE_DURATION;
        if (monster.freeze) {
            monster.freeze(freezeDuration);
        }

        console.log('Trap triggered!');

        // 시각적 제거 (또는 발동 효과)
        this.trapGroup.remove(trap.mesh);
        trap.mesh.geometry.dispose();
        trap.mesh.material.dispose();

        // 배열에서 제거
        this.traps.splice(index, 1);
    }

    /**
     * 모든 함정 제거 (스테이지 초기화 등)
     */
    clear() {
        for (const trap of this.traps) {
            this.trapGroup.remove(trap.mesh);
            trap.mesh.geometry.dispose();
            trap.mesh.material.dispose();
        }
        this.traps = [];
    }

    /**
     * 리소스 정리
     */
    dispose() {
        this.clear();
        this.scene.remove(this.trapGroup);
    }
}
