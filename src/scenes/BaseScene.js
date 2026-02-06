import * as THREE from 'three';

/**
 * 모든 게임 장면의 베이스 클래스
 */
export class BaseScene {
    constructor(game) {
        this.game = game; // 게임 인스턴스 참조
        this.scene = new THREE.Scene();
        this.camera = null; // 자식 클래스에서 초기화
    }

    /**
     * 장면 초기화 로직
     */
    init() {
        console.warn('init() not implemented in subclass');
    }

    /**
     * 프레임별 업데이트 로직
     */
    update() {
        // 자식 클래스에서 구현
    }

    /**
     * 리소스 해제 로직
     */
    dispose() {
        // 지오메트리, 마테리얼 등 해제
        this.scene.clear();
    }

    /**
     * Three.js Scene 객체 반환
     */
    getThreeScene() {
        return this.scene;
    }

    /**
     * 현재 장면의 카메라 반환
     */
    getCamera() {
        return this.camera;
    }
}
