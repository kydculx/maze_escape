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
     * 미로 데이터 생성 (Iterative Randomized DFS)
     * - 고전적인 미로 알고리즘.
     * - 방향을 무작위로 섞어서 진행하므로 긴 직선보다는 구불구불한 경로가 생성됨.
     * - 스택을 사용하여 재귀 호출 없이 구현 (안전성 확보).
     */
    generateData() {
        // 1. 초기화: 모든 셀은 벽(1) (생성자에서 이미 완료)

        const stack = [];

        // 2. 시작점 선택 (홀수 좌표)
        let startX = 1;
        let startY = 1;

        // 마스크 내의 유효한 시작점 찾기
        while (!this.mask[startY][startX]) {
            startX += 2; // 홀수 칸 이동
            if (startX >= this.width - 1) {
                startX = 1;
                startY += 2;
            }
            if (startY >= this.height - 1) break;
        }

        // 시작점 뚫기 및 스택 푸시
        this.grid[startY][startX] = 0;
        stack.push([startX, startY]);

        // 방향 정의 (상, 하, 좌, 우 - 2칸씩)
        const directions = [
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ];

        // Fisher-Yates Shuffle for directions
        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        // 3. 반복 (스택이 빌 때까지)
        while (stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1]; // 현재 위치 (Peek)

            // 연결 가능한 이웃 찾기
            const neighbors = [];

            for (const [dx, dy] of directions) {
                const nx = cx + dx;
                const ny = cy + dy;

                // 유효 범위 체크
                if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
                    // 마스크 내부이고 && 아직 방문하지 않은 벽(1)이라면
                    if (this.mask[ny][nx] && this.grid[ny][nx] === 1) {
                        neighbors.push([nx, ny, dx, dy]);
                    }
                }
            }

            if (neighbors.length > 0) {
                // 이웃 중 하나를 랜덤 선택 (섞기)
                shuffle(neighbors);
                const [nx, ny, dx, dy] = neighbors[0];

                // 벽 뚫기 (중간 벽 + 다음 칸)
                this.grid[cy + dy / 2][cx + dx / 2] = 0; // 중간 벽
                this.grid[ny][nx] = 0;                   // 다음 칸

                // 다음 칸을 스택에 추가
                stack.push([nx, ny]);
            } else {
                // 갈 곳이 없으면 스택에서 제거 (Backtracking)
                stack.pop();
            }
        }

        // 입구/출구 생성
        this._createEntranceAndExit();

        return this.grid;
    }

    _createEntranceAndExit() {
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

        // Fallback: 입구를 찾지 못했으면 강제로 (0, 1)에 생성 (항상 (1,1)은 열려있으므로)
        if (!this.entrance) {
            console.warn("MazeGenerator: Failed to find natural entrance, forcing fallback at (0, 1).");
            this.grid[1][1] = 0; // Ensure neighbor is open
            this.grid[1][0] = 0; // Open entrance
            this.entrance = { x: 0, y: 1 };
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

        // Fallback: 출구를 찾지 못했으면 강제로 반대편 끝에 생성
        if (!this.exit) {
            console.warn("MazeGenerator: Failed to find natural exit, forcing fallback.");
            const exitX = this.width - 1;
            const exitY = this.height - 2;
            this.grid[exitY][exitX - 1] = 0; // Ensure neighbor is open
            this.grid[exitY][exitX] = 0;     // Open exit
            this.exit = { x: exitX, y: exitY };
        }
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

    /**
     * 특정 영역을 탐험한 것으로 표시 (지도 조각용)
     * @param {number} regionIndex - 영역 인덱스 (0 ~ rows*cols-1)
     * @param {number} rows - 분할 행 수
     * @param {number} cols - 분할 열 수
     */
    revealRegion(regionIndex, rows, cols) {
        const regionWidth = Math.ceil(this.width / cols);
        const regionHeight = Math.ceil(this.height / rows);

        const startX = (regionIndex % cols) * regionWidth;
        const startY = Math.floor(regionIndex / cols) * regionHeight;

        const endX = Math.min(startX + regionWidth, this.width);
        const endY = Math.min(startY + regionHeight, this.height);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                this.explored[y][x] = true;
            }
        }
        console.log(`[MazeGenerator] Revealed region ${regionIndex} (${startX},${startY}) to (${endX},${endY})`);
    }

    /**
     * 스위치를 배치할 수 있는 유효한 벽 위치 목록을 반환
     * 조건: 
     * 1. 막다른 길(Dead End)을 기점으로 함
     * 2. 해당 막다른 길까지의 경로가 segmentLength 이상 외길(갈래길 없음)이어야 함
     * 3. 막다른 길을 둘러싼 벽 중 반대편이 통로인 '1겹 벽'에 설치
     */
    getValidSwitchPositions(segmentLength = 5) {
        const positions = [];
        const deadEnds = [];

        // 1. 모든 막다른 길(이웃 길이 1개인 곳) 찾기
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.grid[y][x] === 0) {
                    let pathNeighbors = [];
                    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    for (const [dx, dy] of dirs) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            if (this.grid[ny][nx] === 0) pathNeighbors.push([nx, ny]);
                        }
                    }
                    if (pathNeighbors.length === 1) {
                        deadEnds.push({ x, y, startNeighbor: pathNeighbors[0] });
                    }
                }
            }
        }

        // 2. 각 막다른 길에서 외길 구간 길이 체크
        deadEnds.forEach(de => {
            let length = 1;
            let current = [de.x, de.y];
            let prev = null;
            let isStraight = true;

            while (length < segmentLength) {
                const neighbors = [];
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dx, dy] of dirs) {
                    const nx = current[0] + dx, ny = current[1] + dy;
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] === 0) {
                        if (!prev || (nx !== prev[0] || ny !== prev[1])) {
                            neighbors.push([nx, ny]);
                        }
                    }
                }

                // 갈래길이 나오면 탈락
                if (neighbors.length !== 1) {
                    isStraight = false;
                    break;
                }

                prev = current;
                current = neighbors[0];
                length++;
            }

            if (isStraight && length >= segmentLength) {
                // 3. 막다른 길 주변의 벽 중 '1겹 벽' 찾기
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dx, dy] of dirs) {
                    const wx = de.x + dx, wy = de.y + dy; // 타겟 벽 후보

                    // 외곽벽 및 마스크 체크
                    if (wx <= 0 || wx >= this.width - 1 || wy <= 0 || wy >= this.height - 1 || !this.mask[wy][wx]) continue;

                    if (this.grid[wy][wx] === 1) {
                        // 반대편이 통로인가? (1겹 벽 확인)
                        const ox = wx + dx, oy = wy + dy;
                        if (ox >= 0 && ox < this.width && oy >= 0 && oy < this.height && this.grid[oy][ox] === 0) {
                            positions.push({
                                x: wx,
                                y: wy,
                                orientation: dx !== 0 ? 'HORIZONTAL' : 'VERTICAL'
                            });
                        }
                    }
                }
            }
        });

        return positions;
    }
}
