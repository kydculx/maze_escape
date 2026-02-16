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

        // 메인 바디 (직사각형 팩)
        const bodyGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // 램프 (깜빡이는 빨간 불)
        const lampGeo = new THREE.SphereGeometry(0.015, 8, 8);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.name = 'lamp';
        lamp.position.set(0.04, 0.02, 0.026);
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
