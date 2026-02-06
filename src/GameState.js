/**
 * 게임의 가능한 모든 상태를 정의하는 상수
 */
export const STATES = {
    SPLASH: 'SPLASH',
    MAIN_MENU: 'MAIN_MENU',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

/**
 * 게임 상태를 관리하는 클래스
 */
export class GameState {
    constructor(initialState = STATES.INTRO) {
        this.current = initialState;
    }

    /**
     * 상태를 변경하고 필요한 경우 추가 로직을 실행
     * @param {string} newState - STATES 중 하나
     */
    set(newState) {
        if (STATES[newState]) {
            console.log(`State changed: ${this.current} -> ${newState}`);
            this.current = newState;
        } else {
            console.warn(`Invalid state attempt: ${newState}`);
        }
    }

    /**
     * 현재 상태가 특정 상태와 일치하는지 확인
     * @param {string} state - 확인할 상태
     * @returns {boolean}
     */
    is(state) {
        return this.current === state;
    }
}
