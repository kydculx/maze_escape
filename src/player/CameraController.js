import * as THREE from 'three';
import { CONFIG } from '../Config.js';

/**
 * 카메라 시점 및 동적 연출(점프 시 틸트, 안개 조절 등)을 관리하는 클래스
 */
export class CameraController {
    constructor(player, scene) {
        this.player = player; // Player 클래스 인스턴스
        this.scene = scene;

        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.PLAYER.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.PLAYER.CAMERA.NEAR,
            CONFIG.PLAYER.CAMERA.FAR
        );

        // 플레이어 그룹에 카메라 추가 (부모-자식 관계 설정으로 자동 추적)
        this.player.group.add(this.camera);

        // 흔들림(Shake) 설정
        this.shakeIntensity = 0;
        this.shakeTimer = 0;

        // 사망 연출 설정
        this.isDying = false;
        this.deathTimer = 0;
        this.deathDuration = 1.5;

        // 초기 시점 설정 (1인칭)
        this.setFirstPerson();
    }

    /**
     * 매 프레임 업데이트 (점프 연출, 대기 중 도리도리 등)
     */
    update(deltaTime, isJumping, jumpProgress) {
        // 1. 대기 중 도리도리(Sway) 연출
        const isIdle = !this.player.isMoving && !this.player.isRotating && !this.player.isJumping;
        const jumpCfg = CONFIG.PLAYER.JUMP_EFFECT;
        const camCfg = CONFIG.PLAYER.CAMERA;

        let swayOffset = 0;
        if (isIdle && this.player.idleTimer >= jumpCfg.IDLE_SWAY_DELAY) {
            // 효과 시작 시점부터의 경과 시간 계산
            const swayTime = this.player.idleTimer - jumpCfg.IDLE_SWAY_DELAY;

            // 시작 시 급격하게 튀지 않도록 1초간 서서히 강도 증가 (Fade-In)
            const fadeFactor = Math.min(swayTime / 1.0, 1.0);

            // swayTime을 sine 함수의 인자로 사용하여 항상 0(중앙)에서 시작하도록 함
            swayOffset = Math.sin(swayTime * jumpCfg.IDLE_SWAY_FREQUENCY) * (jumpCfg.IDLE_SWAY_AMPLITUDE * fadeFactor);
        }

        // 2. 카메라 시선 처리
        if (isJumping) {
            // 점프 중 안개 및 카메라 각도 동적 조절
            const rawFactor = Math.sin(jumpProgress * Math.PI);

            // 안개 가시거리 확장
            const fogCfg = CONFIG.MAZE.FOG;
            let visibilityFactor = 0;
            if (rawFactor > jumpCfg.VISIBILITY_THRESHOLD) {
                visibilityFactor = (rawFactor - jumpCfg.VISIBILITY_THRESHOLD) / (1.0 - jumpCfg.VISIBILITY_THRESHOLD);
                visibilityFactor = Math.pow(visibilityFactor, 1.2);
            }

            if (this.scene.fog) {
                this.scene.fog.far = fogCfg.FAR + (visibilityFactor * jumpCfg.MAX_EXTRA_VISIBILITY);
            }

            // 카메라 각도 (점프 정점에서 아래를 내려다봄 + 도리도리?)
            const targetPos = new THREE.Vector3(
                swayOffset, // Idle sway 적용 (도리도리)
                camCfg.FIRST_PERSON_HEIGHT - (rawFactor * jumpCfg.FIRST_PERSON_TILT),
                -1
            );

            const worldTarget = targetPos.clone();
            this.player.group.localToWorld(worldTarget);
            this.camera.lookAt(worldTarget);
        } else {
            // 점프가 아닐 때 (일반 이동 혹은 대기)
            // 기본 시선 처리 + 도리도리 offset 적용
            const forward = new THREE.Vector3(swayOffset, camCfg.FIRST_PERSON_HEIGHT, -1);
            const worldForward = forward.clone();
            this.player.group.localToWorld(worldForward);
            this.camera.lookAt(worldForward);
        }

        // 3. 사망 연출 (isDying이 true인 경우 다른 모든 카메라 로직을 오버라이드)
        if (this.isDying) {
            this.deathTimer += deltaTime;
            const progress = Math.min(this.deathTimer / this.deathDuration, 1.0);

            // 1) 아래로 기울기 (Tilt down)
            const tiltAngle = progress * Math.PI * 0.4; // 약 72도 숙임

            // 2) 높이 낮추기 (Fall to floor)
            const fallHeight = camCfg.FIRST_PERSON_HEIGHT * (1.0 - progress * 0.4); // 바닥 거의 근처까지

            this.camera.position.y = fallHeight;

            const targetPos = new THREE.Vector3(
                0,
                fallHeight - Math.sin(tiltAngle),
                -Math.cos(tiltAngle)
            );

            const worldTarget = targetPos.clone();
            this.player.group.localToWorld(worldTarget);
            this.camera.lookAt(worldTarget);

            // 흔들림은 유지 (쓰러지는 느낌 강화)
            if (this.shakeTimer > 0) {
                this.shakeTimer -= deltaTime;
                const factor = this.shakeTimer / this.shakeDuration;
                this.camera.position.x += (Math.random() - 0.5) * (this.shakeIntensity * factor);
            }
            return;
        }

        // 4. 카메라 흔들림(Shake) 적용
    }

    /**
     * 카메라 흔들기 효과 시작
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * 플레이어 사망 연출 시작
     */
    onPlayerDeath() {
        this.isDying = true;
        this.deathTimer = 0;
        // 쓰러질 때 짧은 충격 Shake 추가
        this.shake(0.2, 0.5);
    }

    /**
     * 카메라 상태 초기화 (다시 시작 시 호출)
     */
    reset() {
        this.isDying = false;
        this.deathTimer = 0;
        this.shakeTimer = 0;
        this.setFirstPerson();
    }

    setFirstPerson() {
        const camCfg = CONFIG.PLAYER.CAMERA;
        this.camera.position.set(0, camCfg.FIRST_PERSON_HEIGHT, 0);

        const forward = new THREE.Vector3(0, camCfg.FIRST_PERSON_HEIGHT, -1);
        const worldForward = forward.clone();
        this.player.group.localToWorld(worldForward);
        this.camera.lookAt(worldForward);
    }

    onJumpEnd() {
        // 안개 거리 복구
        if (this.scene.fog) {
            this.scene.fog.far = CONFIG.MAZE.FOG.FAR;
        }
        // 카메라 각도 복구
        this.setFirstPerson();
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        this.camera.aspect = aspect;

        // 반응형 FOV 계산 (가로 모드에서 너무 넓게 보이는 현상 방지)
        // 기본 FOV를 기준으로, 가로가 길어지면 수직 FOV를 줄여서 체감 가시 영역을 일정하게 유지
        const baseFov = CONFIG.PLAYER.CAMERA.FOV;
        if (aspect > 1) {
            // Landscape: 수평 시야각을 일정하게 유지하려는 시도 (vFOV 조정)
            // fov = 2 * atan(tan(baseFov / 2) / aspect) -> 수평 고정 방식
            // 여기서는 조금 더 완만한 보정을 위해 가중치 적용 가능
            const hFov = baseFov;
            const rad = (hFov * Math.PI) / 180;
            this.camera.fov = (2 * Math.atan(Math.tan(rad / 2) / aspect) * 180) / Math.PI;
        } else {
            // Portrait: 기본 FOV 사용
            this.camera.fov = baseFov;
        }

        this.camera.updateProjectionMatrix();
    }
}
