import * as THREE from 'three';
import { CONFIG, PLAYER_ACTION_STATES } from '../Config.js';
import { ASSETS } from '../Assets.js';

/**
 * 플레이어 캐릭터의 위치, 이동, 상태를 관리하는 클래스 (1인칭 전용)
 */
export class Player {
    constructor(scene, mazeGen, soundManager) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.sound = soundManager;

        // 중앙 관리를 위한 콜백 (PlayScene에서 할당)
        this.onHealthChanged = null;
        this.onDeath = null;

        // 플레이어 그룹 (카메라와 조명의 부모)
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // 상태 변수
        this.actionState = PLAYER_ACTION_STATES.IDLE;
        this.animationTime = 0;
        this.lastFootstepTime = 0;

        // 이동/회전/점프 제어용 변수
        this.isMoving = false;
        this.moveTimer = 0;
        this.startPos = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();

        this.isRotating = false;
        this.rotationTimer = 0;
        this.startRotationY = 0;
        this.targetRotationY = 0;

        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpHeight = CONFIG.PLAYER.JUMP_HEIGHT;
        this.jumpDuration = CONFIG.PLAYER.JUMP_DURATION;

        // 아이템 관련 상태
        this.inventory = {
            hasMap: false,
            hasFlashlight: false,
            hasSensor: false,
            jumpCount: 0,
            trapCount: 0,
            teleportCount: 0,
            disguiseCount: 0,
            c4Count: 0,
            itemOrder: [] // 아이템 획득 순서 추적
        };

        // Snapshot for retry
        this.checkpointState = null;

        // 손전등 및 충전 관련 상태
        this.flashlightTimer = 0;
        this.isFlashlightOn = false;

        // 사운드 센서 관련 상태
        this.sensorTimer = 0;
        this.isSensorOn = false;

        this.idleTimer = 0; // 대기 시간 측정용 타이머
        this.disguiseTimer = 0; // 좀비 위장 지속시간 타이머

        // 체격 상태
        this.health = CONFIG.PLAYER.MAX_HEALTH;
        this.maxHealth = CONFIG.PLAYER.MAX_HEALTH;
        this.damageCooldown = 0; // 대미지 무적 시간 타이머

        // 실시간 구역 상태 (안전 지대, 시작점)
        this.isInSafeZone = false;
        this.isInStartPoint = false;

