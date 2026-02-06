import * as THREE from 'three';
import { CONFIG } from './Config.js';

/**
 * 카메라 시점 및 동적 연출(점프 시 틸트, 안개 조절 등)을 관리하는 클래스
 */
export class CameraController {
    constructor(player, scene) {
        this.player = player; // Player 클래스 인스턴스
        this.scene = scene;
        this.isThirdPerson = false;

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
        const smoothFactor = Math.pow(rawFactor, 1.5);

        // 1. 안개 가시거리 확장
        const fogCfg = CONFIG.ENVIRONMENT.FOG;
        const maxExtraVisibility = 50;
        if (this.scene.fog) {
            this.scene.fog.far = fogCfg.FAR + (smoothFactor * maxExtraVisibility);
        }

        // 2. 카메라 각도 조절 (정점에서 아래를 내려다봄)
        const camCfg = CONFIG.CAMERA;
        let targetPos;
        if (this.isThirdPerson) {
            targetPos = new THREE.Vector3(
                camCfg.THIRD_PERSON.LOOK_AT_OFFSET.x,
                camCfg.THIRD_PERSON.LOOK_AT_OFFSET.y - (rawFactor * 1.5),
                camCfg.THIRD_PERSON.LOOK_AT_OFFSET.z
            );
        } else {
            targetPos = new THREE.Vector3(
                0,
                camCfg.FIRST_PERSON_HEIGHT - (rawFactor * 1.2),
                -1
            );
        }

        // 로컬 좌표를 월드 좌표로 변환하여 lookAt
        const worldTarget = targetPos.clone();
        this.player.group.localToWorld(worldTarget);
        this.camera.lookAt(worldTarget);
    }

    toggleView() {
        this.isThirdPerson = !this.isThirdPerson;
        if (this.isThirdPerson) {
            this.setThirdPerson();
        } else {
            this.setFirstPerson();
        }
    }

    setFirstPerson() {
        this.isThirdPerson = false;
        const camCfg = CONFIG.CAMERA;
        this.camera.position.set(0, camCfg.FIRST_PERSON_HEIGHT, 0);

        const forward = new THREE.Vector3(0, camCfg.FIRST_PERSON_HEIGHT, -1);
        const worldForward = forward.clone();
        this.player.group.localToWorld(worldForward);
        this.camera.lookAt(worldForward);

        this.player.setVisibility(false); // 1인칭은 모델 숨김
    }

    setThirdPerson() {
        this.isThirdPerson = true;
        const camCfg = CONFIG.CAMERA;
        this.camera.position.set(
            camCfg.THIRD_PERSON.OFFSET.x,
            camCfg.THIRD_PERSON.OFFSET.y,
            camCfg.THIRD_PERSON.OFFSET.z
        );

        const lookAtPos = new THREE.Vector3(
            camCfg.THIRD_PERSON.LOOK_AT_OFFSET.x,
            camCfg.THIRD_PERSON.LOOK_AT_OFFSET.y,
            camCfg.THIRD_PERSON.LOOK_AT_OFFSET.z
        );
        const worldLookAt = lookAtPos.clone();
        this.player.group.localToWorld(worldLookAt);
        this.camera.lookAt(worldLookAt);

        this.player.setVisibility(true); // 3인칭은 모델 표시
    }

    onJumpEnd() {
        // 안개 거리 복구
        if (this.scene.fog) {
            this.scene.fog.far = CONFIG.ENVIRONMENT.FOG.FAR;
        }
        // 카메라 각도 복구
        if (this.isThirdPerson) this.setThirdPerson();
        else this.setFirstPerson();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
