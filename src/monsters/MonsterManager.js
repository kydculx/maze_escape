import * as THREE from 'three';
import { CONFIG } from '../Config.js';
import { Zombie } from './Zombie.js';
import { WolfZombie } from './WolfZombie.js';

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
     * 지정된 개수만큼 몬스터 스폰 (좀비 + 늑대 좀비)
     * @param {number} count 
     * @param {number} level - 현재 스테이지 레벨 (속도 계산용)
     */
    spawnZombies(count = 5, level = 1) {
        // 스테이지 3부터 늑대 좀비 등장
        const wolfMinStage = CONFIG.MONSTERS.WOLF_ZOMBIE.SPAWN_MIN_STAGE;
        const canSpawnWolves = level >= wolfMinStage;

        // 늑대 좀비 비율: 일반 좀비 3마리당 1마리 (25%)
        let wolfCount = 0;
        let zombieCount = count;

        if (canSpawnWolves) {
            // 전체의 25%를 늑대 좀비로, 최소 1마리 보장
            wolfCount = Math.max(1, Math.round(count * 0.25));
            zombieCount = count - wolfCount;
        }

        console.log(`Spawning ${zombieCount} zombies and ${wolfCount} wolf zombies (level ${level})`);

        // 좀비 스폰
        this._spawnMonsterType(CONFIG.MONSTERS.TYPES.ZOMBIE, zombieCount, level);

        // 늑대 좀비 스폰
        if (wolfCount > 0) {
            this._spawnMonsterType(CONFIG.MONSTERS.TYPES.WOLF_ZOMBIE, wolfCount, level);
        }
    }

    /**
     * 특정 타입의 몬스터를 스폰하는 헬퍼 메서드
     * @param {string} monsterType - 몬스터 타입 (ZOMBIE 또는 WOLF_ZOMBIE)
     * @param {number} count - 스폰할 개수
     * @param {number} level - 현재 스테이지 레벨
     */
    _spawnMonsterType(monsterType, count, level) {
        if (count <= 0) return;
        // 빈 칸 가져오기 (입구/출구 제외된 상태)
        let emptyCells = this._getEmptyCells();

        // [안전 거리 확보] 입구로부터 5타일 이상 떨어진 곳만 필터링
        // [안전 거리 확보] 입구로부터 5타일 이상 떨어진 곳만 필터링
        if (this.mazeGen.entrance) {
            // 맵 크기에 따라 안전 거리 유동적 조정 (기본값 vs 맵 크기의 절반)
            // 작은 맵(5x5)에서는 10칸 거리가 불가능하므로 조정 필요
            const configDist = CONFIG.MONSTERS.ZOMBIE.SAFE_SPAWN_DISTANCE;
            const mapBasedDist = Math.floor(Math.max(this.mazeGen.width, this.mazeGen.height) / 2);
            const safeDistance = Math.min(configDist, mapBasedDist);

            const safeCells = emptyCells.filter(cell => {
                // 맨해튼 거리 (Manhattan Distance) 사용: |x1-x2| + |y1-y2|
                const dist = Math.abs(cell.x - this.mazeGen.entrance.x) + Math.abs(cell.y - this.mazeGen.entrance.y);
                return dist >= safeDistance;
            });

            // 만약 안전한 곳이 충분히 있다면 그곳들 중에서만 선택
            // (맵이 너무 작거나 꽉 차서 안전한 곳이 아예 없으면 기존 emptyCells 사용)
            if (safeCells.length > 0) {
                emptyCells = safeCells;
            } else {
                console.warn(`No safe spawn points found (dist >= ${safeDistance}). Using all empty cells.`);
            }
        }

        const spawnCount = Math.min(count, emptyCells.length);

        for (let i = 0; i < spawnCount; i++) {
            // 랜덤한 빈 칸 선택
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            const cell = emptyCells.splice(randomIndex, 1)[0];

            // 몬스터 타입에 따라 인스턴스 생성
            let monster;
            if (monsterType === CONFIG.MONSTERS.TYPES.WOLF_ZOMBIE) {
                monster = new WolfZombie(this.scene, this.mazeGen, { sound: this.sound, level });
            } else {
                monster = new Zombie(this.scene, this.mazeGen, { sound: this.sound, level });
            }

            // 월드 좌표 계산 (MazeGenerator의 좌표계 사용)
            const thickness = CONFIG.MAZE.WALL_THICKNESS;
            const offsetX = -(this.mazeGen.width * thickness) / 2;
            const offsetZ = -(this.mazeGen.height * thickness) / 2;

            monster.position.set(
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
                monster.rotation.y = roadDirs[Math.floor(Math.random() * roadDirs.length)].angle;
            } else {
                monster.rotation.y = Math.random() * Math.PI * 2;
            }

            this.monsters.push(monster);
        }
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