        this.flashlight = this._initFlashlight();
    }

    /**
     * Create a checkpoint of current inventory and stats (start of stage)
     */
    saveCheckpoint() {
        this.checkpointState = {
            inventory: { ...this.inventory },
            flashlightTimer: this.flashlightTimer,
            sensorTimer: this.sensorTimer,
            disguiseTimer: this.disguiseTimer,
            health: this.health,
            itemOrder: [...this.inventory.itemOrder]
        };
        console.log("Player checkpoint saved:", this.checkpointState);
    }

    /**
     * Restore player state to checkpoint
     */
    restoreCheckpoint() {
        if (!this.checkpointState) return;

        this.inventory = { ...this.checkpointState.inventory };
        this.flashlightTimer = this.checkpointState.flashlightTimer;
        this.sensorTimer = this.checkpointState.sensorTimer;
        this.disguiseTimer = this.checkpointState.disguiseTimer;
        this.health = this.checkpointState.health;
        this.inventory.itemOrder = [...this.checkpointState.itemOrder];

        // Reset active states
        this.isFlashlightOn = false;
        this.isSensorOn = false;
        if (this.flashlight) this.flashlight.intensity = 0;

        console.log("Player state restored from checkpoint");
    }

    _initFlashlight() {
        const config = CONFIG.ITEMS.FLASHLIGHT;
        const light = new THREE.SpotLight(
            0xffffff,
            0, // 초기 강도 0
            config.DISTANCE,
            config.ANGLE,
            config.PENUMBRA
        );

        const pos = config.POSITION_OFFSET;
        const target = config.TARGET_OFFSET;

        light.position.set(pos.x, pos.y, pos.z);

        // 타일 조준점 초기화 (월드 좌표 추적을 위해 씬에 직접 추가)
        light.target.position.set(target.x, target.y, target.z);
        this.group.localToWorld(light.target.position);

        this.group.add(light);
        this.scene.add(light.target);
        return light;
    }


    /**
     * 위치 및 회전 초기화
     */
    reset(pos, angle) {
        this.group.position.set(pos.x, 0, pos.z);
        this.group.rotation.y = angle;

        this.isMoving = false;
        this.isRotating = false;
        this.isJumping = false;
        this.actionState = PLAYER_ACTION_STATES.IDLE;
        this.animationTime = 0;
        this.lastFootstepTime = 0; // 사운드 타이머 초기화
        this.idleTimer = 0;        // 대기 타이머 초기화
    }

    update(deltaTime) {
        // 1. 발소리 타이머 업데이트
        this.animationTime += deltaTime;

        // 2. 회전 처리
        if (this.isRotating) {
            this.rotationTimer += deltaTime;
            const progress = Math.min(this.rotationTimer / CONFIG.PLAYER.ROTATION_DURATION, 1);
            this.group.rotation.y = THREE.MathUtils.lerp(this.startRotationY, this.targetRotationY, progress);
            if (progress >= 1) {
                this.isRotating = false;
                this.group.rotation.y = this.targetRotationY; // Snap to target
            }
        }

        // 3. 이동 처리
        if (this.isMoving) {
            if (!this.isJumping) this.actionState = PLAYER_ACTION_STATES.MOVE;
            this.moveTimer += deltaTime;
            const progress = Math.min(this.moveTimer / this.moveDuration, 1);

            const currentY = this.group.position.y;
            this.group.position.lerpVectors(this.startPos, this.targetPos, progress);

            if (this.isJumping) {
                this.group.position.y = currentY;
            } else {
                // Head Bobbing logic
                const bobCfg = CONFIG.PLAYER.JUMP_EFFECT;
                this.group.position.y = Math.abs(Math.sin(this.animationTime * bobCfg.BOB_FREQUENCY)) * bobCfg.BOB_AMPLITUDE;
            }

            // 이동 중 발소리 (1인칭 연출용)
            if (!this.isJumping) {
                const walkSpeed = 12;
                if (this.animationTime - this.lastFootstepTime >= Math.PI / walkSpeed) {
                    if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.FOOTSTEP);
                    this.lastFootstepTime = this.animationTime;
                }
            }

            if (progress >= 1) {
                this.isMoving = false;
                this.group.position.copy(this.targetPos); // Snap to target
                if (!this.isJumping) {
                    this.actionState = PLAYER_ACTION_STATES.IDLE;
                    this.group.position.y = 0; // Reset bobbing strictly
                }
            }
        }

        // 4. 점프 처리
        if (this.isJumping) {
            this.actionState = PLAYER_ACTION_STATES.JUMP;
            this.jumpTimer += deltaTime;
            const progress = Math.min(this.jumpTimer / this.jumpDuration, 1);
            this.group.position.y = Math.sin(progress * Math.PI) * this.jumpHeight;

            if (progress >= 1) {
                this.isJumping = false;
                this.group.position.y = 0;
                this.actionState = this.isMoving ? PLAYER_ACTION_STATES.MOVE : PLAYER_ACTION_STATES.IDLE;
            }
        }


        // 5. 손전등 타이머 및 배터리 관리
        const flCfg = CONFIG.ITEMS.FLASHLIGHT;
        const isIdle = !this.isMoving && !this.isRotating && !this.isJumping;

        // Idle Swaying logic (Moved to CameraController)
        if (!isIdle) {
            this.group.rotation.z = 0;
        }

        // 5.2 손전등 독립 움직임 처리 (지연 및 흔들림)
        if (this.flashlight) {
            const flCfg = CONFIG.ITEMS.FLASHLIGHT;
            const movCfg = flCfg.MOVEMENT;

            // 이상적인 목표 지점 (로컬 -> 월드)
            const idealLocalTarget = new THREE.Vector3(
                flCfg.TARGET_OFFSET.x,
                flCfg.TARGET_OFFSET.y,
                flCfg.TARGET_OFFSET.z
            );

            // 미세한 손떨림(Sway) 추가
            const swayX = Math.sin(this.animationTime * movCfg.SWAY_FREQUENCY) * movCfg.SWAY_AMPLITUDE;
            const swayY = Math.cos(this.animationTime * movCfg.SWAY_FREQUENCY * 0.7) * movCfg.SWAY_AMPLITUDE;
            idealLocalTarget.x += swayX;
            idealLocalTarget.y += swayY;

            const idealWorldTarget = idealLocalTarget.clone();
            this.group.localToWorld(idealWorldTarget);

            // 지연 효과(Lag) 적용: 현재 위치에서 목표 위치로 서서히 이동
            this.flashlight.target.position.lerp(idealWorldTarget, deltaTime * movCfg.LAG_SPEED);
        }

        // 대기 시간(Idle) 추적
        if (isIdle) {
            this.idleTimer += deltaTime;
        } else {
            this.idleTimer = 0; // 움직임이 있으면 즉시 초기화
        }

        // 5.3 손전등 배터리 소모 및 충전
        if (this.isFlashlightOn && this.flashlightTimer > 0) {
            // 켜져 있을 때: 배터리 소모
            this.flashlightTimer -= deltaTime;

            if (this.flashlightTimer <= 0) {
                this.flashlightTimer = 0;
                this.isFlashlightOn = false;
                this.flashlight.intensity = 0;
                console.log("Flashlight battery dead");
            } else if (this.flashlightTimer < flCfg.FLICKER_THRESHOLD) {
                // 배터리 부족 시 깜빡임
                const flicker = Math.sin(Date.now() * 0.05) > 0.3 ? flCfg.INTENSITY : 0.2;
                this.flashlight.intensity = flicker;
            } else {
                this.flashlight.intensity = flCfg.INTENSITY;
            }
        } else {
            // 꺼져 있거나 배터리가 없을 때: 빛 끄기
            this.flashlight.intensity = 0;

            // 자동 충전 로직: OFF 상태 + 대기 시간 충족
            if (!this.isFlashlightOn && this.idleTimer >= flCfg.RECHARGE_DELAY && this.flashlightTimer < flCfg.DURATION) {
                const rechargeRate = flCfg.DURATION / flCfg.RECHARGE_DURATION;
                this.flashlightTimer = Math.min(this.flashlightTimer + rechargeRate * deltaTime, flCfg.DURATION);
            }
        }

        // 5.4 사운드 센서 배터리 소모 및 충전
        const sensorCfg = CONFIG.ITEMS.SENSOR;
        if (this.isSensorOn) {
            this.sensorTimer -= deltaTime;
            if (this.sensorTimer <= 0) {
                this.sensorTimer = 0;
                this.isSensorOn = false; // 방전 시 꺼짐
            }
        } else {
            // 자동 충전 로직: OFF 상태 + 대기 시간 충족
            if (this.idleTimer >= sensorCfg.RECHARGE_DELAY && this.sensorTimer < sensorCfg.DURATION) {
                const rechargeRate = sensorCfg.DURATION / sensorCfg.RECHARGE_DURATION;
                this.sensorTimer = Math.min(this.sensorTimer + rechargeRate * deltaTime, sensorCfg.DURATION);
            }
        }

        // 5.5 좀비 위장 타이머 관리
        if (this.disguiseTimer > 0) {
            this.disguiseTimer -= deltaTime;
            if (this.disguiseTimer <= 0) {
                this.disguiseTimer = 0;
                console.log("Zombie disguise expired");
            }
        }

        // 5.6 대미지 쿨다운 관리
        if (this.damageCooldown > 0) {
            this.damageCooldown -= deltaTime;
        }

        const regenCfg = CONFIG.PLAYER;
        if (isIdle && this.idleTimer >= regenCfg.REGEN_DELAY && this.health < this.maxHealth) {
            // 안전 지대에 있으면 회복률 증가
            const multiplier = this.isInSafeZone ? (CONFIG.MAZE.SAFE_ZONE.REGEN_MULTIPLIER || 5.0) : 1.0;
            this.health = Math.min(this.health + (regenCfg.REGEN_RATE * multiplier) * deltaTime, this.maxHealth);
            if (this.onHealthChanged) this.onHealthChanged(this.health);
        }
    }

    /**
     * 대미지 입기
     * @param {number} amount 
     * @returns {boolean} 사망 여부
     */
    takeDamage(amount) {
        if (this.damageCooldown > 0 || this.health <= 0) return false;

        this.health = Math.max(0, this.health - amount);
        this.damageCooldown = CONFIG.PLAYER.DAMAGE_COOLDOWN;
        this.idleTimer = 0; // 공격 당하면 대기 타이머 초기화 (체력 회복 지연)

        // 콜백 트리거
        if (this.onHealthChanged) this.onHealthChanged(this.health);
        if (this.health <= 0 && this.onDeath) this.onDeath();

        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.DAMAGE);
        console.log(`Player took ${amount} damage. Health: ${this.health}`);
        return this.health <= 0;
    }

    startMove(stepDir) {
        if (this.isMoving || this.isJumping) return false;

        const moveDistance = CONFIG.MAZE.WALL_THICKNESS;
        // 회전 중이라면 현재 회전이 아닌 '목표 회전(90도 단위)'을 기준으로 방향 계산
        const currentRotation = this.isRotating ? this.targetRotationY : this.group.rotation.y;

        // 방향 벡터 계산 (-z가 정면)
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentRotation);

        const nextPos = this.group.position.clone().add(direction.multiplyScalar(moveDistance * stepDir));

        if (!this.checkCollision(nextPos.x, nextPos.z)) {
            this.isMoving = true;
            this.moveTimer = 0;
            this.startPos.copy(this.group.position);
            this.targetPos.copy(nextPos);

            // 이동 소요 시간
            const baseDuration = CONFIG.PLAYER.MOVE_DURATION;
            this.moveDuration = this.isDisguised ? baseDuration / CONFIG.ITEMS.ZOMBIE_DISGUISE.SPEED_FACTOR : baseDuration;
            return true;
        }
        return false;
    }

    startRotation(angle) {
        if (this.isRotating || this.isJumping) return;
        this.isRotating = true;
        this.rotationTimer = 0;
        this.startRotationY = this.group.rotation.y;
        this.targetRotationY = this.startRotationY + angle;
    }

    startJump(isSpecial = false) {
        if (this.isJumping) return;

        // 특수 점프(버튼 클릭)인 경우 소모성 체크
        if (isSpecial) {
            if (this.inventory.jumpCount <= 0) return;
            this.inventory.jumpCount--;
            if (this.inventory.jumpCount <= 0) this._updateItemOrder('JUMP', false);
            this.jumpHeight = CONFIG.PLAYER.JUMP_HEIGHT * CONFIG.PLAYER.JUMP_EFFECT.SPECIAL_MULTIPLIER;
        } else {
            // 일반 점프 (스페이스바 등)
            this.jumpHeight = CONFIG.PLAYER.JUMP_HEIGHT;
        }

        this.isJumping = true;
        this.jumpTimer = 0;

        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.JUMP);
    }


    /**
     * 함정 설치 시도
     * @returns {THREE.Vector3|null} 설치 위치 반환 (실패 시 null)
     */
    placeTrap() {
        if (this.inventory.trapCount <= 0 || this.isMoving || this.isJumping) return null;

        this.inventory.trapCount--;
        if (this.inventory.trapCount <= 0) this._updateItemOrder('TRAP', false);
        console.log("Placing trap...");

        // 함정 설치 사운드 재생
        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.TRAP);

        return this.group.position.clone();
    }

    /**
     * C4 폭탄 설치 시도
     */
    useC4(callback) {
        if (this.inventory.c4Count <= 0 || this.isMoving || this.isJumping) return false;

        // 정면 그리드 방향 계산
        const dx = Math.round(-Math.sin(this.group.rotation.y));
        const dy = Math.round(-Math.cos(this.group.rotation.y));

        if (callback) {
            const success = callback(dx, dy);
            if (success) {
                this.inventory.c4Count--;
                if (this.inventory.c4Count <= 0) this._updateItemOrder('C4', false);
                return true;
            }
        }
        return false;
    }

    /**
     * 텔레포트 사용
     * @returns {boolean} 성공 여부
     */
    useTeleport() {
        if (this.inventory.teleportCount <= 0) return false;

        const radius = CONFIG.ITEMS.TELEPORT.RADIUS;
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const width = this.mazeGen.width;
        const height = this.mazeGen.height;

        // 현재 그리드 위치
        const offsetX = -(width * thickness) / 2;
        const offsetZ = -(height * thickness) / 2;
        const cx = Math.round((this.group.position.x - offsetX - thickness / 2) / thickness);
        const cy = Math.round((this.group.position.z - offsetZ - thickness / 2) / thickness);

        // 반경 내 이동 가능한 빈 타일 찾기
        const candidates = [];
        for (let y = cy - radius; y <= cy + radius; y++) {
            for (let x = cx - radius; x <= cx + radius; x++) {
                // 맵 범위 체크
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    // 현재 위치 제외
                    if (x === cx && y === cy) continue;
                    // 벽이 아닌 곳 (0: 길)
                    if (this.mazeGen.grid[y][x] === 0) {
                        // 거리 체크 (맨해튼 거리 or 유클리드 거리? 여기서는 타일 거리로 단순화)
                        const dist = Math.abs(x - cx) + Math.abs(y - cy);
                        if (dist <= radius) {
                            candidates.push({ x, y });
                        }
                    }
                }
            }
        }

        if (candidates.length === 0) {
            console.warn("No valid teleport target found!");
            return false;
        }

        // 랜덤 선택
        const target = candidates[Math.floor(Math.random() * candidates.length)];

        // 위치 이동
        const targetX = offsetX + target.x * thickness + thickness / 2;
        const targetZ = offsetZ + target.y * thickness + thickness / 2;

        this.group.position.set(targetX, 0.01, targetZ);

        // 아이템 소모
        this.inventory.teleportCount--;
        if (this.inventory.teleportCount <= 0) this._updateItemOrder('TELEPORT', false);
        console.log(`Teleported to [${target.x}, ${target.y}]`);

        // 텔레포트 사운드 재생
        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.TELEPORT);

        return true;
    }


    /**
     * 아이템 효과 적용
     */
    applyItemEffect(item) {
        switch (item.type) {
            case 'JUMP':
                this.inventory.jumpCount++;
                console.log("Jump item acquired!");
                break;
            case 'FLASHLIGHT':
                this.inventory.hasFlashlight = true;
                this.flashlightTimer = CONFIG.ITEMS.FLASHLIGHT.DURATION;
                // 기존에 껴져있었다면 바로 강도 적용, 아니면 대기
                if (this.isFlashlightOn) {
                    this.flashlight.intensity = CONFIG.ITEMS.FLASHLIGHT.INTENSITY;
                }
                console.log("Flashlight acquired/recharged!");
                break;
            case 'MAP':
                console.log("Map acquired!");
                break;
            case 'MAP_PIECE':
                console.log("Map piece acquired!", item.metadata);
                // 지도는 이제 소모성 조각 방식이므로 inventory 보관 대신 즉시 효과 발동
                // PlayScene에서 item.metadata.regionIndex를 사용하여 처리하도록 유도
                break;
            case 'TRAP':
                this.inventory.trapCount++;
                console.log("Trap acquired!");
                break;
            case 'TELEPORT':
                this.inventory.teleportCount++;
                console.log("Teleport scroll acquired!");
                break;
            case 'SENSOR':
                this.inventory.hasSensor = true;
                this.sensorTimer = CONFIG.ITEMS.SENSOR.DURATION;
                // 기존에 켜져있었다면 유지
                if (!this.isSensorOn && this.sensorTimer > 0) {
                    // 획득 시 자동 켜짐? or 수동? -> 플래시라이트처럼 일단 놔둠 (사용자 취향)
                    // 여기서는 굳이 자동 켜짐 안 함
                }
                console.log("Sound sensor acquired/recharged!");
                break;
            case 'ZOMBIE_DISGUISE':
                this.inventory.disguiseCount++;
                console.log("Zombie disguise acquired!");
                break;
            case 'C4':
                this.inventory.c4Count++;
                console.log("C4 Bomb acquired!");
                break;
        }

        // 아이템 순서 업데이트
        this._updateItemOrder(item.type, true);
    }

    /**
     * 아이템 순서 리스트 업데이트
     */
    _updateItemOrder(type, isAcquired) {
        if (isAcquired) {
            // 이미 있으면 순서를 맨 뒤로(가장 최근) 보내지 않고 유지할지, 아니면 갱신할지?
            // "획득한 순서대로"이므로 처음 얻었을 때 위치 유지하는 것이 일반적이나,
            // 완전히 소모했다가 다시 얻는 경우를 위해 소모 시 제거 로직과 병행.
            if (!this.inventory.itemOrder.includes(type)) {
                this.inventory.itemOrder.push(type);
            }
        } else {
            const index = this.inventory.itemOrder.indexOf(type);
            if (index > -1) {
                this.inventory.itemOrder.splice(index, 1);
            }
        }
    }

    /**
     * 손전등 온오프
     */
    toggleFlashlight() {
        if (!this.inventory.hasFlashlight || this.flashlightTimer <= 0) return false;

        this.isFlashlightOn = !this.isFlashlightOn;
        this.flashlight.intensity = this.isFlashlightOn ? CONFIG.ITEMS.FLASHLIGHT.INTENSITY : 0;

        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.FLASHLIGHT);
        return true;
    }

    /**
     * 사운드 센서 온오프 (배터리 있을 때만)
     */
    toggleSensor() {
        if (!this.inventory.hasSensor || this.sensorTimer <= 0) return false;

        this.isSensorOn = !this.isSensorOn;
        // 사운드 재생 (켜짐/꺼짐)
        if (this.sound) {
            this.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.SENSOR);
        }
        return true;
    }

    /**
     * 좀비 위장 아이템 사용
     */
    useDisguise() {
        if (this.inventory.disguiseCount <= 0 || this.disguiseTimer > 0) return false;

        this.inventory.disguiseCount--;
        if (this.inventory.disguiseCount <= 0) this._updateItemOrder('ZOMBIE_DISGUISE', false);
        this.disguiseTimer = CONFIG.ITEMS.ZOMBIE_DISGUISE.DURATION;
        console.log("Zombie disguise activated! Speed halved.");

        if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
        return true;
    }

    get isDisguised() {
        return this.disguiseTimer > 0;
    }

    /**
     * 몬스터가 인식할 수 없는 상태인지 여부
     */
    get isStealthed() {
        return this.isDisguised || this.isInSafeZone || this.isInStartPoint;
    }

    checkCollision(x, z) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const radius = CONFIG.PLAYER.PLAYER_RADIUS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        const points = [
            { x: x, z: z }, { x: x + radius, z: z }, { x: x - radius, z: z },
            { x: x, z: z + radius }, { x: x, z: z - radius }
        ];

        for (const p of points) {
            const gx = Math.floor((p.x - offsetX) / thickness);
            const gy = Math.floor((p.z - offsetZ) / thickness);
            if (gx < 0 || gx >= this.mazeGen.width || gy < 0 || gy >= this.mazeGen.height) return true;
            if (this.mazeGen.grid[gy][gx] === 1) return true;
        }
        return false;
    }

    get position() { return this.group.position; }
    get rotation() { return this.group.rotation; }
    get quaternion() { return this.group.quaternion; }

    /**
     * 시점 전환 대응 (모델 가시성 조절) - 3인칭 삭제로 더 이상 사용되지 않음
     */
    setVisibility(visible) {
        // 3인칭 모델 삭제로 아무 연동 없음
    }
}
