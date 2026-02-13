/**
 * SaveManager - 게임 설정 및 진행 상황을 localStorage에 저장/로드
 */

const STORAGE_KEYS = {
    SETTINGS: 'maze_game_settings',
    PROGRESS: 'maze_game_progress'
};

export class SaveManager {
    /**
     * 설정 저장 (BGM, SFX 볼륨)
     * @param {number} bgmVolume - BGM 볼륨 (0~1)
     * @param {number} sfxVolume - SFX 볼륨 (0~1)
     */
    static saveSettings(bgmVolume, sfxVolume, weatherVolume) {
        try {
            const settings = {
                bgmVolume: bgmVolume,
                sfxVolume: sfxVolume,
                weatherVolume: weatherVolume
            };
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            console.log('[SaveManager] Settings saved to localStorage:', settings);
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * 설정 로드
     * @returns {{bgmVolume: number, sfxVolume: number}} 저장된 설정 또는 기본값
     */
    static loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            console.log('[SaveManager] Raw data from localStorage:', saved);
            if (saved) {
                const parsed = JSON.parse(saved);
                console.log('[SaveManager] Loaded settings:', parsed);
                return parsed;
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }

        // 기본값 반환
        console.log('[SaveManager] No saved settings found, using defaults');
        return {
            bgmVolume: 1.0,
            sfxVolume: 1.0,
            weatherVolume: 1.0
        };
    }

    /**
     * 게임 진행 상황 저장 (최고 스테이지와 아이템)
     * @param {number} stage - 현재 스테이지
     * @param {Object} items - 아이템 개수 객체
     */
    static saveProgress(stage, items) {
        try {
            const currentProgress = this.loadProgress();

            // 스테이지가 높아지면 최고 스테이지 갱신, 아이템은 항상 현재 상태로 저장
            const progress = {
                highestStage: Math.max(stage, currentProgress.highestStage),
                items: { ...items } // 아이템 복사
            };
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
            console.log('Progress saved:', progress);
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    }

    /**
     * 게임 진행 상황 로드
     * @returns {{highestStage: number, items: Object}} 저장된 진행 상황 또는 기본값
     */
    static loadProgress() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load progress:', error);
        }

        // 기본값 반환
        return {
            highestStage: 1,
            items: {
                flashlight: 0,
                sensor: 0,
                battery: 0,
                speedBoost: 0,
                wallHack: 0,
                teleport: 0,
                zombieDisguise: 0,
                trap: 0
            }
        };
    }

    /**
     * 저장된 진행 상황이 있는지 확인
     * @returns {boolean} 진행 상황 존재 여부
     */
    static hasProgress() {
        const progress = this.loadProgress();
        return progress.highestStage > 1;
    }

    /**
     * 게임 진행 상황 초기화 (새로하기)
     */
    static clearProgress() {
        try {
            localStorage.removeItem(STORAGE_KEYS.PROGRESS);
            console.log('Progress cleared');
        } catch (error) {
            console.warn('Failed to clear progress:', error);
        }
    }

    /**
     * 모든 저장 데이터 초기화 (디버그용)
     */
    static clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            localStorage.removeItem(STORAGE_KEYS.PROGRESS);
            console.log('All save data cleared');
        } catch (error) {
            console.warn('Failed to clear all data:', error);
        }
    }

    /**
     * 현재 저장된 모든 데이터 출력 (디버그용)
     */
    static debugPrint() {
        console.log('=== SaveManager Debug Info ===');
        console.log('Settings:', this.loadSettings());
        console.log('Progress:', this.loadProgress());
        console.log('Has Progress:', this.hasProgress());
        console.log('Raw localStorage:');
        console.log('  - maze_game_settings:', localStorage.getItem(STORAGE_KEYS.SETTINGS));
        console.log('  - maze_game_progress:', localStorage.getItem(STORAGE_KEYS.PROGRESS));
        console.log('==============================');
    }
}

// 전역에서 디버깅 가능하도록 window에 추가
if (typeof window !== 'undefined') {
    window.SaveManager = SaveManager;
}
