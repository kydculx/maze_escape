import * as THREE from 'three';
import { STATES } from '../GameState.js';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';
import { MazeGenerator } from '../maps/MazeGenerator.js';
import { MazeView } from '../maps/MazeView.js';
import { UIManager } from '../UIManager.js';
import { Minimap } from '../maps/Minimap.js';
import { Player } from '../player/Player.js';
import { CameraController } from '../player/CameraController.js';
import { ItemManager } from '../items/ItemManager.js';
import { StageManager } from '../StageManager.js';
import { MonsterManager } from '../MonsterManager.js';
import { TrapManager } from '../maps/TrapManager.js';
import { SaveManager } from '../SaveManager.js';

/**
 * 게임 플레이 장면 클래스 (Orchestrator)
 */
export class PlayScene extends BaseScene {
    constructor(game, progress = null) {
        super(game);
        console.log('[PlayScene] Constructor called');
        this.savedProgress = progress; // 저장된 진행 상황 보관
        this.init();
    }

    init() {
        this._initScene();

        // Visibility Change Handler (Auto-pause on background)
        this._onVisibilityChange = () => {
            if (document.hidden && this.game.state.is(STATES.PLAYING)) {
                // If game goes to background while playing, show menu (which pauses game)
                if (this.ui) this.ui.showMenu();
                // Trigger pause logic via UI toggle
                // Since showMenu just removing 'hidden' class, we need to ensure pause is triggered.
                // Our modified UI.toggleMenu handles pause when menu is visible.
                // But showMenu() might not trigger the toggle logic directly if we just called it.
                // Let's explicitly pause if we show menu.
                if (this.ui && !this.ui.elements.menuPopup.classList.contains('hidden')) {
                    this.game.state.pauseGame();
                    if (this.game.sound) this.game.sound.pauseAll();
                }
            }
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);
    }

