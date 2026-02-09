import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';

/**
 * 스플래시 장면 클래스
 */
export class SplashScene extends BaseScene {
    constructor(game) {
        super(game);
        console.log('[SplashScene] Constructor called');
        this.init();
    }

    init() {
        // 1. 카메라 설정
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // 2. 검은 배경 설정 (HTML 오버레이와 일치)
        this.scene.background = new THREE.Color(0x000000);

        console.log('[SplashScene] Initialized with black background');
    }

    update() {
        // 스플래시 화면은 정적이므로 업데이트 불필요
    }
}
