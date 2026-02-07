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

    _updateLogic(deltaTime, player) {
        if (!player) return;

        const config = CONFIG.MONSTERS.ZOMBIE;
        const states = CONFIG.MONSTERS.STATES;

        // 1. 플레이어와의 거리 계산
        const dist = this.position.distanceTo(player.group.position);
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const distInCells = dist / thickness;

        // 2. 상태 전환 로직
        if (this.state === states.IDLE) {
            if (distInCells <= config.DETECTION_RANGE) {
                this.setState(states.MOVE);
            }
        } else if (this.state === states.MOVE) {
            if (distInCells > config.DETECTION_RANGE + 2) { // 약간의 여유(Hysteresis)를 둠
                this.setState(states.IDLE);
                return;
            }

            // 3. 플레이어 추적 및 이동 로직
            // 3.1 플레이어 방향으로 서서히 회전 (Y축만)
            const targetRotation = Math.atan2(
                player.group.position.x - this.position.x,
                player.group.position.z - this.position.z
            );

            // 각도 보간 (Lerp)
            let angleDiff = targetRotation - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.rotation.y += angleDiff * deltaTime * 2.0;

            // 3.2 이동 전진
            const moveStep = config.SPEED * thickness * deltaTime;

            // 이동할 목표 위치 계산
            const nextX = this.position.x + Math.sin(this.rotation.y) * moveStep;
            const nextZ = this.position.z + Math.cos(this.rotation.y) * moveStep;

            // 3.3 벽 충돌 체크
            if (this._canMoveTo(nextX, nextZ)) {
                this.position.x = nextX;
                this.position.z = nextZ;
            } else {
                // 벽에 막혔을 때: 미끄러지기 시도 등 추가 가능 (현재는 정지)
            }
        }
    }

    /**
     * 월드 좌표 기준으로 해당 위치가 이동 가능한지(벽이 아닌지) 체크
     */
    _canMoveTo(worldX, worldZ) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        const gridX = Math.floor((worldX - offsetX) / thickness);
        const gridY = Math.floor((worldZ - offsetZ) / thickness);

        // 미로 범위 체크
        if (gridX < 0 || gridX >= this.mazeGen.width || gridY < 0 || gridY >= this.mazeGen.height) {
            return false;
        }

        // 벽 체크 (0: 길, 1: 벽)
        return this.mazeGen.grid[gridY][gridX] === 0;
    }
}
