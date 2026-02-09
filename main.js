import * as THREE from 'three';
import { InputHandler } from './src/InputHandler.js';
import { GameState, STATES } from './src/GameState.js';
import { SceneManager } from './src/SceneManager.js';
import { SoundManager } from './src/SoundManager.js';
import { SaveManager } from './src/SaveManager.js';
import { CONFIG } from './src/Config.js';
import { PlayScene } from './src/scenes/PlayScene.js';

/**
 * 3D 게임 엔진 메인 클래스 - 엔트리 포인트
 */
class Game {
    constructor() {
        // 1. 핵심 모듈 초기화
        this.state = new GameState(STATES.SPLASH); // 스플래시 화면부터 시작
        this.input = new InputHandler();
        this.sound = new SoundManager();
        this.sceneManager = new SceneManager(this);

        // 2. 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 그림자 맵 활성화
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 3. 초기 장면 설정
        this.sceneManager.setScene(STATES.SPLASH); // 스플래시 화면부터 시작

        // 브라우저 정책상 사용자 상호작용 후 재생 가능하므로 이벤트 리스너 등록
        const initAudio = () => {
            if (this.sound) {
                this.sound.init(); // 오디오 잠금 해제 알림
                if (!this.sound.bgm) {
                    this.sound.playBGM(CONFIG.AUDIO.BGM_URL, CONFIG.AUDIO.DEFAULT_BGM_VOLUME);
                }
            }
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
            window.removeEventListener('touchstart', initAudio);
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
        window.addEventListener('touchstart', initAudio);

        // 4. UI 및 이벤트 등록
        this.initUI();

        // 스플래시 화면은 HTML에서 기본으로 표시됨
        // 메인 메뉴는 숨김 상태로 시작
        document.getElementById('main-menu-screen').classList.add('hidden');

        window.addEventListener('resize', () => this.onResize());

        // 5. 게임 루프 시작
        this.clock = new THREE.Clock();
        this.animate();
    }

    /**
     * UI 이벤트 연결 (상태 전환 트리거)
     */
    initUI() {
        const splashScreen = document.getElementById('splash-screen');
        const mainMenuScreen = document.getElementById('main-menu-screen');

        // 1. 스플래시 화면 클릭 시 메인 메뉴로 전환
        splashScreen.addEventListener('click', () => {
            if (this.state.is(STATES.SPLASH)) {
                this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
                this.state.set(STATES.MAIN_MENU);
                this.sceneManager.setScene(STATES.MAIN_MENU);
                splashScreen.classList.add('hidden');
                mainMenuScreen.classList.remove('hidden');
            }
        });

        // 저장된 진행 상황 확인 및 Continue 버튼 활성화
        this.updateContinueButton();

        // 2. 메인 메뉴 - 각 버튼 기능 연동
        // 새 게임 (New Game)
        document.getElementById('new-game-button').addEventListener('click', () => {
            // 진행 상황 초기화
            SaveManager.clearProgress();
            this.handleMenuSelection(STATES.PLAYING);
        });

        // 이어하기 (Continue)
        document.getElementById('continue-button').addEventListener('click', () => {
            if (SaveManager.hasProgress()) {
                const progress = SaveManager.loadProgress();
                // 저장된 스테이지와 아이템으로 게임 시작
                this.handleMenuSelection(STATES.PLAYING, progress);
            }
        });

        // 랭킹 (Rankings)
        document.getElementById('rankings-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            alert('랭킹 시스템을 불러오고 있습니다...');
        });

        // 설정 (Settings)
        const settingsPopup = document.getElementById('settings-popup');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        const settingsOkBtn = document.getElementById('settings-ok-btn');
        const bgmSlider = document.getElementById('bgm-volume-slider');
        const sfxSlider = document.getElementById('sfx-volume-slider');
        const bgmVal = document.getElementById('bgm-volume-val');
        const sfxVal = document.getElementById('sfx-volume-val');

        // 설정 버튼 클릭 시 팝업 열기
        document.getElementById('settings-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            if (settingsPopup) {
                // 현재 볼륨 값으로 슬라이더 초기화
                const currentBGM = Math.round(this.sound.bgmVolume * 100);
                const currentSFX = Math.round(this.sound.sfxVolume * 100);

                bgmSlider.value = currentBGM;
                bgmVal.textContent = `${currentBGM}%`;
                sfxSlider.value = currentSFX;
                sfxVal.textContent = `${currentSFX}%`;

                console.log('[Main] Opening settings - BGM:', currentBGM, '% SFX:', currentSFX, '%');

                settingsPopup.classList.remove('hidden');
                settingsPopup.style.display = 'flex';
            }
        });

        // 볼륨 슬라이더 이벤트
        if (bgmSlider) {
            bgmSlider.addEventListener('input', () => {
                const val = bgmSlider.value;
                bgmVal.textContent = `${val}%`;
                this.sound.setBGMVolume(val / 100);
            });
        }

        if (sfxSlider) {
            sfxSlider.addEventListener('input', () => {
                const val = sfxSlider.value;
                sfxVal.textContent = `${val}%`;
                this.sound.setSFXVolume(val / 100);
            });
        }

        // 설정 팝업 닫기 버튼들
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
                if (settingsPopup) {
                    settingsPopup.classList.add('hidden');
                    settingsPopup.style.display = 'none';
                }
            });
        }

        if (settingsOkBtn) {
            settingsOkBtn.addEventListener('click', () => {
                this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
                if (settingsPopup) {
                    settingsPopup.classList.add('hidden');
                    settingsPopup.style.display = 'none';
                }
            });
        }

        // 도움말 (Help)
        const helpPopup = document.getElementById('help-popup');
        const closeHelpBtn = document.getElementById('close-help-btn');

        document.getElementById('help-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            helpPopup.classList.remove('hidden');
        });

        closeHelpBtn.addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            helpPopup.classList.add('hidden');
        });

        // ESC 키로 팝업 닫기
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !helpPopup.classList.contains('hidden')) {
                helpPopup.classList.add('hidden');
                this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            }
        });
    }

    /**
     * Continue 버튼 활성화/비활성화
     */
    updateContinueButton() {
        const continueBtn = document.getElementById('continue-button');
        if (SaveManager.hasProgress()) {
            continueBtn.classList.remove('disabled');
            continueBtn.disabled = false;
        } else {
            continueBtn.classList.add('disabled');
            continueBtn.disabled = true;
        }
    }

    /**
     * 공통 메뉴 선택 로직 처리
     * @param {string} targetState - 전환할 게임 상태
     * @param {Object} progress - 저장된 게임 진행 상황 (선택적)
     */
    handleMenuSelection(targetState, progress = null) {
        this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);

        if (targetState === STATES.PLAYING) {
            this.state.set(STATES.PLAYING);
            this.sceneManager.setScene(STATES.PLAYING, progress); // progress 전달
            this.sound.playBGM(CONFIG.AUDIO.BGM_URL, CONFIG.AUDIO.DEFAULT_BGM_VOLUME);
            document.getElementById('main-menu-screen').classList.add('hidden');

            // 게임 HUD 표시
            const uiOverlay = document.getElementById('ui-overlay');
            const itemActions = document.getElementById('item-actions');
            const cheatHud = document.getElementById('cheat-hud');

            console.log('[Game] Showing UI elements');
            console.log('[Game] ui-overlay:', uiOverlay);
            console.log('[Game] item-actions:', itemActions);
            console.log('[Game] cheat-hud:', cheatHud);

            if (uiOverlay) uiOverlay.style.display = 'block';
            if (itemActions) {
                itemActions.style.display = 'flex';
                console.log('[Game] item-actions display set to flex');
            } else {
                console.error('[Game] item-actions element not found!');
            }
            if (cheatHud) {
                cheatHud.style.display = 'block';
                console.log('[Game] cheat-hud display set to block');
            } else {
                console.error('[Game] cheat-hud element not found!');
            }

            // 실제 버튼들의 기능 연동은 PlayScene 내의 UIManager가 담당하도록 위임
            // (PlayScene.js에서 this.ui.initSettings(this.game.sound) 호출)
        }
    }

    /**
     * 창 크기 변경 시 현재 장면의 카메라 및 렌더러 업데이트
     */
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        const camera = this.sceneManager.getCamera();
        if (camera) {
            camera.aspect = aspect;

            // 반응형 FOV (가로 모드 보정)
            const baseFov = CONFIG.CAMERA.FOV;
            if (aspect > 1) {
                const rad = (baseFov * Math.PI) / 180;
                camera.fov = (2 * Math.atan(Math.tan(rad / 2) / aspect) * 180) / Math.PI;
            } else {
                camera.fov = baseFov;
            }

            camera.updateProjectionMatrix();
        }
        this.renderer.setSize(width, height);
    }



    /**
     * 메인 애니메이션 루프
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        // 1. 현재 활성화된 장면 업데이트
        const deltaTime = this.clock.getDelta();
        this.sceneManager.update(deltaTime);

        // 2. 렌더링 (현재 장면의 씬과 카메라 사용)
        const scene = this.sceneManager.getThreeScene();
        const camera = this.sceneManager.getCamera();

        if (scene && camera) {
            this.renderer.render(scene, camera);
        }

        // 3. 입력 상태 업데이트 (wasJustPressed 초기화 등)
        this.input.update();
    }
}

// 게임 기동
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
