import * as THREE from 'three';
import { CONFIG } from './Config.js';

/**
 * 모든 몬스터의 기본이 되는 추상 클래스
 */
export class Monster {
    constructor(scene, mazeGen, type, options = {}) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.type = type;

        // 3D 그룹 (모델의 부모)
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // 상태 관리
        this.state = CONFIG.MONSTERS.STATES.IDLE;
        this.stateTimer = 0;
        this.animationTime = 0;

        // 위치 및 방향
        this.position = this.group.position;
        this.rotation = this.group.rotation;

        this._initModel(options);
    }

    /**
     * 상속받는 클래스에서 구현: 모델 생성
     */
    _initModel(options) {
        // 기본 큐브 (Placeholder)
        const geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.25;
        this.group.add(mesh);
    }

    /**
     * 상태 변경
     */
    setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateTimer = 0;
    }

    /**
     * 매 프레임 업데이트
     */
    update(deltaTime, player) {
        this.stateTimer += deltaTime;
        this.animationTime += deltaTime;

        this._updateAnimation(deltaTime);
        this._updateLogic(deltaTime, player);
    }

    /**
     * 상속받는 클래스에서 구현: 애니메이션 로직
     */
    _updateAnimation(deltaTime) {
        // Override in subclass
    }

    /**
     * 상속받는 클래스에서 구현: AI/이동 로직
     */
    _updateLogic(deltaTime, player) {
        // Override in subclass
    }

    /**
     * 제거
     */
    destroy() {
        this.scene.remove(this.group);
        // 지오메트리, 재질 메모리 해제 로직 추가 가능
    }
}
