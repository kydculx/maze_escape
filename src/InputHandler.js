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

        // 터치 이벤트
        window.addEventListener('touchstart', (e) => {
            this.touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            this._handleSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }, { passive: true });

        // 마우스 드래그를 스와이프로 처리
        this.isMouseDown = false;
        window.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.touchStartPoint = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isMouseDown) {
                this._handleSwipe(e.clientX, e.clientY);
                this.isMouseDown = false;
            }
        });
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
