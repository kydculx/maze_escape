import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { Pathfinder } from '../maps/Pathfinder.js';

/**
 * 모든 몬스터의 기본이 되는 베이스 클래스
 * 배회(patrol)와 추적(chase) 기본 동작 포함
 */
export class Monster {
    constructor(scene, mazeGen, type, options = {}) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.type = type;

        // 3D 그룹 (모델의 부모)
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // 상태 관리
        this.state = CONFIG.MONSTERS.STATES.IDLE;
        this.stateTimer = 0;
        this.animTime = 0;

        // 위치 및 방향
        this.position = this.group.position;
        this.rotation = this.group.rotation;

        // 이동 및 경로 찾기
        this.path = [];
        this.isMovingTile = false;
        this.moveTimer = 0;
        this.startTilePos = new THREE.Vector3();
        this.targetTilePos = new THREE.Vector3();
        this.lastPathCalcTime = 0;

        // 배회 (Patrol)
        this.isPatrolling = false;
        this.patrolWaitTimer = 0;
        this.patrolTarget = null;

        this._initModel(options);
    }

    /**
     * 상속받는 클래스에서 구현: 몬스터별 설정 반환
     */
    _getConfig() {
        throw new Error('_getConfig() must be implemented in subclass');
    }

    /**
     * 상속받는 클래스에서 구현: 모델 생성
     */
    _initModel(options) {
        // 기본 큐브 (Placeholder)
        const geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.25;
        this.group.add(mesh);
    }

    /**
     * 상태 변경
     */
    setState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateTimer = 0;
    }

    /**
     * 매 프레임 업데이트
     */
    update(deltaTime, player) {
        this.stateTimer += deltaTime;
        this.animTime += deltaTime;

        this._updateLogic(deltaTime, player);
        this._updateAnimation(deltaTime);
    }

    /**
     * AI 로직: 배회 vs 추적 결정
     */
    _updateLogic(deltaTime, player) {
        if (!player) return;

        const config = this._getConfig();
        const distToPlayer = this.position.distanceTo(player.position);
        const detectionRange = config.DETECTION_RANGE * CONFIG.MAZE.WALL_THICKNESS;

        // 플레이어 감지 (추적 모드)
        // 위장 상태일 때는 감지하지 않음
        const canDetect = !player.isDisguised && distToPlayer < detectionRange;

        if (canDetect) {
            this.state = CONFIG.MONSTERS.STATES.MOVE;
            this.isPatrolling = false;

            // 경로 재계산 (일정 간격으로)
            this.lastPathCalcTime += deltaTime;
            if (this.lastPathCalcTime >= config.PATH_RECALC_INTERVAL) {
                this._calculatePath(player.position, true);
                this.lastPathCalcTime = 0;
            }
        } else {
            // 배회 모드
            if (!this.isPatrolling && (!this.path || this.path.length === 0)) {
                this._startPatrol();
            }
        }

        // 경로를 따라 이동
        if (this.path && this.path.length > 0) {
            this._moveAlongPath(deltaTime);
        } else if (this.isPatrolling) {
            // 배회 대기
            this.patrolWaitTimer -= deltaTime;
            if (this.patrolWaitTimer <= 0) {
                this._startPatrol();
            }
        }
    }

    /**
     * 주변 반경 내 무작위 지점으로 배회 시작
     */
    _startPatrol() {
        const config = this._getConfig();
        const patrolRadius = config.PATROL_RADIUS;

        // 현재 위치에서 무작위 방향으로 patrolRadius 타일 이내의 목표 설정
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * patrolRadius;

        const offsetX = Math.cos(angle) * dist * CONFIG.MAZE.WALL_THICKNESS;
        const offsetZ = Math.sin(angle) * dist * CONFIG.MAZE.WALL_THICKNESS;

        const targetWorldPos = new THREE.Vector3(
            this.position.x + offsetX,
            0,
            this.position.z + offsetZ
        );

        // 해당 위치가 이동 가능한지 확인
        if (!this._canMoveTo(targetWorldPos.x, targetWorldPos.z)) {
            // 이동 불가능하면 다시 시도
            this.patrolWaitTimer = Math.random() * (config.PATROL_WAIT_MAX - config.PATROL_WAIT_MIN) + config.PATROL_WAIT_MIN;
            return;
        }

        // 경로 계산
        this._calculatePath(targetWorldPos, false);

        if (this.path && this.path.length > 0) {
            this.isPatrolling = true;
            this.state = CONFIG.MONSTERS.STATES.MOVE;
        } else {
            // 경로를 찾지 못하면 대기
            this.patrolWaitTimer = Math.random() * (config.PATROL_WAIT_MAX - config.PATROL_WAIT_MIN) + config.PATROL_WAIT_MIN;
        }
    }

    /**
     * 지정된 월드 위치까지의 경로 계산
     */
    _calculatePath(targetWorldPos, isChase = true) {
        const [sx, sy] = this._worldToGrid(this.position.x, this.position.z);
        const [ex, ey] = this._worldToGrid(targetWorldPos.x, targetWorldPos.z);

        // Pathfinder는 static 메서드 사용
        const gridPath = Pathfinder.findPath(
            this.mazeGen.grid,
            { x: sx, y: sy },
            { x: ex, y: ey }
        );

        if (gridPath && gridPath.length > 1) {
            // 첫 번째 타일은 현재 위치이므로 제외
            this.path = gridPath.slice(1).map(tile => {
                const [wx, wz] = this._gridToWorld(tile.x, tile.y);
                return { wx, wz };
            });
        } else {
            this.path = [];
            if (isChase) {
                this.isPatrolling = false;
            }
        }
    }

    /**
     * 경로를 따라 실제 이동 수행 (타일 단위)
     */
    _moveAlongPath(deltaTime) {
        const config = this._getConfig();

        if (!this.isMovingTile) {
            // 다음 타일로 이동 시작
            if (this.path.length === 0) {
                this.isMovingTile = false;
                return;
            }

            const nextTile = this.path.shift();
            this.startTilePos.copy(this.position);
            this.targetTilePos.set(nextTile.wx, 0, nextTile.wz);

            // 이동 방향 계산 및 즉시 회전
            const toTarget = new THREE.Vector3().subVectors(this.targetTilePos, this.startTilePos);
            if (toTarget.length() > 0.01) {
                const targetAngle = Math.atan2(toTarget.x, toTarget.z);
                this.group.rotation.y = targetAngle;
            }

            this.isMovingTile = true;
            this.moveTimer = 0;
        }

        // 타일 이동 진행
        this.moveTimer += deltaTime;
        const progress = Math.min(this.moveTimer / config.MOVE_DURATION, 1.0);

        // 위치 Lerp
        this.position.lerpVectors(this.startTilePos, this.targetTilePos, progress);

        if (progress >= 1.0) {
            this.position.copy(this.targetTilePos);
            this.isMovingTile = false;
        }
    }

    /**
     * 월드 좌표를 그리드 좌표로 변환
     */
    _worldToGrid(worldX, worldZ) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        return [
            Math.floor((worldX - offsetX) / thickness),
            Math.floor((worldZ - offsetZ) / thickness)
        ];
    }

    /**
     * 그리드 좌표를 월드 좌표로 변환
     */
    _gridToWorld(gridX, gridY) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        return [
            offsetX + gridX * thickness + thickness / 2,
            offsetZ + gridY * thickness + thickness / 2
        ];
    }

    /**
     * 월드 좌표 기준으로 해당 위치가 이동 가능한지(벽이 아닌지) 체크
     */
    _canMoveTo(worldX, worldZ) {
        const [gx, gy] = this._worldToGrid(worldX, worldZ);
        if (gx < 0 || gx >= this.mazeGen.width || gy < 0 || gy >= this.mazeGen.height) {
            return false;
        }
        return this.mazeGen.grid[gy][gx] === 0;
    }

    /**
     * 상속받는 클래스에서 구현: 애니메이션 로직
     */
    _updateAnimation(deltaTime) {
        // Override in subclass
    }

    /**
     * 제거
     */
    destroy() {
        this.scene.remove(this.group);
        // 지오메트리, 재질 메모리 해제 로직 추가 가능
    }
}
