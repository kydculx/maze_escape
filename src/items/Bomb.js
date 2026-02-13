import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { ASSETS } from '../Assets.js';

/**
 * 설치된 개별 C4 폭탄 클래스
 */
export class Bomb {
    constructor(scene, position, normal, onDetonate, soundManager) {
        this.scene = scene;
        this.onDetonate = onDetonate;
        this.sound = soundManager;

        this.timer = CONFIG.ITEMS.BOMB.DETONATION_TIME;
        this.isDetonated = false;

        // 폭탄 메쉬 생성
        this.mesh = this._createBombMesh();
        this.mesh.position.copy(position);

        // 벽면에 붙이기 위해 방향 설정 (normal 기준)
        if (normal) {
            const lookTarget = position.clone().add(normal);
            this.mesh.lookAt(lookTarget);
        }

        this.scene.add(this.mesh);

        // 깜빡임 효과용
        this.blinkTimer = 0;
        this.lamp = this.mesh.getObjectByName('lamp');

        console.log("C4 Bomb planted at:", position);
    }

    _createBombMesh() {
        const group = new THREE.Group();
        group.name = 'c4-bomb';

        // 1. 베이스 플레이트 (검은색 금속판)
        const baseGeo = new THREE.BoxGeometry(0.18, 0.12, 0.01);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.2
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // 2. C4 폭약 블록 (3개, 약간 베이지색/회색)
        const packGeo = new THREE.BoxGeometry(0.045, 0.09, 0.03);
        const packMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, // 점토 느낌의 회색
            roughness: 0.9
        });

        for (let i = 0; i < 3; i++) {
            const pack = new THREE.Mesh(packGeo, packMat);
            pack.position.set(-0.06 + i * 0.05, 0, 0.02);
            group.add(pack);
        }

        // 3. 타이머 유닛 (중앙 상단 전자 기구)
        const timerGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
        const timerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const timer = new THREE.Mesh(timerGeo, timerMat);
        timer.position.set(0, 0, 0.04);
        group.add(timer);

        // 타이머 스크린 (진한 빨간색 유리 느낌)
        const screenGeo = new THREE.PlaneGeometry(0.06, 0.02);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x330000,
            emissive: 0x220000,
            emissiveIntensity: 0.5
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0, 0.011);
        timer.add(screen);

        // 4. 전선 (빨강, 파랑 - 실린더나 얇은 박스)
        const wireGeo = new THREE.BoxGeometry(0.005, 0.08, 0.005);
        const redWireMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const blueWireMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });

        const wire1 = new THREE.Mesh(wireGeo, redWireMat);
        wire1.position.set(-0.04, 0, 0.035);
        wire1.rotation.z = Math.PI / 4;
        group.add(wire1);

        const wire2 = new THREE.Mesh(wireGeo, blueWireMat);
        wire2.position.set(0.04, 0, 0.035);
        wire2.rotation.z = -Math.PI / 4;
        group.add(wire2);

        // 5. 램프 (깜빡이는 빨간 불)
        const lampGeo = new THREE.SphereGeometry(0.01, 8, 8);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.name = 'lamp';
        lamp.position.set(0.03, 0.01, 0.051); // 타이머 유닛 우측 상단
        group.add(lamp);

        return group;
    }

    update(dt) {
        if (this.isDetonated) return;

        this.timer -= dt;

        // 깜빡임 처리
        this.blinkTimer += dt;
        if (this.blinkTimer >= CONFIG.ITEMS.BOMB.BLINK_SPEED) {
            this.blinkTimer = 0;
            if (this.lamp) {
                this.lamp.visible = !this.lamp.visible;
                // 깜빡일 때 비프음 (옵션)
                if (this.lamp.visible && this.sound) {
                    this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.BOMB_TICK);
                }
            }
        }

        if (this.timer <= 0) {
            this.detonate();
        }
    }

    detonate() {
        if (this.isDetonated) return;
        this.isDetonated = true;

        console.log("C4 Detonated!");

        // 효과음
        if (this.sound) {
            this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.EXPLOSION);
        }

        // 콜백 실행 (벽 파괴 등)
        if (this.onDetonate) {
            this.onDetonate();
        }

        // 폭발 섬광 효과
        this._createExplosionFlash();

        // 오브젝트 제거
        this.destroy();
    }

    _createExplosionFlash() {
        const flash = new THREE.PointLight(0xffaa00, 5, 5);
        flash.position.copy(this.mesh.position);
        this.scene.add(flash);

        // 아주 짧은 시간 동안만 표시 후 제거
        const startTime = performance.now();
        const duration = 200; // 0.2초

        const animateFlash = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(flash);
                return;
            }

            flash.intensity = 5 * (1 - progress);
            requestAnimationFrame(animateFlash);
        };
        requestAnimationFrame(animateFlash);
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}
