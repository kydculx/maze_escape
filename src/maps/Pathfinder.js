/**
 * 그리드 기반 A* (A-Star) 길찾기 알고리즘 유틸리티
 */
export class Pathfinder {
    /**
     * 그리드 내 두 지점 사이의 최단 경로를 찾음
     * @param {Array<Array<number>>} grid - 미로 그리드 (0: 길, 1: 벽)
     * @param {Object} start - 시작점 {x, y}
     * @param {Object} end - 도착점 {x, y}
     * @returns {Array<Object>|null} 경로 배열 [{x, y}, ...] 또는 못 찾으면 null
     */
    static findPath(grid, start, end) {
        if (!grid || !start || !end) return null;

        const height = grid.length;
        const width = grid[0].length;

        // 시작점이나 끝점이 유효하지 않으면 조기 종료
        if (start.x < 0 || start.x >= width || start.y < 0 || start.y >= height ||
            end.x < 0 || end.x >= width || end.y < 0 || end.y >= height) {
            return null;
        }

        const openSet = [];
        const closedSet = new Set();

        const startNode = {
            x: start.x,
            y: start.y,
            g: 0,
            h: this._getHeuristic(start, end),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        openSet.push(startNode);

        while (openSet.length > 0) {
            // f 점수가 가장 낮은 노드 선택
            let lowestIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIndex].f) {
                    lowestIndex = i;
                }
            }

            const current = openSet[lowestIndex];

            // 목표 도달 시 경로 재구성하여 반환
            if (current.x === end.x && current.y === end.y) {
                return this._reconstructPath(current);
            }

            // 현재 노드를 openSet에서 제거하고 closedSet에 추가
            openSet.splice(lowestIndex, 1);
            closedSet.add(`${current.x},${current.y}`);

            // 이웃 확인 (상하좌우)
            const neighbors = [
                { x: current.x, y: current.y - 1 },
                { x: current.x, y: current.y + 1 },
                { x: current.x - 1, y: current.y },
                { x: current.x + 1, y: current.y }
            ];

            for (const neighborPos of neighbors) {
                // 경계 및 벽 체크
                if (neighborPos.x < 0 || neighborPos.x >= width ||
                    neighborPos.y < 0 || neighborPos.y >= height ||
                    grid[neighborPos.y][neighborPos.x] === 1 ||
                    closedSet.has(`${neighborPos.x},${neighborPos.y}`)) {
                    continue;
                }

                const gScore = current.g + 1;
                let neighborNode = openSet.find(n => n.x === neighborPos.x && n.y === neighborPos.y);

                if (!neighborNode) {
                    neighborNode = {
                        x: neighborPos.x,
                        y: neighborPos.y,
                        g: gScore,
                        h: this._getHeuristic(neighborPos, end),
                        f: 0,
                        parent: current
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    // 더 좋은 경로 발견
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }

        return null; // 경로 없음
    }

    /**
     * 맨해튼 거리 (Manhattan Distance) 기반 휴리스틱 계산
     */
    static _getHeuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * 노드 구조를 따라가며 좌표 배열 생성
     */
    static _reconstructPath(node) {
        const path = [];
        let current = node;
        while (current) {
            path.push({ x: current.x, y: current.y });
            current = current.parent;
        }
        return path.reverse();
    }
}
