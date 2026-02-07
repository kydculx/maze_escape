/**
 * 3D 미로 상의 데이터 생성 클래스
 * Recursive Backtracking 알고리즘 사용
 */
export class MazeGenerator {
    constructor(width, height) {
        // 미로 크기는 반드시 홀수여야 함 (벽-길-벽 구조를 위해)
        this.width = width % 2 === 0 ? width + 1 : width;
        this.height = height % 2 === 0 ? height + 1 : height;

        // 0: 길, 1: 벽
        this.grid = Array.from({ length: this.height }, () => Array(this.width).fill(1));

        // 탐험 상태 (true: 방문함, false: 미지)
        this.explored = Array.from({ length: this.height }, () => Array(this.width).fill(false));

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
     * 특정 설정 기반의 시작 좌표 계산 (Helper)
     */
    getStartWorldPosition(config) {
        const offsetX = -(this.width * config.WALL_THICKNESS) / 2;
        const offsetZ = -(this.height * config.WALL_THICKNESS) / 2;

        return {
            x: offsetX + (this.entrance.x * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2,
            z: offsetZ + (this.entrance.y * config.WALL_THICKNESS) + config.WALL_THICKNESS / 2
        };
    }

    /**
     * 월드 좌표를 그리드 좌표로 변환하고 주변을 탐험된 것으로 표시
     */
    markExplored(worldX, worldZ, thickness, radius = 1) {
        const offsetX = -(this.width * thickness) / 2;
        const offsetZ = -(this.height * thickness) / 2;

        const gx = Math.floor((worldX - offsetX) / thickness);
        const gy = Math.floor((worldZ - offsetZ) / thickness);

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = gx + dx;
                const ny = gy + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    this.explored[ny][nx] = true;
                }
            }
        }
    }

    /**
     * 모든 구역을 탐험한 것으로 표시 (치트/아이템용)
     */
    revealAll() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.explored[y][x] = true;
            }
        }
    }
}
