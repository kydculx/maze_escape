import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from './CharacterBuilder.js';
import { Pathfinder } from './Pathfinder.js';
import { CONFIG } from './Config.js';

/**
 * 기본 좀비 클래스
 */
export class Zombie extends Monster {
    constructor(scene, mazeGen, options = {}) {
        const zombieCfg = CONFIG.MONSTERS.ZOMBIE;
        super(scene, mazeGen, CONFIG.MONSTERS.TYPES.ZOMBIE, {
            color: zombieCfg.COLOR,
            scale: zombieCfg.MODEL_SCALE,
            ...options
        });

        // 길찾기 관련 상태
        this.currentPath = null;
        this.pathIndex = 0;
        this.lastPathCalcTime = 0;
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
            if (distInCells > config.DETECTION_RANGE + 3) { // 좀더 멀어지면 포기
                this.setState(states.IDLE);
                this.currentPath = null;
                return;
            }

            // 3. 길찾기 경로 업데이트 (주기적)
            if (this.animationTime - this.lastPathCalcTime > config.PATH_RECALC_INTERVAL) {
                this._calculatePath(player);
                this.lastPathCalcTime = this.animationTime;
            }

            // 4. 경로 추적 이동
            if (this.currentPath && this.pathIndex < this.currentPath.length) {
                const targetNode = this.currentPath[this.pathIndex];
                const targetPos = this._gridToWorld(targetNode.x, targetNode.y);

                // 현재 위치에서 타겟 노드까지의 방향 벡터
                const direction = new THREE.Vector3(
                    targetPos.x - this.position.x,
                    0,
                    targetPos.z - this.position.z
                );
                const distToNode = direction.length();

                if (distToNode > 0.05) {
                    // 회전 처리
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    let angleDiff = targetAngle - this.rotation.y;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    this.rotation.y += angleDiff * deltaTime * 3.0;

                    // 이동 전진 (단순 forward 이동 대신 translateZ 사용)
                    const moveStep = config.SPEED * thickness * deltaTime;
                    const finalStep = Math.min(moveStep, distToNode);
                    this.group.translateZ(finalStep);
                } else {
                    // 노드 도착 -> 다음 노드로
                    this.pathIndex++;
                }
            } else {
                // 경로가 없거나 끝났으면 플레이어 직접 바라보기 (마지막 미세 조정)
                const targetRotation = Math.atan2(
                    player.group.position.x - this.position.x,
                    player.group.position.z - this.position.z
                );
                this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, targetRotation, deltaTime * 2.0);
            }
        }
    }

    /**
     * A*를 이용해 플레이어까지의 경로 계산
     */
    _calculatePath(player) {
        const startIdx = this._worldToGrid(this.position.x, this.position.z);
        const endIdx = this._worldToGrid(player.group.position.x, player.group.position.z);

        const path = Pathfinder.findPath(this.mazeGen.grid, startIdx, endIdx);
        if (path) {
            this.currentPath = path;
            this.pathIndex = 1; // 0번은 현재 위치이므로 1번부터 추적
        }
    }

    _gridToWorld(gridX, gridY) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        return {
            x: offsetX + gridX * thickness + thickness / 2,
            z: offsetZ + gridY * thickness + thickness / 2
        };
    }

    _worldToGrid(worldX, worldZ) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        return {
            x: Math.floor((worldX - offsetX) / thickness),
            y: Math.floor((worldZ - offsetZ) / thickness)
        };
    }

    /**
     * 월드 좌표 기준으로 해당 위치가 이동 가능한지(벽이 아닌지) 체크
     */
    _canMoveTo(worldX, worldZ) {
        const grid = this._worldToGrid(worldX, worldZ);

        // 미로 범위 체크
        if (grid.x < 0 || grid.x >= this.mazeGen.width || grid.y < 0 || grid.y >= this.mazeGen.height) {
            return false;
        }

        // 벽 체크 (0: 길, 1: 벽)
        return this.mazeGen.grid[grid.y][grid.x] === 0;
    }
}
