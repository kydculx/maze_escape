import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { Zombie } from './Zombie.js';

/**
 * 미로 내의 모든 몬스터를 관리하는 클래스
 */
export class MonsterManager {
    constructor(scene, mazeGen, soundManager) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.sound = soundManager;
        this.monsters = [];
    }

    /**
     * 지정된 개수만큼 좀비 스폰
     * @param {number} count 
     */
    spawnZombies(count = 5) {
        const emptyCells = this._getEmptyCells();
        const spawnCount = Math.min(count, emptyCells.length);

        for (let i = 0; i < spawnCount; i++) {
            // 랜덤한 빈 칸 선택
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            const cell = emptyCells.splice(randomIndex, 1)[0];

            const zombie = new Zombie(this.scene, this.mazeGen, { sound: this.sound });

            // 월드 좌표 계산 (MazeGenerator의 좌표계 사용)
            const thickness = CONFIG.MAZE.WALL_THICKNESS;
            const offsetX = -(this.mazeGen.width * thickness) / 2;
            const offsetZ = -(this.mazeGen.height * thickness) / 2;

            zombie.position.set(
                offsetX + cell.x * thickness + thickness / 2,
                0,
                offsetZ + cell.y * thickness + thickness / 2
            );

            // 주변 통로(길) 방향을 찾아서 그 중 하나를 바라보게 설정
            const neighbors = [
                { dx: 1, dy: 0, angle: -Math.PI / 2 }, // 동 (MazeGenerator 기준)
                { dx: -1, dy: 0, angle: Math.PI / 2 }, // 서
                { dx: 0, dy: 1, angle: Math.PI },       // 남
                { dx: 0, dy: -1, angle: 0 }            // 북
            ];

            const roadDirs = neighbors.filter(dir => {
                const nx = cell.x + dir.dx;
                const ny = cell.y + dir.dy;
                return nx >= 0 && nx < this.mazeGen.width &&
                    ny >= 0 && ny < this.mazeGen.height &&
                    this.mazeGen.grid[ny][nx] === 0;
            });

            if (roadDirs.length > 0) {
                // 길 중 하나를 무작위로 골라 바라봄
                zombie.rotation.y = roadDirs[Math.floor(Math.random() * roadDirs.length)].angle;
            } else {
                zombie.rotation.y = Math.random() * Math.PI * 2;
            }

            this.monsters.push(zombie);
        }

        console.log(`${spawnCount} zombies spawned.`);
    }

    /**
     * 빈 칸(길) 좌표 목록 가져오기 (입구/출구 제외 권장)
     */
    _getEmptyCells() {
        const cells = [];
        for (let y = 0; y < this.mazeGen.height; y++) {
            for (let x = 0; x < this.mazeGen.width; x++) {
                if (this.mazeGen.grid[y][x] === 0) {
                    // 입구/출구 위치는 피함 (플레이어 방해 금지)
                    const isEntrance = this.mazeGen.entrance && x === this.mazeGen.entrance.x && y === this.mazeGen.entrance.y;
                    const isExit = this.mazeGen.exit && x === this.mazeGen.exit.x && y === this.mazeGen.exit.y;

                    if (!isEntrance && !isExit) {
                        cells.push({ x, y });
                    }
                }
            }
        }
        return cells;
    }

    /**
     * 모든 몬스터 업데이트
     */
    update(deltaTime, player) {
        for (const monster of this.monsters) {
            monster.update(deltaTime, player);
        }
    }

    /**
     * 초기화 (새 스테이지 등)
     */
    clear() {
        for (const monster of this.monsters) {
            monster.destroy();
        }
        this.monsters = [];
    }
}
