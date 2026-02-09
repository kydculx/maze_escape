import * as THREE from 'three';
import { Item } from './Item.js';
import { CONFIG } from './Config.js';

/**
 * 미로 내 아이템의 생성, 관리, 충돌을 제어하는 클래스
 */
export class ItemManager {
    constructor(scene, mazeGen, config) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.config = config; // CONFIG.ITEMS

        this.items = [];
        this.itemGroup = new THREE.Group();
        this.itemGroup.name = 'maze-items';
        this.scene.add(this.itemGroup);
    }

    /**
     * 미로 내 빈 공간에 아이템을 배치
     * @param {number} count - 생성할 아이템 개수 (선택적, 기본값은 config.SPAWN_COUNT)
     * @param {number} level - 현재 레벨 (아이템 잠금 해제 판정용)
     */
    spawnItems(count = null, level = 1) {
        this.clearItems();

        const emptyCells = [];
        for (let y = 1; y < this.mazeGen.height - 1; y++) {
            for (let x = 1; x < this.mazeGen.width - 1; x++) {
                // 길이면서 입구/출구가 아닌 곳만 후보로 선택
                if (this.mazeGen.grid[y][x] === 0) {
                    const isEntrance = (x === this.mazeGen.entrance.x && y === this.mazeGen.entrance.y);
                    const isExit = (x === this.mazeGen.exit.x && y === this.mazeGen.exit.y);

                    if (!isEntrance && !isExit) {
                        emptyCells.push({ x, y });
                    }
                }
            }
        }

        // 현재 레벨에서 사용 가능한 아이템만 필터링
        const allItemTypes = Object.keys(this.config.TYPES);
        const unlockedItemTypes = allItemTypes.filter(typeKey => {
            const unlockLevel = this.config.UNLOCK_LEVELS?.[typeKey] ?? 1;
            return level >= unlockLevel;
        });

        // 사용 가능한 아이템이 없으면 경고 후 종료
        if (unlockedItemTypes.length === 0) {
            console.warn(`[ItemManager] No items unlocked at level ${level}`);
            return;
        }

        // 섞어서 N개 선택
        this._shuffle(emptyCells);
        const spawnCount = Math.min(count ?? this.config.SPAWN_COUNT, emptyCells.length);

        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        // 비소모성 아이템 추적 (맵당 1개씩만)
        const spawnedNonConsumables = new Set();

        for (let i = 0; i < spawnCount; i++) {
            const cell = emptyCells[i];

            // 사용 가능한 아이템 중 선택 (비소모성은 이미 생성된 것 제외)
            const availableTypes = unlockedItemTypes.filter(typeKey => {
                const itemConfig = this.config.TYPES[typeKey];
                const isConsumable = itemConfig.CONSUMABLE ?? true; // 기본값은 소모성

                // 소모성이면 항상 가능, 비소모성이면 아직 생성 안 된 것만
                return isConsumable || !spawnedNonConsumables.has(typeKey);
            });

            // 사용 가능한 아이템이 없으면 건너뛰기
            if (availableTypes.length === 0) continue;

            const typeKey = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            const visualConfig = this.config.TYPES[typeKey];

            // 비소모성이면 추적 목록에 추가
            if (!visualConfig.CONSUMABLE) {
                spawnedNonConsumables.add(typeKey);
            }

            const item = new Item(typeKey, this.config, visualConfig);

            // 월드 좌표로 변환
            item.group.position.x = offsetX + (cell.x * thickness) + thickness / 2;
            item.group.position.z = offsetZ + (cell.y * thickness) + thickness / 2;

            this.items.push(item);
            this.itemGroup.add(item.group);
        }

        console.log(`${this.items.length} items spawned (${spawnedNonConsumables.size} unique non-consumables).`);
    }

    /**
     * 플레이어 주변 빈 공간에 사용 가능한 모든 아이템을 소환 (치트용)
     */
    spawnNearbyItems(playerPos, level = 1) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const width = this.mazeGen.width;
        const height = this.mazeGen.height;
        const offsetX = -(width * thickness) / 2;
        const offsetZ = -(height * thickness) / 2;

        // 플레이어의 현재 그리드 좌표
        const px = Math.floor((playerPos.x - offsetX) / thickness);
        const py = Math.floor((playerPos.z - offsetZ) / thickness);

        // 현재 레벨에서 사용 가능한 아이템 타입 추출
        const allItemTypes = Object.keys(this.config.TYPES);
        const unlockedTypes = allItemTypes.filter(typeKey => {
            const unlockLevel = this.config.UNLOCK_LEVELS?.[typeKey] ?? 1;
            return level >= unlockLevel;
        });

        // 주변 빈 칸 탐색 (플레이어 위치부터 나선형 혹은 반경 확장식으로 8방향 우선)
        const candidates = [];
        const radius = 3; // 반경 3칸까지 탐색

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue; // 플레이어 위치 제외
                const tx = px + dx;
                const ty = py + dy;

                if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                    // 길(0)이어야 함
                    if (this.mazeGen.grid[ty][tx] === 0) {
                        // 기존 아이템과 겹치는지 체크
                        const isOccupied = this.items.some(item => {
                            const ix = Math.floor((item.group.position.x - offsetX) / thickness);
                            const iy = Math.floor((item.group.position.z - offsetZ) / thickness);
                            return ix === tx && iy === ty;
                        });

                        if (!isOccupied) {
                            candidates.push({ x: tx, y: ty, dist: dx * dx + dy * dy });
                        }
                    }
                }
            }
        }

        // 거리순으로 정렬
        candidates.sort((a, b) => a.dist - b.dist);

        // 사용 가능한 칸에 아이템 하나씩 배치
        unlockedTypes.forEach((typeKey, index) => {
            if (index < candidates.length) {
                const cell = candidates[index];
                const visualConfig = this.config.TYPES[typeKey];
                const item = new Item(typeKey, this.config, visualConfig);

                item.group.position.x = offsetX + (cell.x * thickness) + thickness / 2;
                item.group.position.z = offsetZ + (cell.y * thickness) + thickness / 2;

                this.items.push(item);
                this.itemGroup.add(item.group);
                console.log(`Cheat: Spawned ${typeKey} at [${cell.x}, ${cell.y}]`);
            }
        });
    }

    update(time) {
        this.items.forEach(item => item.update(time));
    }

    /**
     * 플레이어와의 충돌 체크
     */
    checkCollisions(playerPos, playerRadius, onCollect) {
        const collectDistance = playerRadius + 0.3; // 아이템 크기 고려한 여유 거리

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dx = item.group.position.x - playerPos.x;
            const dz = item.group.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < collectDistance) {
                this._collectItem(i, onCollect);
            }
        }
    }

    _collectItem(index, callback) {
        const item = this.items[index];
        console.log(`Collected: ${item.type}`);

        if (callback) callback(item);

        // 자원 해제 및 제거
        item.dispose();
        this.itemGroup.remove(item.group);
        this.items.splice(index, 1);
    }

    clearItems() {
        this.items.forEach(item => {
            item.dispose();
            this.itemGroup.remove(item.group);
        });
        this.items = [];
    }

    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
