import * as THREE from 'three';
import { InputHandler } from './src/InputHandler.js';
import { GameState, STATES } from './src/GameState.js';
import { SceneManager } from './src/SceneManager.js';
import { SoundManager } from './src/SoundManager.js';
import { CONFIG } from './src/Config.js';
import { PlayScene } from './src/scenes/PlayScene.js';

/**
 * 3D 게임 엔진 메인 클래스 - 엔트리 포인트
 */
class Game {
    constructor() {
        // 1. 핵심 모듈 초기화
        this.state = new GameState(STATES.PLAYING); // 즉시 게임 시작 상태로 변경
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
        this.sceneManager.setScene(STATES.PLAYING); // 즉시 인게임 장면 설정

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

        // 초기 UI 숨김 처리 (스플래시 및 메인메뉴)
        document.getElementById('splash-screen').classList.add('hidden');
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

        // 2. 메인 메뉴 - 각 버튼 기능 연동
        // 새 게임 (New Game)
        document.getElementById('new-game-button').addEventListener('click', () => {
            this.handleMenuSelection(STATES.PLAYING);
        });

        // 이어하기 (Continue)
        document.getElementById('continue-button').addEventListener('click', () => {
            alert('이어하기 기능을 준비 중입니다.');
        });

        // 랭킹 (Rankings)
        document.getElementById('rankings-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            alert('랭킹 시스템을 불러오고 있습니다...');
        });

        // 설정 (Settings)
        document.getElementById('settings-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            alert('설정 메뉴입니다.');
        });

        // 도움말 (Help)
        document.getElementById('help-button').addEventListener('click', () => {
            this.sound.playSFX(CONFIG.AUDIO.CLICK_SFX_URL);
            alert('도움말: 방향키(Arrow Keys)로 이동하세요!');
        });
    }

    /**
     * 공통 메뉴 선택 로직 처리
     * @param {string} targetState - 전환할 게임 상태
     */
    handleMenuSelection(targetState) {
        this.sound.playSFX(CONFIG.AUDIO.FOOTSTEP_SFX_URL);

        if (targetState === STATES.PLAYING) {
            this.state.set(STATES.PLAYING);
            this.sceneManager.setScene(STATES.PLAYING);
            this.sound.playBGM(CONFIG.AUDIO.BGM_URL, CONFIG.AUDIO.DEFAULT_BGM_VOLUME);
            document.getElementById('main-menu-screen').classList.add('hidden');
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
