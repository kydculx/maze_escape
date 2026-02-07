import * as THREE from 'three';
import { CONFIG } from './Config.js';

/**
 * 카메라 시점 및 동적 연출(점프 시 틸트, 안개 조절 등)을 관리하는 클래스
 */
export class CameraController {
    constructor(player, scene) {
        this.player = player; // Player 클래스 인스턴스
        this.scene = scene;

        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );

        // 플레이어 그룹에 카메라 추가 (부모-자식 관계 설정으로 자동 추적)
        this.player.group.add(this.camera);

        // 초기 시점 설정 (1인칭)
        this.setFirstPerson();
    }

    /**
     * 매 프레임 업데이트 (점프 연출 등)
     */
    update(deltaTime, isJumping, jumpProgress) {
        if (!isJumping) return;

        // 점프 중 안개 및 카메라 각도 동적 조절
        const rawFactor = Math.sin(jumpProgress * Math.PI);

        // 1. 안개 가시거리 확장 (임계값 이상일 때만)
        const fogCfg = CONFIG.ENVIRONMENT.FOG;
        const jumpCfg = CONFIG.PLAYER.JUMP_EFFECT;

        let visibilityFactor = 0;
        if (rawFactor > jumpCfg.VISIBILITY_THRESHOLD) {
            // 임계값(예: 0.5) ~ 1.0 사이를 0.0 ~ 1.0으로 매핑
            visibilityFactor = (rawFactor - jumpCfg.VISIBILITY_THRESHOLD) / (1.0 - jumpCfg.VISIBILITY_THRESHOLD);
            visibilityFactor = Math.pow(visibilityFactor, 1.2);
        }

        if (this.scene.fog) {
            this.scene.fog.far = fogCfg.FAR + (visibilityFactor * jumpCfg.MAX_EXTRA_VISIBILITY);
        }

        // 2. 카메라 각도 조절 (정점에서 아래를 내려다봄)
        const camCfg = CONFIG.CAMERA;
        const targetPos = new THREE.Vector3(
            0,
            camCfg.FIRST_PERSON_HEIGHT - (rawFactor * jumpCfg.FIRST_PERSON_TILT),
            -1
        );

        // 로컬 좌표를 월드 좌표로 변환하여 lookAt
        const worldTarget = targetPos.clone();
        this.player.group.localToWorld(worldTarget);
        this.camera.lookAt(worldTarget);
    }

    setFirstPerson() {
        const camCfg = CONFIG.CAMERA;
        this.camera.position.set(0, camCfg.FIRST_PERSON_HEIGHT, 0);

        const forward = new THREE.Vector3(0, camCfg.FIRST_PERSON_HEIGHT, -1);
        const worldForward = forward.clone();
        this.player.group.localToWorld(worldForward);
        this.camera.lookAt(worldForward);
    }

    onJumpEnd() {
        // 안개 거리 복구
        if (this.scene.fog) {
            this.scene.fog.far = CONFIG.ENVIRONMENT.FOG.FAR;
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
        const baseFov = CONFIG.CAMERA.FOV;
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
