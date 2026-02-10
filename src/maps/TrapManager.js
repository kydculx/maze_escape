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
        // 시각적 모델 생성 (빨간색납작한 원통)
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0x550000,
            roughness: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(position);
        mesh.position.y = 0.025; // 바닥보다 살짝 위

        // 그림자 설정
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.trapGroup.add(mesh);
        this.traps.push({
            mesh: mesh,
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
}
