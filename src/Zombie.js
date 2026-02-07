import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from './CharacterBuilder.js';
import { CONFIG } from './Config.js';

/**
 * 기본 좀비 클래스
 */
export class Zombie extends Monster {
    constructor(scene, options = {}) {
        const zombieCfg = CONFIG.MONSTERS.ZOMBIE;
        super(scene, CONFIG.MONSTERS.TYPES.ZOMBIE, {
            color: zombieCfg.COLOR,
            scale: zombieCfg.MODEL_SCALE,
            ...options
        });
    }

    _initModel(options) {
        this.model = CharacterBuilder.createBasicCharacter(options);
        this.group.add(this.model);

        // 팔을 앞으로 쭉 뻗은 좀비 포즈 지원
        this.leftArm = this.model.getObjectByName('leftArm');
        this.rightArm = this.model.getObjectByName('rightArm');
        this.leftLeg = this.model.getObjectByName('leftLeg');
        this.rightLeg = this.model.getObjectByName('rightLeg');

        if (this.leftArm) this.leftArm.rotation.x = -Math.PI / 2.5;
        if (this.rightArm) this.rightArm.rotation.x = -Math.PI / 2.2; // 약간 비대칭
    }

    _updateAnimation(deltaTime) {
        const config = CONFIG.MONSTERS.ZOMBIE;
        const states = CONFIG.MONSTERS.STATES;

        if (this.state === states.IDLE) {
            // 대기 시: 몸이 앞뒤좌우로 미세하게 흔들림 (흐느적거림)
            const sway = Math.sin(this.animationTime * config.IDLE_SWAY_SPEED);
            this.model.rotation.z = sway * config.IDLE_SWAY_AMPLITUDE;
            this.model.rotation.x = Math.cos(this.animationTime * config.IDLE_SWAY_SPEED * 0.7) * config.IDLE_SWAY_AMPLITUDE;

            // 팔도 미세하게 까닥거림
            if (this.leftArm) this.leftArm.rotation.z = sway * 0.1;
            if (this.rightArm) this.rightArm.rotation.z = -sway * 0.1;

        } else if (this.state === states.MOVE) {
            // 이동 시: 비틀거리며 걷기
            const walkCycle = this.animationTime * config.WALK_BOB_SPEED;
            const bob = Math.abs(Math.sin(walkCycle)) * config.WALK_BOB_AMPLITUDE;
            this.model.position.y = bob;

            // 다리 교차 흔들림
            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.3;
            if (this.rightLeg) this.rightLeg.rotation.x = Math.cos(walkCycle) * 0.3;

            // 몸의 좌우 흔들림 (비틀거림)
            this.model.rotation.z = Math.sin(walkCycle * 0.5) * 0.1;
        }
    }

    _updateLogic(deltaTime) {
        // TODO: AI 로직 (플레이어 추적 등)
        // 현재는 생성 시 IDLE 상태 유지
    }
}
