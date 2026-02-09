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
                    emptyCells.push({ x, y });
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

        for (let i = 0; i < spawnCount; i++) {
            const cell = emptyCells[i];
            const typeKey = unlockedItemTypes[Math.floor(Math.random() * unlockedItemTypes.length)];
            const visualConfig = this.config.TYPES[typeKey];

            const item = new Item(typeKey, this.config, visualConfig);

            // 월드 좌표로 변환
            item.group.position.x = offsetX + (cell.x * thickness) + thickness / 2;
            item.group.position.z = offsetZ + (cell.y * thickness) + thickness / 2;

            this.items.push(item);
            this.itemGroup.add(item.group);
        }

        console.log(`${spawnCount} items spawned.`);
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
