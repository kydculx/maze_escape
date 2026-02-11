/**
 * 사용자 입력을 관리하는 클래스 (키보드 + 제스처)
 */
export class InputHandler {
    constructor() {
        // [1] 키보드 입력 관리
        this.keys = new Set();
        this.justPressedKeys = new Set();

        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) this.justPressedKeys.add(e.code);
            this.keys.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // [2] 제스처(스와이프) 입력 관리
        this.touchStartPoint = { x: 0, y: 0 };
        this.swipeThreshold = 50; // 최소 스와이프 거리 (픽셀)
        this.currentSwipe = null; // 'up', 'down', 'left', 'right'
        this.ignoreCurrentTouch = false; // UI 위에서의 터치/클릭 무시용 플래그

        // 터치 이벤트
        window.addEventListener('touchstart', (e) => {
            // UI 요소 위에서의 터치는 무시
            if (this._isUIElement(e.target)) {
                this.ignoreCurrentTouch = true;
                return;
            }
            this.ignoreCurrentTouch = false;
            this.touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (this.ignoreCurrentTouch) return;
            this._handleSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }, { passive: true });

        // 마우스 드래그를 스와이프로 처리
        this.isMouseDown = false;
        window.addEventListener('mousedown', (e) => {
            // UI 요소 위에서의 클릭은 무시
            if (this._isUIElement(e.target)) {
                this.ignoreCurrentTouch = true;
                return;
            }
            this.ignoreCurrentTouch = false;
            this.isMouseDown = true;
            this.touchStartPoint = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', (e) => {
            if (this.ignoreCurrentTouch) {
                this.ignoreCurrentTouch = false;
                return;
            }
            if (this.isMouseDown) {
                this._handleSwipe(e.clientX, e.clientY);
                this.isMouseDown = false;
            }
        });
    }

    /**
     * 특정 요소가 UI 요소(HUD, 팝업 등)인지 확인
     */
    _isUIElement(target) {
        if (!target) return false;

        // UI 컨테이너 ID 목록
        const uiContainers = [
            'top-hud',
            'item-actions',
            'cheat-hud',
            'ingame-menu-popup',
            'settings-popup',
            'help-popup',
            'main-menu-screen',
            'minimap-container',
            'radar-container'
        ];

        // 타겟 본인이나 부모 중 하나라도 UI 컨테이너에 속하는지 확인
        return !!target.closest(uiContainers.map(id => `#${id}`).join(', '));
    }

    /**
     * 스와이프 방향 계산 로직
     */
    _handleSwipe(endX, endY) {
        const dx = endX - this.touchStartPoint.x;
        const dy = endY - this.touchStartPoint.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // 임계값보다 큰 이동만 처리
        if (Math.max(absX, absY) < this.swipeThreshold) return;

        if (absX > absY) {
            // 가로 스와이프
            this.currentSwipe = dx > 0 ? 'right' : 'left';
        } else {
            // 세로 스와이프
            this.currentSwipe = dy > 0 ? 'down' : 'up';
        }
    }

    isPressed(code) {
        return this.keys.has(code);
    }

    wasJustPressed(code) {
        return this.justPressedKeys.has(code);
    }

    /**
     * 감지된 스와이프 방향을 반환하고 초기화
     */
    consumeSwipe() {
        const swipe = this.currentSwipe;
        this.currentSwipe = null;
        return swipe;
    }

    /**
     * 프레임 종료 시 호출
     */
    update() {
        this.justPressedKeys.clear();
        // 스와이프는 consumeSwipe()로 소모하므로 여기서 클리어하지 않음 (단발성 보장)
    }
}
