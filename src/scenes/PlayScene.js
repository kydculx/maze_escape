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
import { WeatherSystem } from '../effects/WeatherSystem.js';
import { TrapManager } from '../maps/TrapManager.js';
import { SwitchManager } from '../maps/SwitchManager.js';
import { SpikeTrapManager } from '../maps/SpikeTrapManager.js';
import { BombManager } from '../items/BombManager.js';
import { SaveManager } from '../SaveManager.js';
import { ASSETS } from '../Assets.js';

/**
 * 게임 플레이 장면 클래스 (Orchestrator)
 */
export class PlayScene extends BaseScene {
    constructor(game, progress = null) {
        super(game);
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
        this._initEnvironment();
        this._initWorld();
        this._initEntities();
        this._initInteraction();
        this._initUI();
    }

    /**
     * 환경 설정 (안개, 배경, 초기 조명)
     */
    _initEnvironment() {
        this._randomizeTheme(); // 초기 테마 랜덤 설정

        const fogCfg = CONFIG.MAZE.FOG;
        this.scene.background = new THREE.Color(fogCfg.COLOR);
        this.scene.fog = new THREE.Fog(fogCfg.COLOR, fogCfg.NEAR, fogCfg.FAR);

        this._initLights();
    }

    /**
     * 미로 데이터, 뷰 및 기본적인 지형 초기화
     */
    _initWorld() {
        this.stageManager = new StageManager();

        // 저장된 진행 상황 로드 및 스테이지 설정
        if (this.savedProgress) {
            this.stageManager.level = this.savedProgress.highestStage;
            this.stageManager.mazeSize = Math.min(
                CONFIG.STAGE.INITIAL_SIZE + (this.savedProgress.highestStage - 1) * CONFIG.STAGE.SIZE_INCREMENT,
                CONFIG.STAGE.MAX_SIZE
            );
            console.log(`[PlayScene] Loading saved stage: ${this.savedProgress.highestStage}, maze size: ${this.stageManager.mazeSize}`);
        }

        this.minimap = new Minimap();
        this.mazeGen = new MazeGenerator(this.stageManager.mazeSize, this.stageManager.mazeSize);

        // 미로 모양 결정
        let shape = CONFIG.MAZE.SHAPE;
        if (!shape) {
            const availableShapes = this._getAvailableShapes(this.stageManager.level);
            shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
        }

        this.mazeGen.applyShapeMask(shape);
        this.mazeGen.generateData();

        this.mazeView = new MazeView(this.scene);
        this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);

