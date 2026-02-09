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
        this.camera.position.set(
            CONFIG.CAMERA.INITIAL_POS.x,
            CONFIG.CAMERA.INITIAL_POS.y,
            CONFIG.CAMERA.INITIAL_POS.z
        );
        this.camera.lookAt(CONFIG.CAMERA.LOOK_AT.x, CONFIG.CAMERA.LOOK_AT.y, CONFIG.CAMERA.LOOK_AT.z);

        // 2. 조명 추가
        const ambientLight = new THREE.AmbientLight(
            CONFIG.ENVIRONMENT.LIGHTING.MENU_AMBIENT.COLOR,
            CONFIG.ENVIRONMENT.LIGHTING.MENU_AMBIENT.INTENSITY
        );
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(
            CONFIG.ENVIRONMENT.LIGHTING.MENU_POINT.COLOR,
            CONFIG.ENVIRONMENT.LIGHTING.MENU_POINT.INTENSITY
        );
        pointLight.position.set(
            CONFIG.ENVIRONMENT.LIGHTING.MENU_POINT.POSITION.x,
            CONFIG.ENVIRONMENT.LIGHTING.MENU_POINT.POSITION.y,
            CONFIG.ENVIRONMENT.LIGHTING.MENU_POINT.POSITION.z
        );
        this.scene.add(pointLight);

        // 3. 스플래시용 애니메이션 객체 (큐브)
        const geometry = new THREE.BoxGeometry(...CONFIG.CUBE.SIZE);
        const material = new THREE.MeshStandardMaterial({ color: CONFIG.CUBE.COLOR });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);

        // 바닥 추가
        const floorGeometry = new THREE.PlaneGeometry(...CONFIG.FLOOR.SIZE);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.FLOOR.COLOR });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = CONFIG.FLOOR.POSITION_Y;
        this.scene.add(floor);
    }

    update() {
        if (this.cube) {
            this.cube.rotation.x += CONFIG.CUBE.ROTATION_SPEED;
            this.cube.rotation.y += CONFIG.CUBE.ROTATION_SPEED;
        }
    }
}
