import { CONFIG } from './Config.js';

/**
 * 게임 내 UI(HUD, 버튼 등)를 관리하는 클래스
 */
export class UIManager {
    constructor(player, mazeGen, stageManager) {
        this.player = player;
        this.mazeGen = mazeGen;
        this.stageManager = stageManager;

        // UI 요소 캐싱
        this.elements = {
            stage: document.querySelector('#hud-stage .count'),
            pos: document.getElementById('grid-pos-display'),
            hammer: document.getElementById('use-hammer-btn'),
            jump: document.getElementById('use-jump-btn'),
            flashlight: document.getElementById('use-flashlight-btn'),
            minimap: document.getElementById('minimap-container')
        };
    }

    /**
     * 전체 UI 동기화
     */
    updateAll() {
        this.updateHUD();
        this.updateItemButtons();
    }

    /**
     * 상단 정보 및 좌표 표시 갱신
     */
    updateHUD() {
        // 1. 스테이지 표시
        if (this.elements.stage) this.elements.stage.textContent = this.stageManager.level;

        // 2. 좌표 표시
        if (this.elements.pos && this.player) {
            const thickness = CONFIG.MAZE.WALL_THICKNESS;
            const offsetX = -(this.mazeGen.width * thickness) / 2;
            const offsetZ = -(this.mazeGen.height * thickness) / 2;

            const px = Math.round((this.player.group.position.x - offsetX - thickness / 2) / thickness);
            const py = Math.round((this.player.group.position.z - offsetZ - thickness / 2) / thickness);

            this.elements.pos.textContent = `Pos: ${px}, ${py} (${this.mazeGen.width}x${this.mazeGen.height})`;
        }

        // 3. 손전등 배터리 프로그레스
        if (this.elements.flashlight) {
            const circle = this.elements.flashlight.querySelector('.progress-ring__circle');
            if (circle && this.player) {
                const radius = 26;
                const circumference = 2 * Math.PI * radius;
                const progress = this.player.flashlightTimer / CONFIG.ITEMS.FLASHLIGHT.DURATION;
                const offset = circumference - progress * circumference;
                circle.style.strokeDashoffset = offset;

                circle.style.stroke = (this.player.flashlightTimer < CONFIG.ITEMS.FLASHLIGHT.FLICKER_THRESHOLD)
                    ? "#ff4444" : "#00ffff";
            }
        }

        // 4. 미니맵 가시성
        if (this.elements.minimap) {
            this.elements.minimap.style.display = this.player.inventory.hasMap ? 'block' : 'none';
        }
    }

    /**
     * 아이템 버튼 활성/비활성 상태 갱신
     */
    updateItemButtons() {
        if (!this.player) return;

        // 망치
        if (this.elements.hammer) {
            const count = this.player.inventory.hammerCount;
            this.elements.hammer.querySelector('.count').textContent = count;
            this.elements.hammer.classList.toggle('locked', count <= 0);
        }

        // 점프
        if (this.elements.jump) {
            const count = this.player.inventory.jumpCount;
            this.elements.jump.querySelector('.count').textContent = count;
            this.elements.jump.classList.toggle('locked', count <= 0);
        }

        // 손전등
        if (this.elements.flashlight) {
            const canUse = this.player.inventory.hasFlashlight && this.player.flashlightTimer > 0;
            this.elements.flashlight.classList.toggle('locked', !canUse);
            this.elements.flashlight.classList.toggle('active', this.player.isFlashlightOn);
        }
    }

    /**
     * 버튼 이벤트 리스너 바인딩
     */
    bindButtons(callbacks) {
        if (this.elements.hammer) {
            this.elements.hammer.onclick = (e) => {
                e.stopPropagation();
                if (callbacks.onHammer) callbacks.onHammer();
            };
        }
        if (this.elements.jump) {
            this.elements.jump.onclick = (e) => {
                e.stopPropagation();
                if (callbacks.onJump) callbacks.onJump();
            };
        }
        if (this.elements.flashlight) {
            this.elements.flashlight.onclick = (e) => {
                e.stopPropagation();
                if (callbacks.onFlashlight) callbacks.onFlashlight();
            };
        }

        const cheatBtn = document.getElementById('cheat-btn');
        if (cheatBtn && callbacks.onCheat) {
            cheatBtn.onclick = () => callbacks.onCheat();
        }
    }
}