        this._refreshFloorMesh();
    }

    /**
     * 플레이어, 카메라, NPC 및 각종 매니저 초기화
     */
    _initEntities() {
        // 플레이어
        const startPos = this.mazeGen.getStartWorldPosition(CONFIG.MAZE);
        this.player = new Player(this.scene, this.mazeGen, this.game.sound);
        this.player.reset(startPos, this._calculateInitialAngle());

        // 사망 및 체력 관리 중앙 콜백 설정
        this.player.onDeath = () => this._handlePlayerDeath();
        this.player.onHealthChanged = (health) => this._handlePlayerHealthChange(health);

        // 카메라
        this.cameraController = new CameraController(this.player, this.scene);
        this.camera = this.cameraController.camera;

        // 오디오 리스너
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);

        // 날씨 및 시스템 매니저
        this.weatherSystem = new WeatherSystem(this.scene, this.camera, this.game.sound, this.cameraController);
        this.itemManager = new ItemManager(this.scene, this.mazeGen, CONFIG.ITEMS);
        this.itemSpawnTimer = 0;

        this._updateMaxItemCount();
        this.itemManager.spawnItems(this.maxItemCount, this.stageManager.level);

        this.trapManager = new TrapManager(this.scene);
        this.switchManager = new SwitchManager(this.scene, this.mazeGen, this.game.sound);
        this.switchManager.spawnSwitches();

        // 벽 스파이크 함정 매니저
        this.spikeTrapManager = new SpikeTrapManager(this.scene, this.mazeGen);

        // 몬스터
        this.monsterManager = new MonsterManager(this.scene, this.mazeGen, this.game.sound, (monster) => {
            this._onPlayerBitten();
        });

        // 몬스터 스폰
        const spawnRules = CONFIG.MONSTERS.SPAWN_RULES;
        const zombieCount = Math.min(
            spawnRules.MAX_MONSTER_COUNT,
            Math.max(0, spawnRules.BASE_COUNT + Math.floor((this.stageManager.level - 1) / spawnRules.COUNT_CALC_DIVISOR))
        );
        this.monsterManager.spawnZombies(zombieCount, this.stageManager.level);

        // 폭탄 매니저
        this.bombManager = new BombManager(this.scene, this.game.sound);
    }

    /**
     * 상호작용 관련 초기화 (Raycaster, Mouse)
     */
    _initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this._onInteract = (event) => {
            if (!this.game.state.is(STATES.PLAYING)) return;
            const x = event.clientX || (event.touches ? event.touches[0].clientX : 0);
            const y = event.clientY || (event.touches ? event.touches[0].clientY : 0);
            this.mouse.x = (x / window.innerWidth) * 2 - 1;
            this.mouse.y = -(y / window.innerHeight) * 2 + 1;
            this._checkSwitchInteraction();
        };

        window.addEventListener('mousedown', this._onInteract);
        window.addEventListener('touchstart', this._onInteract, { passive: false });
    }

    /**
     * UI 매니저 초기화 및 상태 설정
     */
    _initUI() {
        this.ui = new UIManager(this.player, this.mazeGen, this.stageManager);
        this._bindUIEvents();

        // 초기 HUD 상태 설정
        this.ui.showInGameHUD(true);
        if (this.savedProgress && this.savedProgress.items) {
            console.log('[PlayScene] Loading saved items from progress:', this.savedProgress.items);
            this._loadSavedItems(this.savedProgress.items);
        }
        this.ui.updateAll(true);
        this.ui.initSettings(this.game.sound);

        // 초기 체크포인트 저장
        if (this.player) this.player.saveCheckpoint();
    }

    /**
     * UI 이벤트 버튼 및 콜백 바인딩
     */
    _bindUIEvents() {
        // 일시정지 콜백
        this.ui.registerPauseCallbacks(
            () => { // onPause
                this.game.state.pauseGame();
                if (this.game.sound) this.game.sound.pauseAll();
            },
            () => { // onResume
                this.game.state.resumeGame();
                if (this.game.sound) this.game.sound.resumeAll();
            }
        );

        this.ui.bindButtons({
            onJump: () => {
                this.player.startJump(true);
                this.ui.updateAll();
            },
            onMap: () => this.resetMaze(),
            onCheat: () => {
                if (this.itemManager) this.itemManager.spawnNearbyItems(this.player.position, this.stageManager.level);
                if (this.minimap) this.minimap.showMonsters = true;
                this.ui.updateAll();
            },
            onTrap: () => {
                const pos = this.player.placeTrap();
                if (pos) {
                    this.trapManager.placeTrap(pos);
                    this.ui.updateAll();
                    if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
                }
            },
            onC4: () => this._useC4(),
            onTeleport: () => {
                if (this.player.useTeleport()) {
                    this.ui.updateAll();
                    if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
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
                if (this.player.useDisguise()) this.ui.updateAll();
            },
            onPrevStage: () => {
                this.stageManager.prevStage();
                this.resetMaze();
            },
            onNextStage: () => this._onNextStageRequest(),
            onRestart: () => this._onRestart(),
            onMainMenu: () => this._onMainMenu()
        });

        // 메뉴 토글 로직 확장
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
    }

    /**
     * 플레이어가 몬스터에게 공격받았을 때 처리 (시각 효과 전용)
     */
    _onPlayerBitten() {
        if (this.ui) {
            this.ui.showBittenEffect();
            this.ui.triggerDamageEffect();
        }
        if (this.player) {
            this.player.takeDamage(10);
        }
    }

    /**
     * 중앙 집중식 사망 처리
     */
    _handlePlayerDeath() {
        if (this.game.state.is(STATES.DYING) || this.game.state.is(STATES.GAME_OVER)) return;

        console.log("[PlayScene] Player died. Starting death sequence...");

        // 1. 상태 변경 (입력 차단)
        this.game.state.set(STATES.DYING);

        // 2. 카메라 쓰러짐 연출 시작
        if (this.cameraController) {
            this.cameraController.onPlayerDeath();
        }


        // 3. 효과음 재생 (사망)
        if (this.game.sound) {
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.DEATH);
        }

        // 4. 일정 시간 후 데스 화면 표시
        setTimeout(() => {
            if (this.game.state.is(STATES.DYING)) {
                this.game.state.set(STATES.GAME_OVER);
                if (this.ui) {
                    this.ui.showDeathScreen();
                }
            }
        }, 1500); // deathDuration과 일치
    }

    /**
     * 중앙 집중식 체력 바 업데이트
     */
    _handlePlayerHealthChange(health) {
        if (this.ui) {
            this.ui.updateHealthBar();
        }
    }

    /**
     * 다음 스테이지 요청 처리
     */
    _onNextStageRequest() {
        this.stageManager.nextStage();
        SaveManager.saveProgress(this.stageManager.level, this._getCurrentItems());
        this.resetMaze();
        if (this.game.sound) {
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.GAME_CLEAR);
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK); // 기존 클릭 소리 유지
        }
    }

    /**
     * 현재 스테이지 다시 시작
     */
    _onRestart() {
        console.log("Restarting current stage...");
        this.game.state.set(STATES.PLAYING);
        this.game.state.resumeGame();
        if (this.game.sound) {
            this.game.sound.resumeAll();
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
            this.game.sound.playBGM(ASSETS.AUDIO.BGM);
        }

        if (this.player) this.player.restoreCheckpoint();
        if (this.cameraController) this.cameraController.reset();
        this.stageManager.resetStats();
        this.resetMaze();
        if (this.ui) this.ui.updateAll(true);
    }

    /**
     * 메인 메뉴로 돌아가기
     */
    _onMainMenu() {
        console.log("Going to Main Menu...");
        this.game.state.resumeGame();
        if (this.game.sound) {
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
            this.game.sound.playBGM(ASSETS.AUDIO.BGM);
        }

        this.game.sceneManager.setScene(STATES.MAIN_MENU);
        this.game.state.set(STATES.MAIN_MENU);

        this._hideAllGameUI();

        if (this.game.updateContinueButton) this.game.updateContinueButton();
    }

    /**
     * 모든 게임 관련 UI 숨김
     */
    _hideAllGameUI() {
        const uiElements = [
            'ui-overlay', 'item-actions', 'cheat-hud',
            'minimap-container', 'radar-container', 'disguise-overlay'
        ];
        uiElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const mainMenu = document.getElementById('main-menu-screen');
        if (mainMenu) {
            mainMenu.classList.remove('hidden');
            mainMenu.style.display = 'flex';
        }

        if (this.ui) this.ui.showInGameHUD(false);
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
        // 스테이지 변경 시 테마 랜덤 변경
        this._randomizeTheme(); // 테마 변경

        // 테마 변경에 따른 날씨 시스템 색상 동기화 (라이트닝 복구용)
        if (this.weatherSystem) {
            this.weatherSystem.updateOriginalColors();
        }

        const size = this.stageManager.mazeSize;
        this.mazeGen = new MazeGenerator(size, size);

        // 레벨에 따라 모양 결정 (설정값이 있으면 강제 적용)
        let shape = CONFIG.MAZE.SHAPE;
        if (!shape) {
            const availableShapes = this._getAvailableShapes(this.stageManager.level);
            shape = availableShapes[Math.floor(Math.random() * availableShapes.length)];
        }
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

            // 레벨에 따른 아이템 개수 (중앙 관리되는 공식 사용)
            this._updateMaxItemCount();
            this.itemManager.spawnItems(this.maxItemCount, this.stageManager.level);
        }
        if (this.monsterManager) {
            this.monsterManager.mazeGen = this.mazeGen;
            this.monsterManager.clear();

            // 레벨에 따른 좀비 생성 (Config의 SPAWN_RULES 기준)
            const spawnRules = CONFIG.MONSTERS.SPAWN_RULES;
            const zombieCount = Math.min(
                spawnRules.MAX_MONSTER_COUNT,
                Math.max(0, spawnRules.BASE_COUNT + Math.floor((this.stageManager.level - 1) / spawnRules.COUNT_CALC_DIVISOR))
            );

            this.monsterManager.spawnZombies(zombieCount, this.stageManager.level);
        }
        if (this.trapManager) {
            this.trapManager.clear();
        }
        if (this.spikeTrapManager) {
            this.spikeTrapManager.rebuild(this.mazeGen);
        }
        if (this.switchManager) {
            this.switchManager.mazeGen = this.mazeGen;
            this.switchManager.spawnSwitches();
        }
        if (this.bombManager) {
            this.bombManager.clear();
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
            new THREE.MeshStandardMaterial({
                color: CONFIG.MAZE.BG_FLOOR.COLOR,
                roughness: 1
            })
        );
        floor.name = 'floor-mesh';
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0; // 타일들이 0.01에 있으므로 0에 배치
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    _randomizeTheme() {
        const themes = Object.keys(CONFIG.MAZE.THEMES);
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        CONFIG.MAZE.CURRENT_THEME = randomTheme;
        console.log(`[PlayScene] Theme selected for this stage: ${randomTheme}`);

        // 안개 설정 갱신 (테마 변경 후 즉시 적용)
        if (this.scene.fog) {
            const fogCfg = CONFIG.MAZE.FOG;
            this.scene.fog.color.setHex(fogCfg.COLOR);
            this.scene.fog.near = fogCfg.NEAR;
            this.scene.fog.far = fogCfg.FAR;
            this.scene.background = new THREE.Color(fogCfg.COLOR);
        }

        // 조명 갱신 (테마 변경 후 즉시 적용)
        // 기존 조명 제거 후 재생성 방식보다는 속성 업데이트가 좋으나, 
        // _initLights에서 생성된 조명 참조를 저장하지 않았으므로, 
        // 간단히 씬 배경/안개만 여기서 하고 조명은 _initLights나 MazeView 호출 시 반영되길 기대...
        // 하지만 _initLights는 init()에서 한 번만 호출됨.
        // 따라서 조명 강도 업데이트 로직이 필요함.

        this._updateLightsForTheme();
    }

    _updateLightsForTheme() {
        // 씬에서 조명 찾기
        const ambientLight = this.scene.children.find(c => c.type === 'AmbientLight');
        const sunLight = this.scene.children.find(c => c.type === 'DirectionalLight');

        if (ambientLight) {
            ambientLight.intensity = CONFIG.MAZE.LIGHTING.AMBIENT_INTENSITY;
        }
        if (sunLight) {
            sunLight.intensity = CONFIG.MAZE.LIGHTING.SUN_INTENSITY;
        }
    }

    /**
     * 레이캐스팅을 통한 스위치 상호작용 체크
     */
    _checkSwitchInteraction() {
        if (!this.switchManager || !this.camera) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        // 스위치 그룹 내의 객체들만 검사
        const intersects = this.raycaster.intersectObjects(this.switchManager.switchGroup.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            // 거리 체크 (손이 닿는 거리 내에서만 가능하도록)
            if (intersects[0].distance < CONFIG.MAZE.WALL_THICKNESS) {
                this.switchManager.interact(hit, (gx, gy, side) => {
                    // 1. 벽 내려가는 애니메이션 시작 (사운드 매니저 및 방향 정보 전달)
                    // 몬스터 소환 확률 체크 (애니메이션 시작 전에 미리 생성하여 "벽 뒤에 대기" 연출)
                    if (Math.random() < CONFIG.MAZE.SWITCH.ZOMBIE_SPAWN_CHANCE) {
                        let ox = gx;
                        let oy = gy;

                        // side는 플레이어가 상호작용한 '면' (N, S, W, E)
                        // 플레이어는 해당 자리에 있었으므로 '뒤'는 그 반대 방향
                        if (side === 'N') oy = gy + 1;      // 북쪽 면 터치 -> 뒤는 남쪽(+y)
                        else if (side === 'S') oy = gy - 1; // 남쪽 면 터치 -> 뒤는 북쪽(-y)
                        else if (side === 'W') ox = gx + 1; // 서쪽 면 터치 -> 뒤는 동쪽(+x)
                        else if (side === 'E') ox = gx - 1; // 동쪽 면 터치 -> 뒤는 서쪽(-x)

                        if (ox >= 0 && ox < this.mazeGen.width && oy >= 0 && oy < this.mazeGen.height) {
                            // 벽 뒤의 공간이 길(0)인 경우에만 생성 (기존 규칙 유지)
                            if (this.mazeGen.grid[oy][ox] === 0) {
                                const wolfMinStage = CONFIG.MONSTERS.WOLF_ZOMBIE.SPAWN_MIN_STAGE;
                                const type = this.stageManager.level >= wolfMinStage ?
                                    (Math.random() > 0.5 ? CONFIG.MONSTERS.TYPES.WOLF_ZOMBIE : CONFIG.MONSTERS.TYPES.ZOMBIE) :
                                    CONFIG.MONSTERS.TYPES.ZOMBIE;

                                const monster = this.monsterManager.spawnMonsterAt(type, ox, oy, this.stageManager.level);

                                // 정확히 벽의 반대편 경계면에 가깝게 배치
                                const thick = CONFIG.MAZE.WALL_THICKNESS;
                                const offsetX = -(this.mazeGen.width * thick) / 2;
                                const offsetZ = -(this.mazeGen.height * thick) / 2;

                                if (side === 'N') monster.position.z = offsetZ + (gy + 1) * thick + 0.1;
                                else if (side === 'S') monster.position.z = offsetZ + gy * thick - 0.1;
                                else if (side === 'W') monster.position.x = offsetX + (gx + 1) * thick + 0.1;
                                else if (side === 'E') monster.position.x = offsetX + gx * thick - 0.1;

                                // 플레이어를 바라보게 설정 (lookAt 사용)
                                monster.group.lookAt(this.player.position.x, 0, this.player.position.z);
                            }
                        }
                    }

                    // 1. 벽 내려가는 애니메이션 시작 (사운드 매니저 및 방향 정보 전달)
                    this.mazeView.animateWallRemoval(gx, gy, 3.5, this.game.sound, side, () => {
                        // 2. 애니메이션 완료 후 실제 데이터 업데이트 (이때부터 통과 가능)
                        this.mazeGen.grid[gy][gx] = 0;

                        // 3. 전체 시각적 요소 갱신 (Atomic Refresh)
                        this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);
                        // 미니맵 및 월드 갱신
                        this.ui.updateAll();
                    });
                });
            }
        }
    }

    dispose() {
        // Remove event listeners
        if (this._onVisibilityChange) {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
        }
        if (this._onInteract) {
            window.removeEventListener('mousedown', this._onInteract);
            window.removeEventListener('touchstart', this._onInteract);
        }

        if (this.weatherSystem) {
            this.weatherSystem.stop();
        }

        // Clean up other managers first
        if (this.monsterManager) {
            this.monsterManager.dispose();
        }
        if (this.trapManager) {
            this.trapManager.dispose();
        }

        // Clean up AudioListener
        if (this.audioListener) {
            if (this.camera) {
                this.camera.remove(this.audioListener);
            }
            // Ensure no sound leaks
            this.audioListener.setMasterVolume(0);
            if (this.audioListener.context && this.audioListener.context.state === 'running') {
                this.audioListener.context.suspend();
            }
        }

        // BGM 및 모든 루프 사운드 강제 중지 (Nuclear Option)
        if (this.game.sound) {
            console.log('[PlayScene] Calling sound.stopAll()');
            this.game.sound.stopAll();
        }

        console.log('[PlayScene] Dispose complete');
        super.dispose();
    }

    update(dt) {
        if (this.game.state.isPaused) return;

        const deltaTime = Math.min(dt, 0.1);
        const input = this.game.input;

        this._updateGameSystems(deltaTime);
        this._updateRadar(deltaTime);
        this._updateEnvironmentEffects(deltaTime);
        this._updateUI(deltaTime);
        this._handleInput(input);
        this._updateMinimap();

        this._checkStageCompletion();
    }

    /**
     * 핵심 게임 시스템 업데이트 (플레이어, 아이템, 몬스터 등)
     */
    _updateGameSystems(dt) {
        this.player.update(dt);
        this._updateZones();

        if (this.itemManager) {
            // 아이템 자동 생성
            if (this.game.state.is(STATES.PLAYING)) {
                this.itemSpawnTimer += dt;
                if (this.itemSpawnTimer >= CONFIG.ITEMS.SPAWN_INTERVAL) {
                    this.itemSpawnTimer = 0;
                    this.itemManager.spawnExtraItem(this.stageManager.level, this.maxItemCount);
                }
            }
            this.itemManager.update(dt);
            this._checkItemCollisions();
        }

        if (this.monsterManager) this.monsterManager.update(dt, this.player);
        if (this.trapManager && this.monsterManager) this.trapManager.update(dt, this.monsterManager.monsters);
        if (this.spikeTrapManager) this.spikeTrapManager.update(dt, this.player);
        if (this.bombManager) this.bombManager.update(dt);
        if (this.weatherSystem) this.weatherSystem.update(dt, this.player.position);

        if (this.stageManager && this.stageManager.isStageActive) {
            this.stageManager.stageTime += dt;
        }

        const jumpProgress = this.player.isJumping ? this.player.jumpTimer / this.player.jumpDuration : 0;
        this.cameraController.update(dt, this.player.isJumping, jumpProgress);
    }

    /**
     * 플레이어의 현재 위치가 안전 지대나 입구인지 체크하여 상태 업데이트
     */
    _updateZones() {
        if (!this.player || !this.mazeGen) return;

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;
        const gx = Math.floor((this.player.position.x - offsetX) / thickness);
        const gy = Math.floor((this.player.position.z - offsetZ) / thickness);

        // 1. 입구(스타팅 포인트) 체크
        this.player.isInStartPoint = (this.mazeGen.entrance && gx === this.mazeGen.entrance.x && gy === this.mazeGen.entrance.y);

        // 2. 안전 지대 체크
        let inSafeZone = false;
        if (this.mazeGen.safeZones) {
            for (const sz of this.mazeGen.safeZones) {
                if (gx === sz.x && gy === sz.y) {
                    inSafeZone = true;
                    break;
                }
            }
        }
        this.player.isInSafeZone = inSafeZone;
    }

    /**
     * 아이템 충돌 체크 및 획득 처리
     */
    _checkItemCollisions() {
        this.itemManager.checkCollisions(this.player.position, CONFIG.PLAYER.PLAYER_RADIUS, (item) => {
            if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.ITEM_PICKUP);

            // 지도 조각인 경우 즉시 영역 공개
            if (item.type === 'MAP_PIECE' && item.metadata) {
                const { regionIndex, rows, cols } = item.metadata;
                if (regionIndex !== undefined && rows && cols) {
                    this.mazeGen.revealRegion(regionIndex, rows, cols);
                    console.log(`[PlayScene] MAP_PIECE collected! Revealing region ${regionIndex}`);
                }
            }

            this.player.applyItemEffect(item);
            this.ui.updateAll();
        });
    }

    /**
     * 사운드 센서 레이더 업데이트
     */
    _updateRadar(dt) {
        if (!this.player.isSensorOn) {
            this.ui.updateRadar([], false);
            return;
        }

        const blips = [];
        if (this.monsterManager && this.monsterManager.monsters) {
            const playerPos = this.player.group.position;
            const playerRotation = this.player.group.rotation.y;

            for (const zombie of this.monsterManager.monsters) {
                if (!zombie.isMakingSound) continue;

                const maxAudioDist = CONFIG.MONSTERS.ZOMBIE.PATROL_AUDIO_MAX_DIST || CONFIG.MONSTERS.ZOMBIE.DETECTION_RANGE;
                const dist = zombie.position.distanceTo(playerPos);
                const distInTiles = dist / CONFIG.MAZE.WALL_THICKNESS;

                if (distInTiles <= maxAudioDist) {
                    blips.push({
                        dx: zombie.position.x - playerPos.x,
                        dz: zombie.position.z - playerPos.z,
                        dist: dist,
                        rotation: playerRotation,
                        maxDist: maxAudioDist * CONFIG.MAZE.WALL_THICKNESS
                    });
                }
            }
        }

        let isRadarVisible = true;
        if (this.player.sensorTimer < CONFIG.ITEMS.SENSOR.FLICKER_THRESHOLD) {
            isRadarVisible = Math.sin(Date.now() * 0.02) > 0;
        }

        this.ui.updateRadar(blips, isRadarVisible);
    }

    /**
     * 안개 등 환경 효과 업데이트
     */
    _updateEnvironmentEffects(dt) {
        if (this.scene.fog) {
            const targetFar = this.player.isFlashlightOn ? CONFIG.MAZE.FOG.FAR_FLASHLIGHT : CONFIG.MAZE.FOG.FAR;
            this.scene.fog.far += (targetFar - this.scene.fog.far) * dt * CONFIG.ITEMS.FLASHLIGHT.FOG_TRANSITION_SPEED;
        }
        if (this.mazeView) {
            this.mazeView.animateMarkers(dt);
        }
    }

    /**
     * UI 상태 업데이트 (체력, 인벤토리 등)
     */
    _updateUI(dt) {
        if (this.ui) {
            this.ui.updateAll();
        }
    }

    /**
     * 미니맵 및 탐험 상태 업데이트
     */
    _updateMinimap() {
        if (!this.minimap) return;

        this.mazeGen.markExplored(
            this.player.position.x,
            this.player.position.z,
            CONFIG.MAZE.WALL_THICKNESS,
            1
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

    _handleInput(input) {
        if (!this.game.state.is(STATES.PLAYING)) return;
        if (this.player.isJumping) return;

        this._handleMovementInput(input);
        this._handleItemInput(input);
        this._handleCheatInput(input);
        this._handleSwipeInput(input);
    }

    /**
     * 이동 관련 입력 처리
     */
    _handleMovementInput(input) {
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

        if (input.wasJustPressed('Space')) {
            if (this.player.inventory.jumpCount > 0) {
                this.player.startJump(true);
                this.ui.updateAll();
            }
        }
    }

    /**
     * 아이템 사용 관련 입력 처리
     */
    _handleItemInput(input) {

        // Q 키: 텔레포트
        if (input.wasJustPressed('KeyQ')) {
            if (this.player.inventory.teleportCount > 0) {
                this._useTeleport();
                this.ui.updateAll();
            }
        }

        // R 키: 함정 설치
        if (input.wasJustPressed('KeyR')) {
            if (this.player.inventory.trapCount > 0) {
                this._useTrap();
                this.ui.updateAll();
            }
        }

        // F 키: 손전등 토글
        if (input.wasJustPressed('KeyF')) {
            if (this.player.toggleFlashlight()) {
                this.ui.updateAll();
            }
        }

        // G 키: 좀비 위장 사용
        if (input.wasJustPressed('KeyG')) {
            if (this.player.useDisguise()) {
                this.ui.updateAll();
            }
        }

        // T 키: 사운드 센서 토글
        if (input.wasJustPressed('KeyT')) {
            if (this.player.toggleSensor()) {
                this.ui.updateAll();
            }
        }

        // C 키: C4 폭탄 설치
        if (input.wasJustPressed('KeyC')) {
            this._useC4();
        }
    }

    /**
     * 치트 관련 입력 처리
     */
    _handleCheatInput(input) {
        if (input.wasJustPressed('KeyL')) {
            if (this.minimap) {
                this.minimap.showMonsters = !this.minimap.showMonsters;
                this.ui.updateAll();
                console.log(`[Cheat] Monster Map Visibility: ${this.minimap.showMonsters}`);
                if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.ITEM.SENSOR);
            }
        }
    }

    /**
     * 스와이프 입력 처리 (모바일용)
     */
    _handleSwipeInput(input) {
        const swipe = input.consumeSwipe();
        if (!swipe) return;

        switch (swipe) {
            case 'up':
                if (this.player.startMove(1)) {
                    this.stageManager.moveCount++;
                    this.stageManager.isStageActive = true;
                }
                break;
            case 'down':
                if (this.player.startMove(-1)) {
                    this.stageManager.moveCount++;
                    this.stageManager.isStageActive = true;
                }
                break;
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



    _useC4() {
        if (!this.player || !this.bombManager) return;

        const success = this.player.useC4((dx, dy) => {
            const thickness = CONFIG.MAZE.WALL_THICKNESS;
            const offsetX = -(this.mazeGen.width * thickness) / 2;
            const offsetZ = -(this.mazeGen.height * thickness) / 2;

            // 플레이어 그리드 위치
            const gx = Math.floor((this.player.position.x - offsetX) / thickness);
            const gy = Math.floor((this.player.position.z - offsetZ) / thickness);

            // 타겟 그리드 위치 (플레이어 바로 앞)
            const tx = gx + dx;
            const ty = gy + dy;

            // 유효 범위 체크
            if (tx > 0 && tx < this.mazeGen.width - 1 && ty > 0 && ty < this.mazeGen.height - 1) {
                const targetVal = this.mazeGen.grid[ty][tx];
                const wallObj = this.scene.getObjectByName('maze-mesh')?.children.find(child =>
                    child.name === 'maze-wall' &&
                    child.userData.gridX === tx &&
                    child.userData.gridY === ty
                );

                // 파괴 가능한 벽인지 확인 (가장자리 제외, 해머 로직과 동일)
                if (targetVal === 1 && wallObj) {
                    // 폭탄 설치 위치 계산 (벽면 중앙 -> 스위치 높이와 비슷하게 조정)
                    const bombPos = wallObj.position.clone();
                    bombPos.y = CONFIG.MAZE.WALL_HEIGHT / 4.5; // 스위치 높이와 동일하게 

                    // 노멀 방향 (플레이어 쪽으로 살짝 띄움)
                    const normal = new THREE.Vector3(-dx, 0, -dy);
                    bombPos.add(normal.clone().multiplyScalar(thickness / 2 + 0.01));

                    this.bombManager.plantBomb(bombPos, normal, () => {
                        // 폭발 콜백: 애니메이션 시작
                        this.mazeView.animateWallExplosion(tx, ty, 0.5, () => {
                            // 애니메이션 완료 후 실제 데이터 업데이트
                            this.mazeGen.grid[ty][tx] = 0;
                            // 전체 시각적 요소 갱신 (이미지 타일 등도 바뀌어야 하므로)
                            this.mazeView.refresh(this.mazeGen, CONFIG.MAZE);
                            this.ui.updateAll();
                        });
                    }, this.game.sound);

                    this.ui.updateAll();
                    return true;
                }
            }
            return false;
        });

        if (success && this.game.sound) {
            this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
        }
    }

    _useTeleport() {
        const success = this.player.useTeleport();
        if (success) {
            this.ui.updateAll();
            if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
        }
    }

    _useTrap() {
        const pos = this.player.placeTrap();
        if (pos) {
            this.trapManager.placeTrap(pos);
            this.ui.updateAll();
            if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
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
        if (this.game.sound) this.game.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);

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

        // 아이템 개수 및 타이머 초기화
        this._updateMaxItemCount();
        this.itemSpawnTimer = 0;
        if (this.itemManager) {
            this.itemManager.spawnItems(this.maxItemCount, this.stageManager.level);
        }

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
            speedBoost: 'disguiseCount',
            wallHack: 'c4Count',
            teleport: 'teleportCount',
            zombieDisguise: 'disguiseCount',
            trap: 'trapCount'
        };

        for (const [saveKey, inventoryKey] of Object.entries(itemMapping)) {
            if (items[saveKey] !== undefined) {
                let hasItem = false;
                if (inventoryKey.startsWith('has')) {
                    // boolean 타입 아이템
                    const val = items[saveKey] > 0;
                    this.player.inventory[inventoryKey] = val;
                    hasItem = val;
                } else {
                    // count 타입 아이템
                    const count = items[saveKey];
                    this.player.inventory[inventoryKey] = count;
                    hasItem = count > 0;
                }

                // 아이템 순서 정보 복구 (UIManager가 슬롯을 표시하도록 함)
                if (hasItem) {
                    let type = '';
                    switch (saveKey) {
                        case 'flashlight': type = 'FLASHLIGHT'; break;
                        case 'sensor': type = 'SENSOR'; break;
                        case 'battery': type = 'JUMP'; break;
                        case 'speedBoost':
                        case 'wallHack': type = 'C4'; break;
                        case 'speedBoost': type = 'ZOMBIE_DISGUISE'; break;
                        case 'teleport': type = 'TELEPORT'; break;
                        case 'zombieDisguise': type = 'ZOMBIE_DISGUISE'; break;
                        case 'trap': type = 'TRAP'; break;
                    }
                    if (type && !this.player.inventory.itemOrder.includes(type)) {
                        this.player.inventory.itemOrder.push(type);
                    }
                }
            }
        }

        // 플래시라이트/센서 상태 및 타이머 반영
        if (this.player.inventory.hasFlashlight) {
            this.player.flashlightTimer = CONFIG.ITEMS.FLASHLIGHT.DURATION;
            console.log('[PlayScene] Flashlight restored with full battery');
        }
        if (this.player.inventory.hasSensor) {
            this.player.sensorTimer = CONFIG.ITEMS.SENSOR.DURATION;
            console.log('[PlayScene] Sensor restored with full battery');
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
            speedBoost: this.player.inventory.disguiseCount || 0,
            wallHack: this.player.inventory.c4Count || 0,
            teleport: this.player.inventory.teleportCount || 0,
            zombieDisguise: this.player.inventory.disguiseCount || 0,
            trap: this.player.inventory.trapCount || 0
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

    _updateMaxItemCount() {
        // 아이템 개수 = 현재 스테이지 레벨 (SPAWN_COUNT 제한)
        this.maxItemCount = Math.min(CONFIG.ITEMS.SPAWN_COUNT, this.stageManager.level);
        console.log(`[PlayScene] Max items for stage: ${this.maxItemCount}`);
    }

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
        }
        if (this.itemManager) {
            this.itemManager.clearItems();
        }
        if (this.trapManager) {
            this.trapManager.clear();
        }
        if (this.spikeTrapManager) {
            this.spikeTrapManager.clear();
        }
        super.dispose();
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
}
