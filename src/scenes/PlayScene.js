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
            old.geometry.dispose();
            if (Array.isArray(old.material)) old.material.forEach(m => m.dispose());
            else old.material.dispose();
        }
        const mazeMesh = this.mazeGen.generateThreeMesh(CONFIG.MAZE);
        mazeMesh.name = 'maze-mesh';
        this.scene.add(mazeMesh);
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
                CONFIG.MAZE.WALL_THICKNESS
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

        if (input.wasJustPressed(CONFIG.PHYSICS.TOGGLE_VIEW_KEY)) this.cameraController.toggleView();
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
