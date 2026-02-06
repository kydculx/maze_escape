import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';
import { MazeGenerator } from '../MazeGenerator.js';
import { Minimap } from '../Minimap.js';
import { Player } from '../Player.js';
import { CameraController } from '../CameraController.js';
import { ItemManager } from '../ItemManager.js';
import { StageManager } from '../StageManager.js';

/**
 * 게임 플레이 장면 클래스 (Orchestrator)
 */
export class PlayScene extends BaseScene {
    constructor(game) {
        super(game);
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

        // 3. 미로 생성
        this.mazeGen = new MazeGenerator(CONFIG.MAZE.DEFAULT_WIDTH, CONFIG.MAZE.DEFAULT_HEIGHT);
        this.mazeGen.generateData();
        this._refreshMazeMesh();

        // 4. 플레이어 초기화
        const startPos = this.mazeGen.getStartPosition(CONFIG.MAZE);
        this.player = new Player(this.scene, this.mazeGen, this.game.sound);

        // 초기 방향 설정
        const initialAngle = this._calculateInitialAngle();
        this.player.reset(startPos, initialAngle);

        // 5. 카메라 컨트롤러 초기화
        this.cameraController = new CameraController(this.player, this.scene);
        this.camera = this.cameraController.camera;

        // 6. 바닥 생성
        this._refreshFloorMesh();

        // 7. 아이템 매니저 초기화
        this.itemManager = new ItemManager(this.scene, this.mazeGen, CONFIG.ITEMS);
        this.itemManager.spawnItems();

        // 8. 미니맵 초기화
        this.minimap = new Minimap();

        // 9. 스테이지 매니저 초기화
        this.stageManager = new StageManager();

        // 10. 아이템 액션 버튼 바인딩
        this._initItemButtons();
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
        const getRandomOdd = (min, max) => {
            let n = Math.floor(Math.random() * (max - min + 1)) + min;
            return n % 2 === 0 ? n + 1 : n;
        };
        const newWidth = getRandomOdd(11, 25);
        const newHeight = getRandomOdd(11, 25);

        this.mazeGen = new MazeGenerator(newWidth, newHeight);
        this.mazeGen.generateData();

        this._refreshMazeMesh();
        this._refreshFloorMesh();

        const startPos = this.mazeGen.getStartPosition(CONFIG.MAZE);
        const initialAngle = this._calculateInitialAngle();
        this.player.mazeGen = this.mazeGen; // 주입된 미로 데이터 갱신
        this.player.reset(startPos, initialAngle);

        if (this.itemManager) {
            this.itemManager.mazeGen = this.mazeGen;
            this.itemManager.spawnItems();
        }

        console.log(`Maze reset: ${newWidth}x${newHeight}`);
    }

    _refreshMazeMesh() {
        console.log("--- DEBUG: Refresing Maze Visuals (Atomic Sweep) ---");

        // 1. 씬 전체를 뒤져서 'maze-'로 시작하는 모든 오브젝트(메쉬, 그룹, 마커) 강제 소탕
        const toRemove = [];
        this.scene.traverse(child => {
            if (child.name && child.name.startsWith('maze-')) {
                toRemove.push(child);
            }
        });

        toRemove.forEach(obj => {
            console.log(`Force Purging Ghost Object: ${obj.name} (${obj.type})`);
            this.scene.remove(obj);
            this._disposeObject(obj);
        });

        // 2. 새 메쉬 생성 및 추가
        this.mazeMesh = this.mazeGen.generateThreeMesh(CONFIG.MAZE);
        this.mazeMesh.name = 'maze-mesh';
        this.scene.add(this.mazeMesh);

        // 3. 입구/출구 시각적 표식 추가
        this._addMazeMarkers();

        console.log("Visual refresh complete. Current scene graph purged.");
    }

