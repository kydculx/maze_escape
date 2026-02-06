import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CONFIG } from '../Config.js';
import { MazeGenerator } from '../MazeGenerator.js';
import { Minimap } from '../Minimap.js';
import { Player } from '../Player.js';
import { CameraController } from '../CameraController.js';

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

        // 7. 미니맵 초기화
        this.minimap = new Minimap();
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

        console.log(`Maze reset: ${newWidth}x${newHeight}`);
    }

    _refreshMazeMesh() {
        const old = this.scene.getObjectByName('maze-mesh');
        if (old) {
            this.scene.remove(old);
            // Group인 경우 하위 메쉬들의 자원을 각각 해제해야 함
            old.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        const mazeMesh = this.mazeGen.generateThreeMesh(CONFIG.MAZE);
        mazeMesh.name = 'maze-mesh';
        this.scene.add(mazeMesh);

        // 입구/출구 시각적 표식 추가
        this._addMazeMarkers();
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

        // 1. 바닥 마법진 표식
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
        const size = 256;
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

        // 육각형 (또는 별 모양)
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

        // 역삼각형 2개로 다윗의 별 형태
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

        // 중앙 기호 혹은 작은 원
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

        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load(CONFIG.MAZE.FLOOR_TEXTURE_URL);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        const floorSize = Math.max(this.mazeGen.width, this.mazeGen.height) * CONFIG.MAZE.WALL_THICKNESS + 2;
        floorTexture.repeat.set(floorSize / 2, floorSize / 2);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(floorSize, floorSize),
            new THREE.MeshStandardMaterial({ map: floorTexture, color: 0x444444 })
        );
        floor.name = 'floor-mesh';
        floor.rotation.x = -Math.PI / 2;
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
                const circle = markerGroup.children.find(c => c.name === 'magic-circle');
                if (circle) circle.rotation.z += deltaTime * 0.5;
            });
        }

        // 2. 카메라 컨트롤러 업데이트 (점프 효과 등)
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
        // 점프 중에는 회전/이동 입력 차단 (필요시 시도 가능하지만 조작 안정성을 위해)
        if (this.player.isJumping) {
            return;
        }

        // [1] 키보드 입력 처리
        if (input.wasJustPressed('ArrowLeft')) this.player.startRotation(Math.PI / 2);
        if (input.wasJustPressed('ArrowRight')) this.player.startRotation(-Math.PI / 2);

        if (input.wasJustPressed('ArrowUp')) this.player.startMove(1);
        else if (input.wasJustPressed('ArrowDown')) this.player.startMove(-1);

        if (input.wasJustPressed(CONFIG.PLAYER.TOGGLE_VIEW_KEY)) this.cameraController.toggleView();
        if (input.wasJustPressed('Space')) this.player.startJump();

        // [2] 제스처(스와이프) 입력 처리
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
}
