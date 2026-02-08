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

        // 배회(Patrol) 관련 상태
        this.isPatrolling = false;
        this.patrolWaitTimer = 0;
        this.patrolTarget = null;

        // 타일 기반 이동 관련 상태
        this.isMovingTile = false;
        this.moveTimer = 0;
        this.startTilePos = new THREE.Vector3();
        this.targetTilePos = new THREE.Vector3();
        this.lastPathCalcTime = 0;

        this.sound = options.sound;
        this._initAudio();

        // 상태 이상 (Freeze)
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.originalColor = new THREE.Color(CONFIG.MONSTERS.ZOMBIE.COLOR);
        this.frozenColor = new THREE.Color(0x00ffff); // 얼었을 때 색상 (하늘색)
    }

    freeze(duration) {
        this.isFrozen = true;
        this.freezeTimer = duration;

        // 시각적 피드백: 색상 변경
        this._setBodyColor(this.frozenColor);

        // 이동 멈춤
        // this.setState(CONFIG.MONSTERS.STATES.IDLE); // 상태를 강제로 바꾸면 로직이 꼬일 수 있으니 플래그로 제어
    }

    _setBodyColor(color) {
        if (!this.model) return;
        this.model.traverse(child => {
            if (child.isMesh && child.material) {
                // 원래 색상을 보존하고 싶다면 복잡해지는데, 
                // 여기서는 단순하게 전체를 틴트하거나, 
                // CharacterBuilder에서 생성한 재질을 공유하지 않는다고 가정하고 변경.
                // 편의상 emissive를 사용하여 얼음 느낌을 냄
                if (color.equals(this.frozenColor)) {
                    child.material.emissive.setHex(0x0088ff);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    _initAudio() {
        // 사운드 매니저가 없어도 독립적인 오디오 객체 사용 시도
        const audioCfg = CONFIG.AUDIO;

        // 1. 배회 사운드 (Patrol) - 1회성
        this.patrolSFXUrl = audioCfg.ZOMBIE_PATROL_SFX;

        // 2. 추적 사운드 (Tracking) - HTML Audio 사용 (안정성 확보)
        this.trackAudio = new Audio(audioCfg.ZOMBIE_TRACK_SFX);
        this.trackAudio.loop = true;
        this.trackAudio.volume = 0;

        // 사운드 관련
        this.patrolSFXUrl = audioCfg.ZOMBIE_PATROL_SFX; // e.g. 'assets/sounds/zombie_moan.mp3'
        this.trackSFXUrl = audioCfg.ZOMBIE_TRACK_SFX;   // e.g. 'assets/sounds/zombie_growl.mp3'
        this.attackSFXUrl = audioCfg.ZOMBIE_ATTACK_SFX; // Assuming this exists in CONFIG.AUDIO

        // 현재 소리 재생 여부 추적 (레이더 표시용)
        this.soundCooldown = 0;

        // 추적용 발소리/그르렁 소리 루프 (HTMLAudioElement)
        this.trackAudio = new Audio(this.trackSFXUrl);
        this.trackAudio.loop = true;
        this.trackAudio.volume = 0;
    }

    _updateAudioVolumes(deltaTime) {
        // 사운드 객체가 없으면 아무것도 안 함
        if (!this.trackAudio) return;

        // 플레이어와의 거리 계산
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const dist = this.position.distanceTo(this.lastPlayerPos || new THREE.Vector3());
        const distInTiles = Math.ceil(dist / thickness);

        const isTracking = !this.isPatrolling && this.state === CONFIG.MONSTERS.STATES.MOVE;

        // 볼륨 계산 (공통 5단계 적용)
        let targetVolume = 0;
        const maxDist = CONFIG.MONSTERS.ZOMBIE.DETECTION_RANGE;
        targetVolume = this._calculateVolume(distInTiles, maxDist);

        // 글로벌 마스터 볼륨 적용 (SoundManager가 있다면)
        let masterVolume = 1.0;
        if (this.sound && typeof this.sound.masterVolume === 'number') {
            masterVolume = this.sound.masterVolume;
        }

        // 추적 사운드 제어
        if (isTracking && targetVolume > 0) {
            // 재생 중이 아니면 재생
            if (this.trackAudio.paused) {
                this.trackAudio.play().catch(e => {
                    // console.warn('Chase audio play failed (interaction required):', e);
                });
            }
            // 볼륨 부드럽게 적용 (선택) 혹은 즉시 적용
            this.trackAudio.volume = Math.max(0, Math.min(1, targetVolume * masterVolume));
        } else {
            // 정지 (pause)
            if (!this.trackAudio.paused) {
                this.trackAudio.pause();
                this.trackAudio.currentTime = 0; // 초기화
            }
        }
    }

    _initModel(options) {
        // 좀비 전용 상세 모델 생성
        this.model = CharacterBuilder.createZombie(options);
        this.group.add(this.model);

        // 부위별 참조 (피벗 그룹들)
        this.leftArm = this.model.getObjectByName('leftArm');
        this.rightArm = this.model.getObjectByName('rightArm');
        this.leftLeg = this.model.getObjectByName('leftLeg');
        this.rightLeg = this.model.getObjectByName('rightLeg');
        this.head = this.model.getObjectByName('headGroup');

        // 기본 자세 설정 (팔을 앞으로 뻗음)
        if (this.leftArm) this.leftArm.rotation.x = -Math.PI / 2.2;
        if (this.rightArm) this.rightArm.rotation.x = -Math.PI / 2.5;
    }

    _updateAnimation(deltaTime) {
        if (this.isFrozen) return; // 얼어있으면 애니메이션 정지

        const config = CONFIG.MONSTERS.ZOMBIE;
        const states = CONFIG.MONSTERS.STATES;

        // 1. 공통 머리 흔들림 (흐느적)
        if (this.head) {
            this.head.rotation.z = Math.sin(this.animationTime * 1.5) * 0.1;
            this.head.rotation.x = Math.cos(this.animationTime * 1.0) * 0.05;
        }

        // 2. 이동/대기 애니메이션
        if (this.state === states.MOVE || this.isMovingTile) {
            // 이동 시: 비틀거리며 걷기
            const walkCycle = this.animationTime * config.WALK_BOB_SPEED;

            // 몸 전체 흔들림 (Bobbing)
            const bob = Math.abs(Math.sin(walkCycle)) * config.WALK_BOB_AMPLITUDE;
            this.model.position.y = bob;

            // 다리 교차 흔들림 (피벗 방식이므로 0.6 정도가 적당)
            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.5;
            if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.5;

            // 팔도 위아래로 약간 흔들림
            if (this.leftArm) this.leftArm.rotation.x = -Math.PI / 2.2 + Math.sin(walkCycle * 0.5) * 0.1;
            if (this.rightArm) this.rightArm.rotation.x = -Math.PI / 2.5 + Math.cos(walkCycle * 0.5) * 0.1;

            // 몸의 좌우 흔들림 (비틀거림)
            this.model.rotation.z = Math.sin(walkCycle * 0.5) * 0.05;
        } else {
            // 대기 시: 몸이 앞뒤좌우로 미세하게 흔들림 (흐느적거림)
            const sway = Math.sin(this.animationTime * config.IDLE_SWAY_SPEED);
            this.model.rotation.z = sway * config.IDLE_SWAY_AMPLITUDE;
            this.model.rotation.x = Math.cos(this.animationTime * config.IDLE_SWAY_SPEED * 0.7) * config.IDLE_SWAY_AMPLITUDE;

            // 팔도 미세하게 까닥거림
            if (this.leftArm) this.leftArm.rotation.z = sway * 0.05;
            if (this.rightArm) this.rightArm.rotation.z = -sway * 0.05;
        }
    }

    _updateLogic(deltaTime, player) {
        if (!player) return;

        // 0. 상태 이상(빙결) 체크
        if (this.isFrozen) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                this._setBodyColor(this.originalColor); // 원상 복구
            } else {
                // 얼어있는 동안에는 로직(이동/추적) 정지
                return;
            }
        }

        this.lastPlayerPos = player.group.position;
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
        else if (!this.isMovingTile) { // 이동 중이 아닐 때만 자율 행동 판단
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
        // 타일 이동 중이거나 이동 상태인 경우
        if (this.state === states.MOVE || this.isMovingTile) {
            this._moveAlongPath(deltaTime);
        }
    }

    update(deltaTime, player) {
        if (!this.group.visible) return;

        this.animationTime += deltaTime;

        // 사운드 쿨다운 감소
        if (this.soundCooldown > 0) {
            this.soundCooldown -= deltaTime;
        }

        this._updateAnimation(deltaTime);
        this._updateLogic(deltaTime, player);
        this._updateAudioVolumes(deltaTime);
    }

    /**
     * 경로를 따라 실제 이동 수행 (타일 단위)
     */
    _moveAlongPath(deltaTime) {
        const config = CONFIG.MONSTERS.ZOMBIE;

        // 1. 타일 이동 중인 경우 (Lerp 처리)
        if (this.isMovingTile) {
            this.moveTimer += deltaTime;
            const progress = Math.min(this.moveTimer / config.MOVE_DURATION, 1);

            // 위치 Lerp
            this.position.lerpVectors(this.startTilePos, this.targetTilePos, progress);

            // 회전 Lerp (이동 방향 바라보기)
            const toTarget = new THREE.Vector3().subVectors(this.targetTilePos, this.startTilePos);
            const targetAngle = Math.atan2(toTarget.x, toTarget.z);
            let angleDiff = targetAngle - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            this.rotation.y += angleDiff * Math.min(deltaTime * 10, 1);

            if (progress >= 1) {
                this.isMovingTile = false;
                this.position.copy(this.targetTilePos);
                this.rotation.y = targetAngle; // 정확한 각도로 스냅
                this.pathIndex++;
            }
            return;
        }

        // 2. 새로운 타일 이동 시작 체크
        if (!this.currentPath || this.pathIndex >= this.currentPath.length) return;

        const targetNode = this.currentPath[this.pathIndex];
        const targetWorldPos = this._gridToWorld(targetNode.x, targetNode.y);
        const targetVec = new THREE.Vector3(targetWorldPos.x, 0, targetWorldPos.z);

        // 현재 위치와 다음 노드 위치가 같으면 건너뜀 (이미 도착해있는 노드인 경우)
        if (this.position.distanceTo(targetVec) < 0.01) {
            this.pathIndex++;
            return;
        }

        // 새로운 타일 이동 개시
        this.isMovingTile = true;
        this.moveTimer = 0;
        this.startTilePos.copy(this.position);
        this.targetTilePos.copy(targetVec);
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

                // 배회 시작 시 사운드 1회 재생
                if (this.sound) {
                    // 거리 기반 볼륨 계산 (공통 5단계 적용)
                    const maxDist = CONFIG.MONSTERS.ZOMBIE.PATROL_AUDIO_MAX_DIST || 5;
                    let volume = 0;

                    if (this.lastPlayerPos) {
                        const dist = this.position.distanceTo(this.lastPlayerPos);
                        const thickness = CONFIG.MAZE.WALL_THICKNESS;
                        const distInTiles = dist / thickness;

                        volume = this._calculateVolume(distInTiles, maxDist);
                    }

                    if (volume > 0.01) {
                        this.sound.playSFX(this.patrolSFXUrl, volume);
                        // 사운드 재생 중으로 표시 (약 2.0초)
                        this.soundCooldown = 2.0;
                    }
                }
            }
        } else {
            // 못 찾으면 다시 대기
            this.patrolWaitTimer = 1.0;
        }
    }

    /**
     * 지정된 월드 위치까지의 경로 계산
     */
    _calculatePath(targetWorldPos, isChase = true) {
        // 이동 중이라면 이동을 마친 후의 위치(targetTilePos)를 시작점으로 사용
        const checkPos = this.isMovingTile ? this.targetTilePos : this.position;
        const startIdx = this._worldToGrid(checkPos.x, checkPos.z);
        const endIdx = this._worldToGrid(targetWorldPos.x, targetWorldPos.z);

        const path = Pathfinder.findPath(this.mazeGen.grid, startIdx, endIdx);

        if (path && path.length > 0) {
            this.currentPath = path;
            // 이동 중(isMovingTile)인 경우: 
            // 현재 targetTilePos에 도착한 후, path[1]로 가야 함.
            // _moveAlongPath 끝에서 pathIndex++가 실행되므로, 0으로 세팅하여 도착 후 1이 되게 함.
            // 이동 중이 아닌 경우:
            // 현재 위치(path[0])에서 바로 path[1]로 이동 시작해야 하므로 1로 세팅.
            this.pathIndex = this.isMovingTile ? 0 : 1;

            if (isChase) {
                this.lastPathCalcTime = this.animationTime;
            }
        } else {
            if (isChase) {
                console.warn(`[Zombie] Path not found to player at ${endIdx.x}, ${endIdx.y}`);
            }
            this.currentPath = null;
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

    destroy() {
        if (this.trackAudio) {
            this.trackAudio.pause();
            this.trackAudio = null;
        }
        if (this.trackSoundController) {
            this.trackSoundController.stop();
            this.trackSoundController = null;
        }
        super.destroy();
    }

    /**
     * 거리 기반 단계별 볼륨 계산
     * - 거리는 타일 단위이며, 최대 거리(maxDist)만큼의 등분(단계)으로 나눔
     * - 예: maxDist=5 -> 5단계 (20%씩 감소)
     * - 예: maxDist=10 -> 10단계 (10%씩 감소)
     */
    _calculateVolume(distInTiles, maxDist) {
        if (distInTiles > maxDist) return 0;

        // 0.1~1.0 -> 1단계
        // 1.1~2.0 -> 2단계
        // ...
        const step = Math.ceil(distInTiles);

        // 최대 거리보다 작거나 같으면 해당 단계의 볼륨 반환
        // 1단계: (max - 0) / max = 1.0
        // 2단계: (max - 1) / max
        // ...
        // 5단계(max=5): (5 - 4) / 5 = 0.2
        const volume = (maxDist - (step - 1)) / maxDist;

        return Math.max(0, volume);
    }

    /**
     * 현재 소리를 내고 있는지 여부 반환 (레이더용)
     */
    get isMakingSound() {
        // 1. 일회성 SFX 재생 중 (쿨다운)
        if (this.soundCooldown > 0) return true;

        // 2. 추적 사운드 루프 재생 중 (volume > 0)
        if (this.trackAudio && !this.trackAudio.paused && this.trackAudio.volume > 0) {
            return true;
        }

        return false;
    }
}
