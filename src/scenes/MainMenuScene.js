import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';

/**
 * 메인 메뉴 전용 3D 장면
 */
export class MainMenuScene extends BaseScene {
    constructor(game) {
        super(game);
        this.init();
    }

    init() {
        // 1. 카메라 설정 (메인 메뉴용 시점)
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.PLAYER.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.PLAYER.CAMERA.NEAR,
            CONFIG.PLAYER.CAMERA.FAR
        );
        this.camera.position.set(2, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // 2. 조명 추가
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0x00ff00, 2);
        spotLight.position.set(5, 5, 5);
        this.scene.add(spotLight);

        // 3. 중앙 객체 (멋진 연출용) - 제거됨 (사용자 요청)
        /*
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.7, roughness: 0.2 });
        this.object = new THREE.Mesh(geometry, material);
        this.scene.add(this.object);
        */

        // 바닥 추가
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        this.scene.add(floor);
    }



    update() {
        // 객체 자동 회전 및 카메라 부드러운 이동 (제거됨 - 사용자 요청)
        /*
        if (this.object) {
            this.object.rotation.y += 0.005;
            this.object.rotation.z += 0.005;
        }

        const time = Date.now() * 0.0005;
        this.camera.position.x = Math.sin(time) * 6;
        this.camera.position.z = Math.cos(time) * 6;
        this.camera.lookAt(0, 0, 0);
        */

        // 고정된 시점 유지
        this.camera.lookAt(0, 0, 0);
    }
}
