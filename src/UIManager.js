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
            hammer: document.getElementById('use-hammer-btn'),
            jump: document.getElementById('use-jump-btn'),
            flashlight: document.getElementById('use-flashlight-btn'),
            minimap: document.getElementById('minimap-container'),
            map: document.getElementById('random-map-btn')
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
     * 버튼 이벤트 리스너 바인딩 (터치 대응)
     */
    bindButtons(callbacks) {
        this._setupButton(this.elements.hammer, callbacks.onHammer);
        this._setupButton(this.elements.jump, callbacks.onJump);
        this._setupButton(this.elements.flashlight, callbacks.onFlashlight);
        this._setupButton(this.elements.map, callbacks.onMap);

        const cheatBtn = document.getElementById('cheat-btn');
        this._setupButton(cheatBtn, callbacks.onCheat);
    }

    /**
     * 마우스와 터치를 모두 지원하는 버튼 바인딩 헬퍼
     */
    _setupButton(element, callback) {
        if (!element) return;

        const handleAction = (e) => {
            if (callback) callback();
        };

        // 1. 마우스 클릭 (데스크탑)
        element.addEventListener('click', (e) => {
            // 터치 이벤트가 이미 처리된 경우(일부 모바일 브라우저 중복 발생) 방지
            if (e.pointerType === 'touch') return;
            handleAction(e);
        });

        // 2. 터치 시작 (피드백용)
        element.addEventListener('touchstart', (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.add('pressed');
        }, { passive: true });

        // 3. 터치 종료 (실제 실행)
        element.addEventListener('touchend', (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.remove('pressed');
            e.preventDefault(); // 클릭 이벤트 중복 방지
            handleAction(e);
        }, { passive: false });

        // 4. 터치 취소 (버튼 밖으로 나갔을 때 등)
        element.addEventListener('touchcancel', () => {
            element.classList.remove('pressed');
        });
    }
}