    _initScene() {
        // 1. 환경 설정 (안개)
        // 1. 환경 설정 (안개)
        const fogCfg = CONFIG.MAZE.FOG;
        this.scene.background = new THREE.Color(fogCfg.COLOR);
        this.scene.fog = new THREE.Fog(fogCfg.COLOR, fogCfg.NEAR, fogCfg.FAR);

        // 2. 조명 추가
        this._initLights();

        // 3. StageManager 먼저 초기화 (미로 크기 결정을 위해)
        this.stageManager = new StageManager();

        // 저장된 진행 상황이 있으면 해당 스테이지로 시작
        if (this.savedProgress) {
            this.stageManager.level = this.savedProgress.highestStage;
            // 레벨에 맞는 미로 크기 계산
            this.stageManager.mazeSize = Math.min(
                CONFIG.STAGE.INITIAL_SIZE + (this.savedProgress.highestStage - 1) * CONFIG.STAGE.SIZE_INCREMENT,
                CONFIG.STAGE.MAX_SIZE
            );
            console.log(`[PlayScene] Loading saved stage: ${this.savedProgress.highestStage}, maze size: ${this.stageManager.mazeSize}`);
        }

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

        // 저장된 아이템 로드
        if (this.savedProgress && this.savedProgress.items) {
            this._loadSavedItems(this.savedProgress.items);
            console.log('[PlayScene] Loaded saved items:', this.savedProgress.items);
        }

        // 6. 카메라 및 매니저들
        this.cameraController = new CameraController(this.player, this.scene);
        this.camera = this.cameraController.camera;

        this._refreshFloorMesh();

        this.itemManager = new ItemManager(this.scene, this.mazeGen, CONFIG.ITEMS);

        // 레벨에 따른 아이템 개수 (레벨 1: 3-5개, 이후 레벨당 +1, 최대 20개)
        const baseItems = 3;
        const itemCount = Math.min(20, baseItems + Math.floor(this.stageManager.level / 2));
        this.itemManager.spawnItems(itemCount);

        this.trapManager = new TrapManager(this.scene);

        this.monsterManager = new MonsterManager(this.scene, this.mazeGen, this.game.sound);

        // 레벨에 따른 좀비 생성 (레벨 1-5: 0마리, 이후 5레벨마다 +1, 최대 10마리)
        const zombieCount = Math.min(10, Math.max(0, Math.floor((this.stageManager.level - 1) / 5)));
        this.monsterManager.spawnZombies(zombieCount, this.stageManager.level);

        // Save initial checkpoint
        if (this.player) this.player.saveCheckpoint();

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
                if (this.itemManager) {
                    this.itemManager.spawnNearbyItems(this.player.position, this.stageManager.level);
                }
                if (this.minimap) {
                    this.minimap.showMonsters = true;
                }
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
            onDisguise: () => {
                const success = this.player.useDisguise();
                if (success) this.ui.updateAll();
            },
            onPrevStage: () => {
                this.stageManager.prevStage();
                this.resetMaze();
            },
            onNextStage: () => {
                this.stageManager.nextStage();

                // 새로운 최고 스테이지 도달 시 저장
                const currentItems = this._getCurrentItems();
                SaveManager.saveProgress(this.stageManager.level, currentItems);
                console.log(`[PlayScene] Progress saved: Stage ${this.stageManager.level}`);

                this.resetMaze();
                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);
            },
            onRestart: () => {
                console.log("Restarting current stage...");
                this.game.state.resumeGame(); // Ensure game is running
                if (this.game.sound) this.game.sound.resumeAll();

                // Restore player state to start of stage
                if (this.player) this.player.restoreCheckpoint();
                // Reset stage stats (time, moves) - managed by StageManager or here?
                // StageManager.resetStats() clears everything, but we might want to keep total game time?
                // For now, let's reset stage specific stats in StageManager
                this.stageManager.resetStats();

                this.resetMaze();
                if (this.game.sound) {
                    this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);
                    this.game.sound.playBGM(CONFIG.AUDIO.BGM_URL, CONFIG.AUDIO.DEFAULT_BGM_VOLUME);
                }
            },
            onMainMenu: () => {
                console.log("Going to Main Menu...");
                this.game.state.resumeGame(); // Reset pause state
                if (this.game.sound) this.game.sound.resumeAll();

                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);

                // Switch scene and state
                this.game.sceneManager.setScene(STATES.MAIN_MENU);
                this.game.state.set(STATES.MAIN_MENU);
                if (this.game.sound) {
                    this.game.sound.playBGM(CONFIG.AUDIO.BGM_URL, CONFIG.AUDIO.DEFAULT_BGM_VOLUME);
                }

                // UI 정리
                document.getElementById('ui-overlay').style.display = 'none';
                document.getElementById('item-actions').style.display = 'none';
                document.getElementById('cheat-hud').style.display = 'none';
                document.getElementById('minimap-container').style.display = 'none';
                document.getElementById('radar-container').style.display = 'none';
                document.getElementById('disguise-overlay').style.display = 'none';

                // Continue 버튼 상태 업데이트
                if (this.game.updateContinueButton) {
                    this.game.updateContinueButton();
                    console.log('[PlayScene] Updated Continue button state');
                }

                // Show Main Menu
                const mainMenu = document.getElementById('main-menu-screen');
                if (mainMenu) {
                    mainMenu.classList.remove('hidden');
                    // Ensure it's visible if hidden via CSS directly
                    mainMenu.style.display = 'flex';
                }
            }
        });

        // 설정 창 초기화
        this.ui.initSettings(this.game.sound);

        // Override UIManager internal toggle logic to hook into pause system
        const originalToggleMenu = this.ui.toggleMenu.bind(this.ui);
        this.ui.toggleMenu = () => {
            originalToggleMenu();
            const isMenuVisible = !this.ui.elements.menuPopup.classList.contains('hidden');
            if (isMenuVisible) {
                this.game.state.pauseGame();
                if (this.game.sound) this.game.sound.pauseAll();
            } else {
                this.game.state.resumeGame();
                if (this.game.sound) this.game.sound.resumeAll();
            }
        };

        const originalHideMenu = this.ui.hideMenu.bind(this.ui);
        this.ui.hideMenu = () => {
            originalHideMenu();
            this.game.state.resumeGame();
            if (this.game.sound) this.game.sound.resumeAll();
        };

        this.ui.updateAll();
    }

    _initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.MAZE.LIGHTING.AMBIENT_INTENSITY);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, CONFIG.MAZE.LIGHTING.SUN_INTENSITY);
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

        // Checkpoint logic:
        // We need to save checkpoint ONLY if we are setting up a fresh stage (New Game or Next Stage),
        // NOT when restarting (which uses existing checkpoint).
        // Since _rebuildMaze is used for both, we need to handle saving externally or pass a flag.
        // EASIER: Save checkpoint in _initScene and _gotoNextStage.

        // 매니저 동기화
        this.ui.mazeGen = this.mazeGen;
        if (this.itemManager) {
            this.itemManager.mazeGen = this.mazeGen;

            // 레벨에 따른 아이템 개수
            const baseItems = 3;
            const itemCount = Math.min(20, baseItems + Math.floor(this.stageManager.level / 2));
            this.itemManager.spawnItems(itemCount, this.stageManager.level);
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
        // 일시정지 상태 체크
        if (this.game.state.isPaused) {
            return;
        }

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
            const fogColor = CONFIG.MAZE.FOG.COLOR;
            const fogNear = CONFIG.MAZE.FOG.NEAR;
            const fogFar = CONFIG.MAZE.FOG.FAR;
            const flCfg = CONFIG.ITEMS.FLASHLIGHT;
            const targetFar = this.player.isFlashlightOn ? CONFIG.MAZE.FOG.FAR_FLASHLIGHT : CONFIG.MAZE.FOG.FAR;
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

        // 3. 점프 (Space)
        if (input.wasJustPressed('Space')) {
            // 버튼 클릭 효과와 동일하게 동작
            if (this.player.inventory.jumpCount > 0) {
                this.player.startJump(true);
                this.ui.updateAll();
            } else {
                // 아이템 없으면 일반 점프라도? (현재 게임 디자인상 아이템 점프만 있는 듯)
                // this.player.startJump(false); 
                console.log("No jump items left");
            }
        }

        // 4. 망치 사용 (E 키)
        if (input.wasJustPressed('KeyE')) {
            this._useHammer();
        }

        // 5. 텔레포트 (Q 키)
        if (input.wasJustPressed('KeyQ')) {
            if (this.player.inventory.teleportCount > 0) {
                this._useTeleport();
                this.ui.updateAll();
            }
        }

        // 6. 함정 설치 (R 키)
        if (input.wasJustPressed('KeyR')) {
            if (this.player.inventory.trapCount > 0) {
                this._useTrap();
                this.ui.updateAll();
            }
        }

        // F키: 손전등 토글
        if (input.wasJustPressed('KeyF')) {
            if (this.player.toggleFlashlight()) {
                this.ui.updateAll();
            }
        }

        // G키: 좀비 위장 사용
        if (input.wasJustPressed('KeyG')) {
            if (this.player.useDisguise()) {
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
                    this.ui.updateAll(); // 회전 후 미니맵 업데이트
                    break;
            }
        }

        // L키: 몬스터 위치 표시 치트
        if (input.wasJustPressed('KeyL')) {
            if (this.minimap) {
                this.minimap.showMonsters = !this.minimap.showMonsters;
                this.ui.updateAll();
                console.log(`[Cheat] Monster Map Visibility: ${this.minimap.showMonsters}`);
                if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.SENSOR_TOGGLE_SFX_URL, 0.5);
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

    _useTeleport() {
        const success = this.player.useTeleport();
        if (success) {
            this.ui.updateAll();
            if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.8);
        }
    }

    _useTrap() {
        const pos = this.player.placeTrap();
        if (pos) {
            this.trapManager.placeTrap(pos);
            this.ui.updateAll();
            if (this.game.sound) this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.6);
        }
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

        // 게임 진행 상황 저장 (실제 스테이지 클리어 시)
        const currentItems = this._getCurrentItems();
        SaveManager.saveProgress(this.stageManager.level, currentItems);
        console.log(`[PlayScene] Stage cleared! Progress saved: Stage ${this.stageManager.level}`);

        // 플레이어 상태 일부 초기화 (지도 등)
        this.stageManager.preparePlayerForNextStage(this.player);

        // 미로 재생성 (공통 로직 사용)
        this._rebuildMaze();

        // Save checkpoint for this new stage
        if (this.player) this.player.saveCheckpoint();

        setTimeout(() => {
            this._isTransitioning = false;
        }, 1000);
    }

    /**
     * 레벨에 따라 사용 가능한 미로 모양 목록 반환
     */
    /**
     * 저장된 아이템을 플레이어 인벤토리에 로드
     * @param {Object} items - 저장된 아이템 데이터
     */
    _loadSavedItems(items) {
        if (!this.player) return;

        // 아이템 매핑: SaveManager의 키 -> Player inventory 키
        const itemMapping = {
            flashlight: 'hasFlashlight',
            sensor: 'hasSensor',
            battery: 'jumpCount',
            speedBoost: 'hammerCount',
            wallHack: 'hammerCount', // wallHack은 hammer로 통합
            teleport: 'teleportCount',
            zombieDisguise: 'disguiseCount'
        };

        for (const [saveKey, inventoryKey] of Object.entries(itemMapping)) {
            if (items[saveKey] !== undefined) {
                if (inventoryKey.startsWith('has')) {
                    // boolean 타입 아이템
                    this.player.inventory[inventoryKey] = items[saveKey] > 0;
                } else {
                    // count 타입 아이템
                    this.player.inventory[inventoryKey] = items[saveKey];
                }
            }
        }

        // 플래시라이트/센서 상태 반영
        if (this.player.inventory.hasFlashlight) {
            this.player.flashlightOn = true;
            // 손전등 상태는 UI에서 자동으로 업데이트됨
        }
        if (this.player.inventory.hasSensor) {
            this.player.sensorOn = true;
        }
    }

    /**
     * 현재 플레이어 인벤토리를 SaveManager 형식으로 반환
     * @returns {Object} 저장할 아이템 데이터
     */
    _getCurrentItems() {
        if (!this.player) {
            return {
                flashlight: 0,
                sensor: 0,
                battery: 0,
                speedBoost: 0,
                wallHack: 0,
                teleport: 0,
                zombieDisguise: 0
            };
        }

        return {
            flashlight: this.player.inventory.hasFlashlight ? 1 : 0,
            sensor: this.player.inventory.hasSensor ? 1 : 0,
            battery: this.player.inventory.jumpCount || 0,
            speedBoost: this.player.inventory.hammerCount || 0,
            wallHack: 0, // wallHack은 hammer로 통합됨
            teleport: this.player.inventory.teleportCount || 0,
            zombieDisguise: this.player.inventory.disguiseCount || 0
        };
    }

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
    /**
     * 장면 해제 및 리소스 정리
     */
    dispose() {
        if (this.ui) {
            console.log("PlayScene: Disposing UI and unbinding buttons...");
            this.ui.unbindButtons();
        }

        if (this.monsterManager) {
            this.monsterManager.clear();
            this.monsterManager.clear();
        }
        if (this.itemManager) {
            this.itemManager.clearItems();
        }
        if (this.trapManager) {
            this.trapManager.clear();
        }
        super.dispose();
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
}
