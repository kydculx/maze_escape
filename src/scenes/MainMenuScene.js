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
            CONFIG.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );
        this.camera.position.set(2, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // 2. 조명 추가
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0x00ff00, 2);
        spotLight.position.set(5, 5, 5);
        this.scene.add(spotLight);

        // 3. 중앙 객체 (멋진 연출용)
        const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.7, roughness: 0.2 });
        this.object = new THREE.Mesh(geometry, material);
        this.scene.add(this.object);

        // 바닥 추가
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        this.scene.add(floor);

        // 달 추가 (배경 연출용으로 작게 멀리 배치)
        const moonCfg = CONFIG.ENVIRONMENT.MOON;
        const moonGeometry = new THREE.SphereGeometry(moonCfg.SIZE * 0.5, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: moonCfg.COLOR,
            emissive: moonCfg.EMISSIVE,
            emissiveIntensity: 0.5
        });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.position.set(-20, 15, -20);
        this.scene.add(moon);

        // 별 추가
        this.createStars();
    }

    /**
     * 메인 메뉴용 별무리 생성 (PlayScene과 공유 가능하나 독립적 구현)
     */
    createStars() {
        const starCfg = CONFIG.ENVIRONMENT.STARS;
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: starCfg.COLOR,
            size: starCfg.SIZE,
            transparent: true,
            opacity: 0.6
        });

        const starVertices = [];
        for (let i = 0; i < starCfg.COUNT / 2; i++) { // 메뉴는 조금 적게
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 100;
            const z = (Math.random() - 0.5) * 100;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    update() {
        // 객체 자동 회전 및 카메라 부드러운 이동
        if (this.object) {
            this.object.rotation.y += 0.005;
            this.object.rotation.z += 0.005;
        }

        // 카메라가 원을 그리며 천천히 회전하는 연출
        const time = Date.now() * 0.0005;
        this.camera.position.x = Math.sin(time) * 6;
        this.camera.position.z = Math.cos(time) * 6;
        this.camera.lookAt(0, 0, 0);
    }
}
