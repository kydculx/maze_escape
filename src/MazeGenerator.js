import * as THREE from 'three';

/**
 * 3D 미로 생성 클래스
 * Recursive Backtracking 알고리즘 사용
 */
export class MazeGenerator {
    constructor(width, height) {
        // 미로 크기는 반드시 홀수여야 함 (벽-길-벽 구조를 위해)
        this.width = width % 2 === 0 ? width + 1 : width;
        this.height = height % 2 === 0 ? height + 1 : height;

        // 0: 길, 1: 벽
        this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(1));
        this.entrance = null;
        this.exit = null;
    }

    /**
     * 미로 데이터 생성 (Recursive Backtracking)
     */
    generateData() {
        const stack = [];
        const startX = 1;
        const startY = 1;

        this.grid[startY][startX] = 0;
        stack.push([startX, startY]);

        const directions = [
            [0, -2], // 상
            [0, 2],  // 하
            [-2, 0], // 좌
            [2, 0]   // 우
        ];

        while (stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1];
            const neighbors = [];

            for (const [dx, dy] of directions) {
                const nx = cx + dx;
                const ny = cy + dy;

                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx] === 1) {
                    neighbors.push([nx, ny, dx, dy]);
                }
            }

            if (neighbors.length > 0) {
                const [nx, ny, dx, dy] = neighbors[Math.floor(Math.random() * neighbors.length)];

                // 현재 칸과 다음 칸 사이의 벽을 허묾
                this.grid[cy + dy / 2][cx + dx / 2] = 0;
                this.grid[ny][nx] = 0;

                stack.push([nx, ny]);
            } else {
                stack.pop();
            }
        }

        // 입구 생성 (왼쪽 벽)
        this.grid[1][0] = 0;
        this.entrance = { x: 0, y: 1 };

        // 출구 생성 (오른쪽 벽 가장 먼 곳 중 하나)
        this.grid[this.height - 2][this.width - 1] = 0;
        this.exit = { x: this.width - 1, y: this.height - 2 };

        return this.grid;
    }

    /**
     * Three.js 메시 그룹 생성
     */
    generateThreeMesh(config) {
        const group = new THREE.Group();
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load(config.TEXTURE_URL);

        // 텍스처 수직 반복 설정 (벽 높이에 맞춰)
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(1, config.WALL_HEIGHT / 1.5);

        const wallGeometry = new THREE.BoxGeometry(config.WALL_THICKNESS, config.WALL_HEIGHT, config.WALL_THICKNESS);
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: config.WALL_COLOR,
            roughness: 0.9,
            metalness: 0.05
        });

        // 바닥 타일 설정
        const floorTexture = textureLoader.load(config.FLOOR_TEXTURE_URL);
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        // 타일 하나당 텍스처 한 번 반복
        floorTexture.repeat.set(1, 1);

        const floorGeometry = new THREE.PlaneGeometry(config.WALL_THICKNESS, config.WALL_THICKNESS);
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            color: 0x888888, // 바닥은 약간 어둡게 (PlayScene의 기존 0x444444보다 약간 밝게)
            roughness: 0.8,
            metalness: 0.1
        });

        const offsetX = -(this.width * config.WALL_THICKNESS) / 2;
        const offsetZ = -(this.height * config.WALL_THICKNESS) / 2;

        let wallCount = 0;
        let floorCount = 0;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const posX = offsetX + (x * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2;
                const posZ = offsetZ + (y * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2;

                // 1. 모든 칸에 바닥 생성 (벽이 있건 없건)
                const floorTile = new THREE.Mesh(floorGeometry, floorMaterial);
                floorTile.position.set(posX, 0.01, posZ);
                floorTile.rotation.x = -Math.PI / 2;
                floorTile.receiveShadow = true;
                group.add(floorTile);

                // 2. 벽인 경우에만 그 위에 벽 생성
                if (this.grid[y][x] === 1) {
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    // 바닥 타일 위에 올라오도록 y 위치 살짝 조정 (0.01 + 높이/2)
                    wall.position.set(posX, config.WALL_HEIGHT / 2 + 0.01, posZ);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    group.add(wall);
                    wallCount++;
                } else {
                    floorCount++;
                }
            }
        }

        console.log(`Mesh Gen: ${wallCount} walls, ${floorCount} floors created.`);

        console.log(`Mesh Gen: ${wallCount} walls, ${floorCount} floors.`);
        return group;
    }

    /**
     * 시작 월드 좌표 반환 (입구 위치)
     */
    getStartPosition(config) {
        const offsetX = -(this.width * config.WALL_THICKNESS) / 2;
        const offsetZ = -(this.height * config.WALL_THICKNESS) / 2;

        // 입구인 (0, 1)의 월드 좌표 반환
        return {
            x: offsetX + (0 * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2,
            z: offsetZ + (1 * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2
        };
    }
}
