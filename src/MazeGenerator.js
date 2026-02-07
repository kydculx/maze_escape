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

        // 마스크 (true: 미로 구역, false: 영구 벽 구역)
        this.mask = Array.from({ length: this.height }, () => Array(this.width).fill(true));

        this.entrance = null;
        this.exit = null;
    }

    /**
     * 특정 모양의 마스크 적용
     */
    applyShapeMask(type) {
        if (!type || type === 'RECTANGLE') return;

        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (type === 'DIAMOND') {
                    // 마름모꼴: 중심으로부터의 맨해튼 거리 기준
                    const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
                    if (dist > Math.max(centerX, centerY)) {
                        this.mask[y][x] = false;
                    }
                } else if (type === 'CIRCLE') {
                    // 원형: 중심으로부터의 유클리드 거리 기준
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > Math.min(centerX, centerY)) {
                        this.mask[y][x] = false;
                    }
                } else if (type === 'TRIANGLE') {
                    // 삼각형: 단순 하향 삼각형
                    if (y < Math.abs(x - centerX)) {
                        this.mask[y][x] = false;
                    }
                } else if (type === 'STAR') {
                    // 별 모양: 극좌표계 활용
                    const dx = (x - centerX) / centerX;
                    const dy = (y - centerY) / centerY;
                    const r = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);

                    // 5각 별 함참함수 (간단한 버전)
                    const starR = 0.7 + 0.3 * Math.cos(5 * angle);
                    if (r > starR) {
                        this.mask[y][x] = false;
                    }
                } else if (type === 'HEXAGON') {
                    // 육각형: 정육각형 충돌 판정
                    const dx = Math.abs(x - centerX) / centerX;
                    const dy = Math.abs(y - centerY) / centerY;
                    // 육각형 공식: x <= 1 && x*0.5 + y*sqrt(3)/2 <= sqrt(3)/2
                    const h = 0.85; // 크기 조절
                    if (dx > h || (dx * 0.5 + dy * 0.866) > h * 0.866) {
                        this.mask[y][x] = false;
                    }
                } else if (type === 'HEART') {
                    // 하트 모양: 하트 곡선 방정식
                    const dx = (x - centerX) / (centerX * 0.8);
                    const dy = -(y - centerY) / (centerY * 0.8); // Y축 반전
                    // (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
                    const a = dx * dx + dy * dy - 1;
                    if (a * a * a - dx * dx * dy * dy * dy > 0) {
                        this.mask[y][x] = false;
                    }
                }
            }
        }
    }

    /**
     * 미로 데이터 생성 (Recursive Backtracking)
     */
    generateData() {
        // 모양 마스크가 적용된 곳은 미리 벽(1)으로 채워둠 (이미 fill(1) 이지만 명시적 확인용으로 놔둠)

        const stack = [];

        // 마스크 내의 유효한 시작점 찾기 (보통 중심 근처)
        let startX = Math.floor(this.width / 2);
        let startY = Math.floor(this.height / 2);
        // 만약 중심이 마스크 밖이라면 (그럴 일은 거의 없지만) 첫 번째 유효한 점 찾기
        if (!this.mask[startY][startX]) {
            outer: for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    if (this.mask[y][x]) {
                        startX = x; startY = y; break outer;
                    }
                }
            }
        }

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

                // 마스크 범위 내에 있고 아직 벽인 곳만
                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 &&
                    this.mask[ny][nx] && this.grid[ny][nx] === 1) {
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

        // 입구 생성: 마스크 내 왼쪽 가장자리에서 가장 처음 만나는 길 찾기
        outerIn: for (let x = 0; x < this.width; x++) {
            for (let y = 1; y < this.height - 1; y++) {
                if (this.mask[y][x] && this.grid[y][x + 1] === 0) {
                    this.grid[y][x] = 0;
                    this.entrance = { x: x, y: y };
                    break outerIn;
                }
            }
        }

        // 출구 생성: 마스크 내 오른쪽 가장자리에서 가장 마지막에 만나는 길 찾기
        outerOut: for (let x = this.width - 1; x >= 0; x--) {
            for (let y = this.height - 2; y >= 1; y--) {
                if (this.mask[y][x] && this.grid[y][x - 1] === 0 && (x !== this.entrance.x || y !== this.entrance.y)) {
                    this.grid[y][x] = 0;
                    this.exit = { x: x, y: y };
                    break outerOut;
                }
            }
        }

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
