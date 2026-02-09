import { STATES } from './GameState.js';
import { SplashScene } from './scenes/SplashScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { PlayScene } from './scenes/PlayScene.js';

/**
 * 장면 관리 클래스
 */
export class SceneManager {
    constructor(game) {
        this.game = game;
        this.currentScene = null;

        this.scenes = {
            [STATES.SPLASH]: SplashScene,
            [STATES.MAIN_MENU]: MainMenuScene,
            [STATES.PLAYING]: PlayScene
        };
    }

    /**
     * 상태에 따라 장면 교체
     * @param {string} state - 갱신할 상태
     */
    setScene(state) {
        console.log(`[SceneManager] Setting scene to: ${state}`);

        if (this.currentScene) {
            console.log(`[SceneManager] Disposing previous scene`);
            this.currentScene.dispose();
        }

        const SceneClass = this.scenes[state];
        if (SceneClass) {
            console.log(`[SceneManager] Creating new scene: ${SceneClass.name}`);
            this.currentScene = new SceneClass(this.game);
        } else {
            console.error(`[SceneManager] No scene found for state: ${state}`);
        }
    }

    /**
     * 현재 장면 업데이트
     */
    update(deltaTime) {
        if (this.currentScene) {
            this.currentScene.update(deltaTime);
        }
    }

    /**
     * 현재 Three.js 씬 반환
     */
    getThreeScene() {
        return this.currentScene ? this.currentScene.getThreeScene() : null;
    }

    /**
     * 현재 카메라 반환
     */
    getCamera() {
        return this.currentScene ? this.currentScene.getCamera() : null;
    }
}
