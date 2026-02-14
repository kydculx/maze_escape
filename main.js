import * as THREE from 'three';
import { InputHandler } from './src/player/InputHandler.js';
import { GameState, STATES } from './src/GameState.js';
import { SceneManager } from './src/SceneManager.js';
import { SoundManager } from './src/SoundManager.js';
import { SaveManager } from './src/SaveManager.js';
import { RankingManager } from './src/RankingManager.js';
import { CONFIG } from './src/Config.js';
import { PlayScene } from './src/scenes/PlayScene.js';
import { ASSETS } from './src/Assets.js';
import { UIManager } from './src/UIManager.js';

/**
 * 3D 게임 엔진 메인 클래스 - 엔트리 포인트
 */
class Game {
    constructor() {
        // 0. 폰트 로딩 대기 (FOUT 방지)
        document.body.classList.add('fonts-loading');
        document.fonts.ready.then(() => {
            console.log('[Game] All fonts loaded');
            document.body.classList.remove('fonts-loading');
        });

        // 1. 핵심 모듈 초기화
        this.state = new GameState(STATES.SPLASH); // 스플래시 화면부터 시작
        this.input = new InputHandler();
        this.sound = new SoundManager();
        this.ranking = new RankingManager();
        this.sceneManager = new SceneManager(this);

        // 사전 로딩 시작 (비동기)
        this.sound.preloadAll(ASSETS.AUDIO);

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
                // Only play BGM if it's not already set/playing
                if (!this.sound.bgm && this.state.is(STATES.MAIN_MENU)) {
                    this.sound.playBGM(ASSETS.AUDIO.BGM);
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
        this.ui = new UIManager();
        this.initUI();

        // 스플래시 화면은 HTML에서 기본으로 표시됨
        // 메인 메뉴는 숨김 상태로 시작
        document.getElementById('main-menu-screen').classList.add('hidden');

        window.addEventListener('resize', () => this.onResize());

        // 백그라운드 전환 시 오디오 일시정지 처리
        document.addEventListener('visibilitychange', () => {
            if (this.sound) {
                this.sound.handleVisibilityChange(document.visibilityState === 'visible');
            }
        });

        // 핀치 줌 및 브라우저 확대/축소 방지
        this.preventZoom();

        // 5. 게임 루프 시작
        this.clock = new THREE.Clock();
        this.animate();

        // 6. 랭킹 시스템 로그인 (익명)
        this.ranking.signIn().then(async () => {
            console.log('[Main] Ranking system ready');
            // 로그인 후 서버의 최신 닉네임 정보를 가져와서 로컬 스토리지 및 UI와 동기화
            const profile = await this.ranking.getProfile();
            if (profile && profile.nickname) {
                console.log(`[Main] Syncing nickname from server: ${profile.nickname}`);
                SaveManager.saveSettings(null, null, null, profile.nickname);

                // UI 입력창에도 반영
                if (this.ui && this.ui.elements.nicknameInput) {
                    this.ui.elements.nicknameInput.value = profile.nickname;
                }
            }
        });
    }

    /**
     * 브라우저의 기본 확대/축소 동작(핀치 줌, 휠 줌)을 차단
     */
    preventZoom() {
        // 1. 제스처 이벤트 차단 (Safari 등)
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());

        // 2. 컨트롤/커맨드 + 휠(확대/축소) 차단
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // 3. 터치 시작 시 두 손가락 이상이면 기본 동작 차단 (보조)
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // 4. 우클릭/길게 누르기 메뉴 차단 (모바일 앱 느낌)
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
    }

    /**
     * UI 이벤트 연결 (상태 전환 트리거)
     */
    initUI() {
        const splashScreen = document.getElementById('splash-screen');

        // 1. 스플래시 화면 클릭 시 메인 메뉴로 전환 + 전체화면 요청
        splashScreen.addEventListener('click', () => {
            if (this.state.is(STATES.SPLASH)) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch((err) => {
                        console.log('Fullscreen request failed:', err);
                    });
                }

                this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
                this.state.set(STATES.MAIN_MENU);
                this.sceneManager.setScene(STATES.MAIN_MENU);
                splashScreen.classList.add('hidden');
                this.ui.showMainMenu();
            }
        });

        // 2. 공용 UI 초기화
        this.bindGeneralUI();

        // 저장된 진행 상황 확인 및 Continue 버튼 활성화
        this.updateContinueButton();

        // 3. 메인 메뉴 전용 버튼 (New Game, Continue)
        const newGameBtn = document.getElementById('new-game-button');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                SaveManager.clearProgress();
                this.handleMenuSelection(STATES.PLAYING);
            });
        }

        const continueBtn = document.getElementById('continue-button');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                if (SaveManager.hasProgress()) {
                    const progress = SaveManager.loadProgress();
                    this.handleMenuSelection(STATES.PLAYING, progress);
                }
            });
        }
    }

    bindGeneralUI() {
        // UI 서브 컴포넌트 초기화 및 내부 리스너 등록
        this.ui.initSettings(this.sound);
        this.ui.initNicknameUI(this.ranking, SaveManager);
        this.ui.initRankingUI(this.ranking);
        this.ui.initHelpUI();

        // 공용 버튼 (랭킹, 도움말 등) 콜백 연결
        this.ui.bindGeneralButtons({
            onShowRankings: () => {
                if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
                this.ui.showRankings(this.ranking);
            },
            onShowHelp: () => {
                if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
                this.ui.showHelp();
            }
        });

        // 설정 버튼 클릭 시 팝업 열기 (메인 메뉴용)
        const settingsBtn = document.getElementById('settings-button');
        if (settingsBtn) {
            this.ui._setupButton(settingsBtn, () => {
                if (this.sound) this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);
                this.ui.showSettings();
            });
        }
    }

    setNicknameStatus(msg, type) {
        const el = document.getElementById('nickname-status');
        if (!el) return;
        el.textContent = msg;
        el.className = 'status-msg ' + type;
    }

    async updateRankingUI() {
        const container = document.getElementById('ranking-list-container');
        if (!container) return;

        container.innerHTML = '<div class="ranking-loading">불러오는 중...</div>';
        const ranks = await this.ranking.getTopScores();

        if (!ranks || ranks.length === 0) {
            container.innerHTML = '<div class="ranking-empty">랭킹 정보가 없습니다.</div>';
            return;
        }

        container.innerHTML = ranks.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            return `
                <div class="ranking-item ${isTop3 ? 'top-3' : ''}">
                    <div class="rank-info">
                        <span class="rank-number">${rank}</span>
                        <span class="rank-nickname">${this._escapeHTML(item.nickname)}</span>
                    </div>
                    <span class="rank-score">${item.score} STAGE</span>
                </div>
            `;
        }).join('');
    }

    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
        this.sound.playSFX(ASSETS.AUDIO.SFX.CLICK);

        if (targetState === STATES.PLAYING) {
            this.state.set(STATES.PLAYING);
            this.sceneManager.setScene(STATES.PLAYING, progress); // progress 전달
            this.sound.playBGM(ASSETS.AUDIO.BGM);
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

            const menuBtn = document.getElementById('menu-btn');
            if (menuBtn) {
                menuBtn.style.display = 'flex';
                console.log('[Game] menu-btn display set to flex');
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
            const baseFov = CONFIG.PLAYER.CAMERA.FOV;
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
