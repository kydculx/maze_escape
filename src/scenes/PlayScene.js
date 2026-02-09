import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';
import { MazeGenerator } from '../MazeGenerator.js';
import { MazeView } from '../MazeView.js';
import { UIManager } from '../UIManager.js';
import { Minimap } from '../Minimap.js';
import { Player } from '../Player.js';
import { CameraController } from '../CameraController.js';
import { ItemManager } from '../ItemManager.js';
import { StageManager } from '../StageManager.js';
import { MonsterManager } from '../MonsterManager.js';
import { TrapManager } from '../TrapManager.js';

/**
 * 게임 플레이 장면 클래스 (Orchestrator)
 */
export class PlayScene extends BaseScene {
    constructor(game) {
        super(game);
        console.log('[PlayScene] Constructor called');
        this.init();
    }

    init() {
        this._initScene();
    }

    _initScene() {
        // 1. 환경 설정 (안개)
        const fogCfg = CONFIG.ENVIRONMENT.FOG;
        this.scene.background = new THREE.Color(fogCfg.COLOR);
        this.scene.fog = new THREE.Fog(fogCfg.COLOR, fogCfg.NEAR, fogCfg.FAR);

        // 2. 조명 추가
        this._initLights();

        // 3. StageManager 먼저 초기화 (미로 크기 결정을 위해)
        this.stageManager = new StageManager();
        this.minimap = new Minimap();

        // 4. 미로 로직 및 뷰 초기화 (StageManager의 mazeSize 사용)
        this.mazeGen = new MazeGenerator(this.stageManager.mazeSize, this.stageManager.mazeSize);

        // 모양 결정 (레벨 기반 가용 모양 중 선택)
        const availableShapes = this._getAvailableShapes(this.stageManager.level);
        const shape = CONFIG.MAZE.SHAPE && availableShapes.includes(CONFIG.MAZE.SHAPE)
            ? CONFIG.MAZE.SHAPE
            : availableShapes[Math.floor(Math.random() * availableShapes.length)];

        this.mazeGen.applyShapeMask(shape);
        this.mazeGen.generateData();

        this.mazeView = new MazeView(this.scene);
        this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);

        // 5. 플레이어 초기화
        const startPos = this.mazeGen.getStartWorldPosition(CONFIG.MAZE);
        this.player = new Player(this.scene, this.mazeGen, this.game.sound);

        const initialAngle = this._calculateInitialAngle();
        this.player.reset(startPos, initialAngle);

        // 6. 카메라 및 매니저들
        this.cameraController = new CameraController(this.player, this.scene);
        this.camera = this.cameraController.camera;

        this._refreshFloorMesh();

        this.itemManager = new ItemManager(this.scene, this.mazeGen, CONFIG.ITEMS);
        this.itemManager.spawnItems();

        this.trapManager = new TrapManager(this.scene);

        this.monsterManager = new MonsterManager(this.scene, this.mazeGen, this.game.sound);

        // 레벨에 따른 좀비 생성 (레벨 1-5: 0마리, 이후 5레벨마다 +1, 최대 10마리)
        const zombieCount = Math.min(10, Math.max(0, Math.floor((this.stageManager.level - 1) / 5)));
        this.monsterManager.spawnZombies(zombieCount, this.stageManager.level);

