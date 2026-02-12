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

        // Common Monster Properties (Speed, Freeze, etc.)
        this._initCommonProperties(options);

        // Attack logic
        this.onAttack = options.onAttack;
        this.attackTimer = 0;

        this._initModel(options);
    }

    /**
     * 상속받는 클래스에서 구현: 몬스터별 설정 반환
     */
    _getConfig() {
        throw new Error('_getConfig() must be implemented in subclass');
    }

    /**
     * 공통 속성 초기화 (속도, 프리즈 상태 등)
     */
    _initCommonProperties(options) {
        // 1. 속도 계산
        const config = this._getConfig();
        const level = options.level || 1;
        const baseSpeed = config.SPEED;
        const speedIncrease = config.SPEED_INCREASE_PER_LEVEL || 0;
        const maxMultiplier = config.MAX_SPEED_MULTIPLIER || 1;

        const speedMultiplier = Math.min(maxMultiplier, 1 + (level * speedIncrease));
        this.speed = baseSpeed * speedMultiplier;

        console.log(`${this.type} spawned at level ${level}: speed ${this.speed.toFixed(2)}x (base: ${baseSpeed}, multiplier: ${speedMultiplier.toFixed(2)})`);

        // 2. Freeze 상태
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.frozenColor = new THREE.Color(0x00ffff);

        // 3. 원래 색상 (옵션 또는 Config)
        if (options.color) {
            this.originalColor = new THREE.Color(options.color);
        } else if (config.COLOR) {
            this.originalColor = new THREE.Color(config.COLOR);
        } else {
            this.originalColor = new THREE.Color(0xffffff);
        }

        // 4. 오디오
        this.sound = options.sound;
        // _initAudio()는 자식 클래스에서 호출하거나 여기서 호출할 수도 있음.
        // 하지만 자식 클래스에서 URL을 설정한 후 _initAudioSystem을 호출하는 패턴을 유지.
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
        this.model = mesh; // 기본 모델 참조 설정
    }

    /**
     * 몬스터 얼리기 (일시 정지)
     */
    freeze(duration) {
        this.isFrozen = true;
        this.freezeTimer = duration;
        this._setBodyColor(this.frozenColor);
        this.isMovingTile = false;
        this.path = [];
    }

    /**
     * 몬스터 몸체 색상 변경 (재귀적)
     */
    _setBodyColor(color) {
        if (!this.model) return;

        // 모델 내부의 모든 Mesh의 Material 색상을 변경
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Emissive 방식 (Zombie) vs Color 방식 (Wolf) 통합 필요
                // 여기서는 Emissive 방식을 기본으로 하고, 필요시 Override

                // 1. 기존 Wolf 방식 (Color 변경)
                // child.material.color.copy(color);

                // 2. 기존 Zombie 방식 (Emissive 변경 - Frozen 효과에 더 적합)
                if (color.equals(this.frozenColor)) {
                    // 얼음 효과
                    child.material.emissive.setHex(0x0088ff);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    // 원래대로 복구
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;

                    // 원래 색상 복구 (만약 색상 자체를 바꿨었다면)
                    if (this.originalColor) {
                        child.material.color.copy(this.originalColor);
                    }
                }
            }
        });
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
        // Freeze 상태 처리
        if (this.isFrozen) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                this._setBodyColor(this.originalColor);
            }
            // Frozen 상태에서도 애니메이션/로직을 멈추거나, 
            // 현재 구조상 return하면 아래 로직들(이동, 애니메이션 등)이 실행 안됨 -> 의도된 동작
            return;
        }

        this.stateTimer += deltaTime;
        this.animTime += deltaTime;

        this._updateLogic(deltaTime, player);
        this._updateAnimation(deltaTime);
        this._updateAudioVolumes(deltaTime, player);

        // 미니맵 마커 업데이트 (공통)
        if (this.minimapMarker) {
            this.minimapMarker.position.copy(this.position);
        }
    }

    /**
     * AI 로직: 배회 vs 추적 결정
     */
    _updateLogic(deltaTime, player) {
        if (!player) return;

        const config = this._getConfig();
        const distToPlayer = this.position.distanceTo(player.position);
        const detectionRange = config.DETECTION_RANGE * CONFIG.MAZE.WALL_THICKNESS;

        // 공격 쿨다운 업데이트
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }

        // 플레이어 감지 (추적 모드)
        // 위장 상태일 때는 감지하지 않음
        const canDetect = !player.isDisguised && distToPlayer < detectionRange;

        if (canDetect) {
            this.state = CONFIG.MONSTERS.STATES.MOVE;
            this.isPatrolling = false;

            // --- 공격 로직 추가 ---
            if (this.attackTimer <= 0 && distToPlayer < (config.ATTACK_RANGE || 0.8)) {
                this.attack();
                this.attackTimer = config.ATTACK_COOLDOWN || 2;
            }
            // ------------------

            // 경로 재계산 (일정 간격으로)
            this.lastPathCalcTime += deltaTime;
            if (this.lastPathCalcTime >= config.PATH_RECALC_INTERVAL) {
                this._calculatePath(player.position, true);
                this.lastPathCalcTime = 0;
            }
        } else {
            // 추적 중이었다가 놓친 경우 (위장 등) -> 즉시 정지 및 배회 전환
            if (this.state === CONFIG.MONSTERS.STATES.MOVE && !this.isPatrolling) {
                this.path = [];
                this.lastPathCalcTime = 0;
                this.state = CONFIG.MONSTERS.STATES.IDLE; // 잠시 멈춤
                console.log("Monster lost track of player (Disguise/Range)");
            }

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
     * 플레이어 공격
     */
    attack() {
        console.log(`[Monster] ${this.type} attacks player!`);
        this.setState(CONFIG.MONSTERS.STATES.ATTACK);

        // 공격 사운드 재생
        if (this.sound && this.attackSFXUrl) {
            this.sound.playSFX(this.attackSFXUrl);
        }

        // 공격 콜백 호출 (PlayScene에서 화면 효과 처리)
        if (this.onAttack) {
            this.onAttack(this);
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
        // Calculate duration based on tiles per second (this.speed)
        // Ensure this.speed is at least 0.01 to avoid division by zero
        const moveDuration = 1.0 / Math.max(0.01, this.speed);

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
        const progress = Math.min(this.moveTimer / moveDuration, 1.0);

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
    _initAudioSystem() {
        if (!this.sound) return;

        // SoundManager 사운드 컨트롤러 사용 (autoPlay 사용)
        if (this.trackSFXUrl) {
            this.trackSoundController = this.sound.playLoop(this.trackSFXUrl, 0, true);
        }
        if (this.patrolSFXUrl) {
            this.patrolSoundController = this.sound.playLoop(this.patrolSFXUrl, 0, true);
        }
    }

    /**
     * 거리 및 상태에 따른 오디오 볼륨 업데이트 (공통 로직)
     */
    _updateAudioVolumes(deltaTime, player) {
        if (!player) return;
        if (!this.trackSoundController && !this.patrolSoundController) return;

        const distInTiles = this.position.distanceTo(player.position) / CONFIG.MAZE.WALL_THICKNESS;
        const config = this._getConfig();
        const maxDist = config.DETECTION_RANGE;
        // 배회 사운드는 감지 거리보다 조금 더 멀리까지 들리게 설정 (예: 2배)
        const patrolMaxDist = config.PATROL_AUDIO_MAX_DIST || (maxDist);

        const isTracking = !this.isPatrolling && this.state === CONFIG.MONSTERS.STATES.MOVE;
        const isPatrolling = this.state === CONFIG.MONSTERS.STATES.IDLE || this.isPatrolling;

        // --- 추격 사운드 처리 ---
        if (this.trackSoundController) {
            let trackVolume = this._calculateVolume(distInTiles, maxDist);
            const sfxVolume = this.sound.sfxVolume || 1.0;

            if (isTracking && trackVolume > 0) {
                // Ensure sound is playing
                if (!this.trackSoundController.isPlaying) {
                    this.trackSoundController.play();
                }

                this.trackSoundController.setVolume(trackVolume * sfxVolume);

                // 추격 중엔 배회 사운드 끄기
                if (this.patrolSoundController && this.patrolSoundController.isPlaying) {
                    this.patrolSoundController.stop();
                }
            } else {
                if (this.trackSoundController.isPlaying) {
                    this.trackSoundController.stop();
                }
            }
        }

        // --- 배회/대기 사운드 처리 ---
        // 추격 중이 아닐 때만 재생
        if (!isTracking && this.patrolSoundController) {
            if (isPatrolling && (!this.path || this.path.length === 0)) {
                let patrolVolume = this._calculateVolume(distInTiles, patrolMaxDist);
                // 배회 소리는 추격 소리보다 약간 작게 (0.7배) - 부드럽게 들리도록
                patrolVolume *= 0.7;
                const sfxVolume = this.sound.sfxVolume || 1.0;

                if (patrolVolume > 0) {
                    if (!this.patrolSoundController.isPlaying) {
                        this.patrolSoundController.play();
                    }
                    this.patrolSoundController.setVolume(patrolVolume * sfxVolume);
                } else {
                    if (this.patrolSoundController.isPlaying) this.patrolSoundController.stop();
                }
            } else {
                if (this.patrolSoundController.isPlaying) this.patrolSoundController.stop();
            }
        }
    }

    /**
     * 거리별 볼륨 계산 (Smooth Linear)
     */
    _calculateVolume(distInTiles, maxDist) {
        if (distInTiles >= maxDist) return 0;
        return Math.max(0, 1.0 - (distInTiles / maxDist));
    }

    /**
     * 사운드 재생 중인지 확인
     */
    isMakingSound() {
        if (this.trackSoundController && this.trackSoundController.isPlaying) return true;
        // if (this.patrolSoundController && this.patrolSoundController.isPlaying) return true; // 필요시 주석 해제
        return false;
    }

    /**
     * 제거
     */
    destroy() {
        if (this.group) {
            this.group.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.scene.remove(this.group);
        }

        // 오디오 정리
        if (this.trackSoundController) {
            this.trackSoundController.stop();
        }
        if (this.patrolSoundController) {
            this.patrolSoundController.stop();
        }
    }
}
