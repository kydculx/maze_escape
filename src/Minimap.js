import { CONFIG } from './Config.js';

/**
 * 미로의 구조와 플레이어 위치를 보여주는 미니맵 클래스
 */
export class Minimap {
    constructor() {
        const config = CONFIG.ITEMS.MAP;
        this.container = document.getElementById('minimap-container');
        this.canvas = document.getElementById('minimap-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 캔버스 내부 해상도 설정
        this.canvas.width = 200;
        this.canvas.height = 200;

        const colors = config.COLORS;
        this.colors = {
            background: 'rgba(0, 0, 0, 0.4)',
            wall: colors.WALL,
            road: colors.ROAD,
            player: colors.PLAYER,
            border: '#555555',
            entrance: colors.ENTRANCE,
            exit: colors.EXIT
        };
        this.rotationFollow = config.ROTATION_FOLLOW;
    }

    /**
     * 미니맵 렌더링 (회전형 HUD 스타일)
     */
    draw(grid, explored, playerPos, playerRotationY, mazeWidth, mazeHeight, thickness, entrance, exit, monsters = []) {
        if (!grid || !explored || !this.ctx) return;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const centerX = cw / 2;
        const centerY = ch / 2;

        // 1. 초기화 (투명하게)
        ctx.clearRect(0, 0, cw, ch);

        // 2. 전체 미로 정중앙 기준 회전 설정
        const cellW = Math.min(cw / mazeWidth, ch / mazeHeight) * 0.8;
        const cellH = cellW;

        // 월드 좌표를 그리드 좌표로 변환
        const offsetX = -(mazeWidth * thickness) / 2;
        const offsetZ = -(mazeHeight * thickness) / 2;
        const gridX = (playerPos.x - offsetX) / thickness;
        const gridY = (playerPos.z - offsetZ) / thickness;

        ctx.save();
        ctx.translate(centerX, centerY); // 1. 캔버스 정중앙으로 이동

        // 캐릭터의 시야가 항상 북쪽(위쪽)을 향하도록 맵 회전
        if (this.rotationFollow) {
            ctx.rotate(playerRotationY);
        }

        // 3. 미로 그리드 그리기
        ctx.translate(-(mazeWidth * cellW / 2), -(mazeHeight * cellH / 2));

        for (let y = 0; y < mazeHeight; y++) {
            for (let x = 0; x < mazeWidth; x++) {
                // 탐험된 곳만 그리기
                if (!explored[y][x]) continue;

                if (grid[y][x] === 1) {
                    ctx.fillStyle = this.colors.wall;
                    ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                } else {
                    ctx.fillStyle = this.colors.road;
                    ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                }

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.strokeRect(x * cellW, y * cellH, cellW, cellH);
            }
        }

        // 3.5 입구/출구 표시 (탐험된 경우에만)
        if (entrance && explored[entrance.y][entrance.x]) {
            ctx.fillStyle = this.colors.entrance;
            ctx.fillRect(entrance.x * cellW, entrance.y * cellH, cellW, cellH);
            this._drawLabel(ctx, 'S', entrance.x * cellW + cellW / 2, entrance.y * cellH + cellH / 2, cellW);
        }
        if (exit && explored[exit.y][exit.x]) {
            ctx.fillStyle = this.colors.exit;
            ctx.fillRect(exit.x * cellW, exit.y * cellH, cellW, cellH);
            this._drawLabel(ctx, 'G', exit.x * cellW + cellW / 2, exit.y * cellH + cellH / 2, cellW);
        }

        // 4. 플레이어 아이콘 표시
        const px = gridX * cellW;
        const py = gridY * cellH;

        ctx.save();
        ctx.translate(px, py);
        // 맵이 회전할 때는 아이콘이 항상 위를 보고, 맵이 고정일 때는 아이콘이 실제 회전각을 따라감
        ctx.rotate(-playerRotationY);

        const iconSize = cellW * 1.0;
        ctx.fillStyle = this.colors.player;

        ctx.beginPath();
        ctx.moveTo(0, -iconSize / 2); // 정면 
        ctx.lineTo(iconSize / 2, iconSize / 2);
        ctx.lineTo(-iconSize / 2, iconSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawLabel(ctx, text, x, y, size) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${size * 0.8}px Inter, Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}
