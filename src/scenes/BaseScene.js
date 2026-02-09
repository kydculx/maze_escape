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
        // 씬의 모든 객체를 순회하며 리소스 해제
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        this._disposeMaterial(material);
                    });
                } else {
                    this._disposeMaterial(object.material);
                }
            }
        });

        // 씬 완전히 비우기
        this.scene.clear();
    }

    /**
     * 머티리얼 리소스 해제
     */
    _disposeMaterial(material) {
        if (material.map) material.map.dispose();
        if (material.lightMap) material.lightMap.dispose();
        if (material.bumpMap) material.bumpMap.dispose();
        if (material.normalMap) material.normalMap.dispose();
        if (material.specularMap) material.specularMap.dispose();
        if (material.envMap) material.envMap.dispose();
        material.dispose();
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