    _disposeObject(obj) {
        if (!obj) return;
        obj.traverse((child) => {
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
    }

    _addMazeMarkers() {
        // 기존 마커 제거
        const existing = this.scene.getObjectByName('maze-markers');
        if (existing) {
            this.scene.remove(existing);
        }

        const markers = new THREE.Group();
        markers.name = 'maze-markers';

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        // 입구 (S - 초록색)
        if (this.mazeGen.entrance) {
            const startMarker = this._createMarkerMesh(0x00ffaa, 'S');
            startMarker.position.set(
                offsetX + (this.mazeGen.entrance.x * thickness) + thickness / 2,
                0.01,
                offsetZ + (this.mazeGen.entrance.y * thickness) + thickness / 2
            );
            markers.add(startMarker);
        }

        // 출구 (G - 빨간색)
        if (this.mazeGen.exit) {
            const exitMarker = this._createMarkerMesh(0xff4444, 'G');
            exitMarker.position.set(
                offsetX + (this.mazeGen.exit.x * thickness) + thickness / 2,
                0.01,
                offsetZ + (this.mazeGen.exit.y * thickness) + thickness / 2
            );
            markers.add(exitMarker);
        }

        this.scene.add(markers);
    }

    _createMarkerMesh(color, label) {
        const group = new THREE.Group();

        // 1. 바닥 마법진 표식 (이전 디자인 복구)
        const texture = this._createMagicCircleTexture(color);
        const geo = new THREE.PlaneGeometry(1.2, 1.2);
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const marker = new THREE.Mesh(geo, mat);
        marker.name = 'magic-circle';
        marker.rotation.x = -Math.PI / 2;
        group.add(marker);

        return group;
    }

    _createMagicCircleTexture(colorHex) {
        const size = 256; // 원래 해상도로 복구
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const color = `#${colorHex.toString(16).padStart(6, '0')}`;

        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        const center = size / 2;

        // 바깥 큰 원
        ctx.beginPath();
        ctx.arc(center, center, 120, 0, Math.PI * 2);
        ctx.stroke();

        // 안쪽 작은 원
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(center, center, 100, 0, Math.PI * 2);
        ctx.stroke();

        // 육각형
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = center + Math.cos(angle) * 100;
            const y = center + Math.sin(angle) * 100;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        // 다윗의 별
        for (let j = 0; j < 2; j++) {
            ctx.beginPath();
            const offset = (j * Math.PI);
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 + offset;
                const x = center + Math.cos(angle) * 100;
                const y = center + Math.sin(angle) * 100;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // 중앙 원
        ctx.beginPath();
        ctx.arc(center, center, 30, 0, Math.PI * 2);
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
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

        // 1.5 마법진 회전 애니메이션
        const markers = this.scene.getObjectByName('maze-markers');
        if (markers) {
            markers.children.forEach(markerGroup => {
                const time = Date.now();

                markerGroup.children.forEach(child => {
                    if (child.name === 'magic-circle') {
                        child.rotation.z += deltaTime * 0.5;
                    }
                });
            });
        }

        // 1.6 아이템 업데이트 및 충돌 체크
        if (this.itemManager) {
            this.itemManager.update(deltaTime);
            this.itemManager.checkCollisions(this.player.position, CONFIG.PLAYER.PLAYER_RADIUS, (item) => {
                // 아이템 획득 시 효과
                if (this.game.sound) {
                    this.game.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL, 0.5);
                }

                // 플레이어 상태에 반영
                this.player.applyItemEffect(item);

                // HUD 즉시 갱신
                this._updateHUD();
            });
        }

        // 아이콘/타이머 등 지속적인 HUD 상태 업데이트
        this._updateHUD();

        // 2. 스테이지 종료 체크 (출구 도달)
        this._checkStageCompletion();

        // 3. 카메라 컨트롤러 업데이트 (점프 효과 등)
        const jumpProgress = this.player.isJumping ? this.player.jumpTimer / this.player.jumpDuration : 0;
        this.cameraController.update(deltaTime, this.player.isJumping, jumpProgress);

        // 3. 사용자 입력 처리
        this._handleInput(input);

        // 4. 미니맵 업데이트
        if (this.minimap) {
            this.minimap.draw(
                this.mazeGen.grid,
                this.player.position,
                this.player.rotation.y,
                this.mazeGen.width,
                this.mazeGen.height,
                CONFIG.MAZE.WALL_THICKNESS,
                this.mazeGen.entrance,
                this.mazeGen.exit
            );
        }
    }

    _handleInput(input) {
        if (this.player.isJumping) return;

        if (input.wasJustPressed('ArrowLeft')) this.player.startRotation(Math.PI / 2);
        if (input.wasJustPressed('ArrowRight')) this.player.startRotation(-Math.PI / 2);

        if (input.wasJustPressed('ArrowUp')) this.player.startMove(1);
        else if (input.wasJustPressed('ArrowDown')) this.player.startMove(-1);

        // 3. 점프 (Space 삭제 - 이제 아이템 버튼으로만 가능)

        // 4. 망치 사용 (E 키 또는 HUD 버튼)
        if (input.wasJustPressed('KeyE')) {
            this._useHammer();
        }

        // 5. 스와이프 입력 처리
        const swipe = input.consumeSwipe();
        if (swipe) {
            switch (swipe) {
                case 'up': this.player.startMove(1); break;
                case 'down': this.player.startMove(-1); break;
                case 'left': this.player.startRotation(Math.PI / 2); break;
                case 'right': this.player.startRotation(-Math.PI / 2); break;
            }
        }
    }

    /**
     * HUD UI (인벤토리 및 상태 효과) 동기화
     */
    _updateHUD() {
        if (!this.player) return;

        // 1. 인벤토리 수량 업데이트
        const stageCountEl = document.querySelector('#hud-stage .count');
        if (stageCountEl) stageCountEl.textContent = this.stageManager.level;

        // 2. 점프 아이템 개수 업데이트 (진행중인 부스트 효과 대신 개수 표시)
        const jumpBtn = document.getElementById('use-jump-btn');
        if (jumpBtn) {
            const count = this.player.inventory.jumpCount;
            jumpBtn.querySelector('.count').textContent = count;
            if (count > 0) jumpBtn.classList.remove('locked');
            else jumpBtn.classList.add('locked');
        }

        // 3. 손전등 상태 (원형 프로그레스)
        const flashlightBtn = document.getElementById('use-flashlight-btn');
        if (flashlightBtn) {
            const circle = flashlightBtn.querySelector('.progress-ring__circle');
            if (this.player.flashlightTimer > 0) {
                const radius = 26;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (this.player.flashlightTimer / CONFIG.ITEMS.FLASHLIGHT.DURATION) * circumference;
                circle.style.strokeDashoffset = offset;

                if (this.player.flashlightTimer < CONFIG.ITEMS.FLASHLIGHT.FLICKER_THRESHOLD) {
                    circle.style.stroke = "#ff4444"; // 배터리 부족 시 빨간색
                } else {
                    circle.style.stroke = "#00ffff";
                }
            } else {
                circle.style.strokeDashoffset = 163.36;
            }
        }

        // 4. 미니맵 가시성 제어
        if (this.minimap && this.minimap.container) {
            this.minimap.container.style.display = this.player.inventory.hasMap ? 'block' : 'none';
        }

        // 5. 아이템 액션 버튼 상태 제어
        this._updateItemButtons();

        // 6. 플레이어 좌표 정보 업데이트 (사용자 피드백 반영)
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        // Math.round로 더 직관적인 그리드 인덱스 계산
        const px = Math.round((this.player.group.position.x - offsetX - thickness / 2) / thickness);
        const py = Math.round((this.player.group.position.z - offsetZ - thickness / 2) / thickness);

        const posDisplay = document.getElementById('grid-pos-display');
        if (posDisplay) {
            posDisplay.textContent = `Pos: ${px}, ${py} (${this.mazeGen.width}x${this.mazeGen.height})`;
        }
    }

    /**
     * 아이템 사용 버튼 초기화
     */
    _initItemButtons() {
        const jumpBtn = document.getElementById('use-jump-btn');
        if (jumpBtn) {
            jumpBtn.onclick = () => {
                this.player.startJump(true); // 특수 점프 사용
                this._updateHUD();
            };
        }

        const hammerBtn = document.getElementById('use-hammer-btn');
        if (hammerBtn) {
            hammerBtn.onclick = () => {
                this._useHammer();
            };
        }

        const cheatBtn = document.getElementById('cheat-btn');
        if (cheatBtn) {
            cheatBtn.onclick = () => {
                this.player.applyCheat();
                this._updateHUD();
                this._updateItemButtons();
            };
        }

        const flashlightBtn = document.getElementById('use-flashlight-btn');
        if (flashlightBtn) {
            flashlightBtn.onclick = () => {
                this.player.toggleFlashlight();
                this._updateHUD();
            };
        }
    }

    /**
     * 아이템 버튼의 활성/비활성 시각적 상태 업데이트
     */
    _updateItemButtons() {
        if (!this.player) return;

        const hammerBtn = document.getElementById('use-hammer-btn');
        if (hammerBtn) {
            const count = this.player.inventory.hammerCount;
            hammerBtn.querySelector('.count').textContent = count;
            if (count > 0) hammerBtn.classList.remove('locked');
            else hammerBtn.classList.add('locked');
        }

        const flashlightBtn = document.getElementById('use-flashlight-btn');
        if (flashlightBtn) {
            const hasFlashlight = this.player.inventory.hasFlashlight;
            const battery = this.player.flashlightTimer;

            if (hasFlashlight && battery > 0) {
                flashlightBtn.classList.remove('locked');
                if (this.player.isFlashlightOn) flashlightBtn.classList.add('active');
                else flashlightBtn.classList.remove('active');
            } else {
                flashlightBtn.classList.add('locked');
                flashlightBtn.classList.remove('active');
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
                    if (tx === 0 || tx === width - 1 || ty === 0 || ty === height - 1) {
                        console.warn("ACTION DENIED: Cannot break outer boundary walls!");
                        return;
                    }

                    // 2. 1겹 벽 제약 조건 체크 (뒤쪽 칸 확인)
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

                    // 3. 미로 데이터 업데이트
                    this.mazeGen.grid[ty][tx] = 0;
                    this.player.inventory.hammerCount--;

                    console.log(`SUCCESS: Wall at [${tx}, ${ty}] destroyed. Refreshing visuals...`);

                    // 4. 시각적 메쉬 완전 갱신 (Atomic Sweep)
                    this._refreshMazeMesh();

                    // 5. UI 갱신
                    this._updateHUD();
                    this._updateItemButtons();

                    if (this.game.sound) {
                        this.game.sound.playSFX(CONFIG.AUDIO.ITEM_PICKUP_SFX_URL, 0.6);
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

        // 새로운 미로 생성
        const nextSize = this.stageManager.mazeSize;
        this.mazeGen = new MazeGenerator(nextSize, nextSize);
        this.mazeGen.generateData();

        // 씬 갱신
        this._refreshMazeMesh();
        this._refreshFloorMesh();

        // 플레이어 위치 초기화
        const startPos = this.mazeGen.getStartPosition(CONFIG.MAZE);
        const initialAngle = this._calculateInitialAngle();
        this.player.mazeGen = this.mazeGen;
        this.player.reset(startPos, initialAngle);

        // 아이템 재배치
        if (this.itemManager) {
            this.itemManager.mazeGen = this.mazeGen;
            this.itemManager.spawnItems();
        }

        setTimeout(() => {
            this._isTransitioning = false;
        }, 1000);
    }
}