        // 6. UI 매니저 초기화 및 바인딩
        this.ui = new UIManager(this.player, this.mazeGen, this.stageManager);
        this.ui.bindButtons({
            onHammer: () => this._useHammer(),
            onJump: () => {
                this.player.startJump(true);
                this.ui.updateAll();
            },
            onMap: () => this.resetMaze(),
            onCheat: () => {
                this.player.applyCheat();
                this.ui.updateAll();
            },
            onTrap: () => {
                const pos = this.player.placeTrap();
                if (pos) {
                    this.trapManager.placeTrap(pos);
                    this.ui.updateAll();
                    if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);
                }
            },
            onTeleport: () => {
                const success = this.player.useTeleport();
                if (success) {
                    this.ui.updateAll();
                    if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.8);
                }
            },
            onFlashlight: () => {
                this.player.toggleFlashlight();
                this.ui.updateAll();
            },
            onSensor: () => {
                this.player.toggleSensor();
                this.ui.updateAll();
            },
            onPrevStage: () => {
                this.stageManager.prevStage();
                this.resetMaze();
            },
            onNextStage: () => {
                this.stageManager.nextStage();
                this.resetMaze();
                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);
            }
        });

        this.ui.updateAll();
    }

    _initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.ENVIRONMENT.LIGHTING.AMBIENT_INTENSITY);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, CONFIG.ENVIRONMENT.LIGHTING.SUN_INTENSITY);
        sunLight.position.set(-50, 50, -50);
        this.scene.add(sunLight);
    }

    _calculateInitialAngle() {
        const directions = [
            { dx: 1, dy: 0, angle: -Math.PI / 2 }, // 동
            { dx: 0, dy: 1, angle: Math.PI },      // 남
            { dx: 0, dy: -1, angle: 0 },           // 북
            { dx: -1, dy: 0, angle: Math.PI / 2 }  // 서
        ];
        for (const dir of directions) {
            const nx = 0 + dir.dx; // 시작점 (0,1)의 다음 칸
            const ny = 1 + dir.dy;
            if (nx >= 0 && nx < this.mazeGen.width && ny >= 0 && ny < this.mazeGen.height) {
                if (this.mazeGen.grid[ny][nx] === 0) return dir.angle;
            }
        }
        return -Math.PI / 2;
    }

    resetMaze() {
        this._rebuildMaze();
        console.log(`Maze reset: ${this.stageManager.mazeSize}x${this.stageManager.mazeSize}`);
    }

    /**
     * 미로 재생성 공통 로직 (resetMaze, _gotoNextStage에서 사용)
     */
    _rebuildMaze() {
        const size = this.stageManager.mazeSize;
        this.mazeGen = new MazeGenerator(size, size);

        // 레벨에 따라 모양 결정
        const availableShapes = this._getAvailableShapes(this.stageManager.level);
        const shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
        this.mazeGen.applyShapeMask(shape);
        this.mazeGen.generateData();

        // 뷰 갱신
        this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);
        this._refreshFloorMesh();

        // 플레이어 위치 초기화
        const startPos = this.mazeGen.getStartWorldPosition(CONFIG.MAZE);
        const initialAngle = this._calculateInitialAngle();
        this.player.mazeGen = this.mazeGen;
        this.player.reset(startPos, initialAngle);

        // 매니저 동기화
        this.ui.mazeGen = this.mazeGen;
        if (this.itemManager) {
            this.itemManager.mazeGen = this.mazeGen;
            this.itemManager.spawnItems();
        }
        if (this.monsterManager) {
            this.monsterManager.mazeGen = this.mazeGen;
            this.monsterManager.clear();
            const zombieCount = Math.min(10, Math.max(0, Math.floor((this.stageManager.level - 1) / 5)));
            this.monsterManager.spawnZombies(zombieCount, this.stageManager.level);
        }
        if (this.trapManager) {
            this.trapManager.clear();
        }
        this.ui.updateAll();
    }


    _refreshFloorMesh() {
        const old = this.scene.getObjectByName('floor-mesh');
        if (old) {
            this.scene.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }

        // 전체 미로를 덮는 기본 베이스 바닥 (그림자 및 베이스용)
        const floorSize = Math.max(this.mazeGen.width, this.mazeGen.height) * CONFIG.MAZE.WALL_THICKNESS + 10;
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(floorSize, floorSize),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 })
        );
        floor.name = 'floor-mesh';
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0; // 타일들이 0.01에 있으므로 0에 배치
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    update(dt) {
        const deltaTime = Math.min(dt, 0.1);
        const input = this.game.input;

        // 1. 플레이어 업데이트
        this.player.update(deltaTime);

        // 1.1 스테이지 통계 업데이트 (시간)
        if (this.stageManager && this.stageManager.isStageActive) {
            this.stageManager.stageTime += deltaTime;
        }

        // 1.5 마법진 회전 애니메이션 (MazeView로 위임)
        if (this.mazeView) {
            this.mazeView.animateMarkers(deltaTime);
        }

        // 1.6 아이템 업데이트 및 충돌 체크
        if (this.itemManager) {
            this.itemManager.update(deltaTime);
            this.itemManager.checkCollisions(this.player.position, CONFIG.PLAYER.PLAYER_RADIUS, (item) => {
                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.ITEM_PICKUP_SFX_URL, 0.6);

                // 사운드 센서 아이템 처리
                if (item.type === 'SENSOR') {
                    // 효과는 Player에서 처리됨
                }

                this.player.applyItemEffect(item);
                this.ui.updateAll();
            });
        }

        // 1.6.5 사운드 센서 로직 (360도 레이더)
        if (this.player.isSensorOn) {
            const blips = [];

            if (this.monsterManager && this.monsterManager.monsters) {
                const playerPos = this.player.group.position;
                const playerRotation = this.player.group.rotation.y;
                // 플레이어 회전값: Three.js에서 y축 회전은 반시계 방향이 양수일 수 있음 (확인 필요)
                // 보통 -Math.atan2(dz, dx) - rotationY 로 계산

                for (const zombie of this.monsterManager.monsters) {
                    // 소리를 내고 있는 좀비만 감지
                    if (!zombie.isMakingSound) continue;

                    const maxAudioDist = CONFIG.MONSTERS.ZOMBIE.PATROL_AUDIO_MAX_DIST || CONFIG.MONSTERS.ZOMBIE.DETECTION_RANGE;
                    const dist = zombie.position.distanceTo(playerPos);
                    const distInTiles = dist / CONFIG.MAZE.WALL_THICKNESS;

                    if (distInTiles <= maxAudioDist) {
                        const dx = zombie.position.x - playerPos.x;
                        const dz = zombie.position.z - playerPos.z;

                        // 좀비의 절대 각도 (x, z 평면)
                        // Math.atan2(z, x) -> 0도가 x축 양의 방향
                        const angleToZombie = Math.atan2(dz, dx);

                        // 플레이어 기준 상대 각도
                        // 플레이어의 rotation.y가 바라보는 방향 (Three.js 기본: -Z축이 정면일 수 있음, 모델에 따라 다름)
                        // 현재 1인칭 카메라 로직상: rotation.y = 0 -> -Z 방향 (북쪽) 가정 시

                        // 상대 각도 계산: (좀비 각도) - (플레이어 각도)
                        // 단, 좌표계에 따라 보정이 필요함. 
                        // 일반적으로: relativeAngle = angleToZombie - playerRotation

                        // 일단 단순 차이로 전달하고 UIManager에서 시각화하며 조정
                        // 거리 비율 (0.0 ~ 1.0)
                        const distRadio = Math.min(1.0, distInTiles / maxAudioDist);

                        blips.push({
                            dx: dx,
                            dz: dz,
                            dist: dist,
                            rotation: playerRotation,
                            maxDist: maxAudioDist * CONFIG.MAZE.WALL_THICKNESS
                        });
                    }
                }
            }

            // 방전 임박 시 깜빡임 효과 (3초 전)
            let isRadarVisible = true;
            if (this.player.sensorTimer < CONFIG.ITEMS.SENSOR.FLICKER_THRESHOLD) {
                // 빠르게 깜빡임 (Flashlight과 유사한 속도)
                // Math.sin(Date.now() * 0.02) -> 주기 약 300ms
                isRadarVisible = Math.sin(Date.now() * 0.02) > 0;
            }

            this.ui.updateRadar(blips, isRadarVisible);
        } else {
            this.ui.updateRadar([], false);
        }

        // 1.7 몬스터 업데이트
        if (this.monsterManager) {
            this.monsterManager.update(deltaTime, this.player);
        }

        // 1.8 함정 업데이트
        if (this.trapManager && this.monsterManager) {
            this.trapManager.update(deltaTime, this.monsterManager.monsters);
        }

        // 1.9 안개 거리 동적 조정 (손전등 상태에 따라)
        if (this.scene.fog) {
            const fogCfg = CONFIG.ENVIRONMENT.FOG;
            const flCfg = CONFIG.ITEMS.FLASHLIGHT;
            const targetFar = this.player.isFlashlightOn ? fogCfg.FAR_FLASHLIGHT : fogCfg.FAR;
            // 부드럽게 전환 (Lerp)
            this.scene.fog.far += (targetFar - this.scene.fog.far) * deltaTime * flCfg.FOG_TRANSITION_SPEED;
        }

        // UI 상태 업데이트
        this.ui.updateAll();

        // 2. 스테이지 종료 체크 (출구 도달)
        this._checkStageCompletion();

        // 3. 카메라 컨트롤러 업데이트 (점프 효과 등)
        const jumpProgress = this.player.isJumping ? this.player.jumpTimer / this.player.jumpDuration : 0;
        this.cameraController.update(deltaTime, this.player.isJumping, jumpProgress);

        // 3. 사용자 입력 처리
        this._handleInput(input);

        // 4. 미니맵 업데이트
        if (this.minimap) {
            // 탐험 상태 업데이트
            this.mazeGen.markExplored(
                this.player.position.x,
                this.player.position.z,
                CONFIG.MAZE.WALL_THICKNESS,
                1 // 탐험 반경 (1칸)
            );

            this.minimap.draw(
                this.mazeGen.grid,
                this.mazeGen.explored,
                this.player.position,
                this.player.rotation.y,
                this.mazeGen.width,
                this.mazeGen.height,
                CONFIG.MAZE.WALL_THICKNESS,
                this.mazeGen.entrance,
                this.mazeGen.exit,
                this.monsterManager ? this.monsterManager.monsters : []
            );
        }
    }

    _handleInput(input) {
        if (this.player.isJumping) return;

        if (input.wasJustPressed('ArrowLeft')) {
            this.player.startRotation(Math.PI / 2);
            this.stageManager.isStageActive = true;
        }
        if (input.wasJustPressed('ArrowRight')) {
            this.player.startRotation(-Math.PI / 2);
            this.stageManager.isStageActive = true;
        }

        if (input.wasJustPressed('ArrowUp')) {
            if (this.player.startMove(1)) {
                this.stageManager.moveCount++;
                this.stageManager.isStageActive = true;
            }
        } else if (input.wasJustPressed('ArrowDown')) {
            if (this.player.startMove(-1)) {
                this.stageManager.moveCount++;
                this.stageManager.isStageActive = true;
            }
        }

        // 3. 점프 (Space 삭제 - 이제 아이템 버튼으로만 가능)

        // 4. 망치 사용 (E 키 또는 HUD 버튼)
        if (input.wasJustPressed('KeyE')) {
            this._useHammer();
        }

        // F키: 손전등 토글
        if (input.wasJustPressed('KeyF')) {
            if (this.player.toggleFlashlight()) {
                this.ui.updateAll();
            }
        }

        // T키: 사운드 센서 토글
        if (input.wasJustPressed('KeyT')) {
            if (this.player.toggleSensor()) {
                this.ui.updateAll();
            }
        }

        // 5. 스와이프 입력 처리
        const swipe = input.consumeSwipe();
        if (swipe) {
            switch (swipe) {
                case 'up': if (this.player.startMove(1)) {
                    this.stageManager.moveCount++;
                    this.stageManager.isStageActive = true;
                } break;
                case 'down': if (this.player.startMove(-1)) {
                    this.stageManager.moveCount++;
                    this.stageManager.isStageActive = true;
                } break;
                case 'left':
                    this.player.startRotation(Math.PI / 2);
                    this.stageManager.isStageActive = true;
                    break;
                case 'right':
                    this.player.startRotation(-Math.PI / 2);
                    this.stageManager.isStageActive = true;
                    break;
            }
        }
    }


    /**
     * 망치 사용 실질 로직
     */
    _useHammer() {
        if (!this.player || this.player.inventory.hammerCount <= 0) return;

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const width = this.mazeGen.width;
        const height = this.mazeGen.height;
        const offsetX = -(width * thickness) / 2;
        const offsetZ = -(height * thickness) / 2;

        // 현재 위치 좌표 계산 (Math.round를 써야 타일의 정중앙 인덱스가 잘 잡힘)
        const px = Math.round((this.player.group.position.x - offsetX - thickness / 2) / thickness);
        const py = Math.round((this.player.group.position.z - offsetZ - thickness / 2) / thickness);

        this.player.useHammer((dx, dy) => {
            const tx = px + dx;
            const ty = py + dy;

            console.log(`HAMMER ACTION: Player[${px}, ${py}] -> Target[${tx}, ${ty}] (Direction: ${dx}, ${dy})`);

            if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                const targetVal = this.mazeGen.grid[ty][tx];
                console.log(`Grid value at target: ${targetVal}`);

                if (targetVal === 1) {
                    // 1. 외곽 벽 보호
                    if (!CONFIG.ITEMS.HAMMER.CAN_BREAK_BOUNDARY) {
                        if (tx === 0 || tx === width - 1 || ty === 0 || ty === height - 1) {
                            console.warn("ACTION DENIED: Cannot break outer boundary walls!");
                            return;
                        }
                    }

                    // 2. 1겹 벽 제약 조건 체크 (뒤쪽 칸 확인)
                    if (!CONFIG.ITEMS.HAMMER.CAN_BREAK_THICK_WALLS) {
                        const bx = tx + dx;
                        const by = ty + dy;

                        // 뒤쪽 칸이 그리드 범위 안이고 & 거기에도 벽이 있다면? -> 두꺼운 벽임
                        if (bx >= 0 && bx < width && by >= 0 && by < height) {
                            if (this.mazeGen.grid[by][bx] === 1) {
                                console.warn(`ACTION DENIED: Wall at [${tx}, ${ty}] is too thick to break!`);
                                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.3); // 실패음 대용
                                return;
                            }
                        }
                    }

                    // 3. 미로 데이터 업데이트
                    this.mazeGen.grid[ty][tx] = 0;
                    this.player.inventory.hammerCount--;
                    this.stageManager.moveCount++; // 망치 사용도 이동(턴)으로 카운트
                    this.stageManager.isStageActive = true; // 망치질로도 스타트

                    console.log(`SUCCESS: Wall at [${tx}, ${ty}] destroyed. Refreshing visuals...`);

                    // 4. 시각적 메쉬 완전 갱신 (MazeView 로 위임)
                    this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);

                    // 5. UI 갱신 (UIManager 로 위임)
                    this.ui.updateAll();

                    if (this.game.sound) {
                        this.game.sound.playSFX(CONFIG.AUDIO.HAMMER_SFX_URL, 0.6);
                    }
                } else {
                    console.warn(`ACTION FAIL: No wall found at [${tx}, ${ty}] (Value: ${targetVal})`);
                }
            } else {
                console.error("ACTION FAIL: Target coordinates out of bounds!");
            }
        });
    }

    /**
     * 스테이지 완료 및 다음 스테이지 준비
     */
    _checkStageCompletion() {
        if (!this.player || !this.mazeGen) return;

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        const gx = Math.floor((this.player.position.x - offsetX) / thickness);
        const gy = Math.floor((this.player.position.z - offsetZ) / thickness);

        // 출구 셀에 도달하면 바로 다음 스테이지
        if (this.mazeGen.exit && gx === this.mazeGen.exit.x && gy === this.mazeGen.exit.y) {
            console.log("Stage Cleared!");
            this._gotoNextStage();
        }
    }

    _gotoNextStage() {
        if (this._isTransitioning) return;
        this._isTransitioning = true;

        // 효과음
        if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 1.0);

        // 스테이지 매니저 업데이트
        this.stageManager.nextStage();

        // 플레이어 상태 일부 초기화 (지도 등)
        this.stageManager.preparePlayerForNextStage(this.player);

        // 미로 재생성 (공통 로직 사용)
        this._rebuildMaze();

        setTimeout(() => {
            this._isTransitioning = false;
        }, 1000);
    }

    /**
     * 레벨에 따라 사용 가능한 미로 모양 목록 반환
     */
    _getAvailableShapes(level) {
        const pool = ['RECTANGLE'];
        if (level >= 2) pool.push('DIAMOND', 'CIRCLE', 'TRIANGLE');
        if (level >= 3) pool.push('STAR');
        if (level >= 5) pool.push('HEXAGON');
        if (level >= 7) pool.push('HEART');
        return pool;
    }

    /**
     * 장면 해제 및 리소스 정리
     */
    dispose() {
        if (this.monsterManager) {
            this.monsterManager.clear();
        }
        if (this.itemManager) {
            this.itemManager.clearItems();
        }
        if (this.trapManager) {
            this.trapManager.clear();
        }
        super.dispose();
    }
}
