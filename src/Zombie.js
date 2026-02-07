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

        // 배회(Patrol) 관련 상태
        this.isPatrolling = false;
        this.patrolWaitTimer = 0;
        this.patrolTarget = null;
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

        // 2. 플레이어 감지 시 최우선 추적
        if (distInCells <= config.DETECTION_RANGE) {
            this.isPatrolling = false; // 배회 종료
            this.patrolTarget = null;

            if (this.state !== states.MOVE) {
                this.setState(states.MOVE);
            }

            // 길찾기 경로 업데이트 (주기적)
            if (this.animationTime - this.lastPathCalcTime > config.PATH_RECALC_INTERVAL) {
                this._calculatePath(player.group.position);
                this.lastPathCalcTime = this.animationTime;
            }
        }
        // 3. 플레이어 감지가 안 될 때의 자율 행동 (IDLE or PATROL)
        else {
            if (this.state === states.IDLE) {
                this.patrolWaitTimer -= deltaTime;
                if (this.patrolWaitTimer <= 0) {
                    this._startPatrol();
                }
            } else if (this.state === states.MOVE && this.isPatrolling) {
                // 배회 이동 중 도달 여부 체크
                if (!this.currentPath || this.pathIndex >= this.currentPath.length) {
                    this.setState(states.IDLE);
                    this.isPatrolling = false;
                    // 1~3초 대기 시간 설정
                    this.patrolWaitTimer = config.PATROL_WAIT_MIN + Math.random() * (config.PATROL_WAIT_MAX - config.PATROL_WAIT_MIN);
                }
            } else {
                // 추적 중이었으나 플레이어가 멀어진 경우
                this.setState(states.IDLE);
                this.isPatrolling = false;
                this.patrolWaitTimer = Math.random() * 2; // 즉시 배회하지 않도록 약간의 대기
                this.currentPath = null;
            }
        }

        // 4. 경로 추적 이동 처리 (추적이든 배회든 공통)
        if (this.state === states.MOVE) {
            this._moveAlongPath(deltaTime);
        }
    }

    /**
     * 경로를 따라 실제 이동 수행
     */
    _moveAlongPath(deltaTime) {
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) return;

        const config = CONFIG.MONSTERS.ZOMBIE;
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const targetNode = this.currentPath[this.pathIndex];
        const targetPos = this._gridToWorld(targetNode.x, targetNode.y);

        const direction = new THREE.Vector3(
            targetPos.x - this.position.x,
            0,
            targetPos.z - this.position.z
        );
        const distToNode = direction.length();

        if (distToNode > 0.05) {
            // 회전
            const targetAngle = Math.atan2(direction.x, direction.z);
            let angleDiff = targetAngle - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.rotation.y += angleDiff * deltaTime * 3.0;

            // 이동
            const moveStep = config.SPEED * thickness * deltaTime;
            const finalStep = Math.min(moveStep, distToNode);
            this.group.translateZ(finalStep);
        } else {
            this.pathIndex++;
        }
    }

    /**
     * 주변 반경 내 무작위 지점으로 배회 시작
     */
    _startPatrol() {
        const config = CONFIG.MONSTERS.ZOMBIE;
        const startIdx = this._worldToGrid(this.position.x, this.position.z);

        // 반경 3타일 내의 무작위 빈 칸 찾기 (최대 10번 시도)
        let targetX, targetY;
        let found = false;

        for (let i = 0; i < 10; i++) {
            const rx = Math.floor(Math.random() * (config.PATROL_RADIUS * 2 + 1)) - config.PATROL_RADIUS;
            const ry = Math.floor(Math.random() * (config.PATROL_RADIUS * 2 + 1)) - config.PATROL_RADIUS;

            targetX = startIdx.x + rx;
            targetY = startIdx.y + ry;

            // 미로 범위 체크 및 벽 여부 체크
            if (targetX >= 0 && targetX < this.mazeGen.width &&
                targetY >= 0 && targetY < this.mazeGen.height &&
                this.mazeGen.grid[targetY][targetX] === 0) {
                found = true;
                break;
            }
        }

        if (found) {
            const targetPos = this._gridToWorld(targetX, targetY);
            this._calculatePath(new THREE.Vector3(targetPos.x, 0, targetPos.z));

            if (this.currentPath) {
                this.isPatrolling = true;
                this.setState(CONFIG.MONSTERS.STATES.MOVE);
            }
        } else {
            // 못 찾으면 다시 대기
            this.patrolWaitTimer = 1.0;
        }
    }

    /**
     * 지정된 월드 위치까지의 경로 계산
     */
    _calculatePath(targetWorldPos) {
        const startIdx = this._worldToGrid(this.position.x, this.position.z);
        const endIdx = this._worldToGrid(targetWorldPos.x, targetWorldPos.z);

        const path = Pathfinder.findPath(this.mazeGen.grid, startIdx, endIdx);
        if (path) {
            this.currentPath = path;
            this.pathIndex = 1;
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
