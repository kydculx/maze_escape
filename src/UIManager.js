import { CONFIG } from './Config.js';
import { ASSETS } from './Assets.js';

/**
 * 게임 내 UI(HUD, 버튼 등)를 관리하는 클래스
 */
export class UIManager {
    constructor(player = null, mazeGen = null, stageManager = null) {
        this.player = player;
        this.mazeGen = mazeGen;
        this.stageManager = stageManager;

        // UI 요소 캐싱
        this.elements = {
            stage: document.querySelector('#hud-stage .count'),
            jump: document.getElementById('use-jump-btn'),
            flashlight: document.getElementById('use-flashlight-btn'),
            minimap: document.getElementById('minimap-container'),
            map: document.getElementById('random-map-btn'),
            trap: document.getElementById('use-trap-btn'),
            c4: document.getElementById('use-c4-btn'),
            teleport: document.getElementById('use-teleport-btn'),
            disguise: document.getElementById('use-disguise-btn'),
            sensor: document.getElementById('use-sensor-btn'),
            fullscreen: document.getElementById('fullscreen-btn'),
            prevStage: document.getElementById('prev-stage-btn'),
            nextStage: document.getElementById('next-stage-btn'),
            // Menu elements
            menuBtn: document.getElementById('menu-btn'),
            menuPopup: document.getElementById('ingame-menu-popup'),
            resumeBtn: document.getElementById('close-menu-btn'),
            restartBtn: document.getElementById('restart-btn'),
            mainMenuBtn: document.getElementById('main-menu-btn'),
            ingameSettingsBtn: document.getElementById('ingame-settings-btn'),
            disguiseOverlay: document.getElementById('disguise-overlay'),
            // Settings elements
            settingsPopup: document.getElementById('settings-popup'),
            closeSettingsBtn: document.getElementById('close-settings-btn'),
            settingsOkBtn: document.getElementById('settings-ok-btn'),
            bgmSlider: document.getElementById('bgm-volume-slider'),
            sfxSlider: document.getElementById('sfx-volume-slider'),
            weatherSlider: document.getElementById('weather-volume-slider'),
            bgmVal: document.getElementById('bgm-volume-val'),
            sfxVal: document.getElementById('sfx-volume-val'),
            weatherVal: document.getElementById('weather-volume-val'),
            itemActions: document.getElementById('item-actions'),
            bittenOverlay: document.getElementById('bitten-overlay'),
            healthContainer: document.getElementById('health-bar-container'),
            healthFill: document.getElementById('health-fill'),
            // Death screen elements
            deathScreen: document.getElementById('death-screen'),
            deathRestartBtn: document.getElementById('death-restart-btn'),
            deathMainMenuBtn: document.getElementById('death-main-menu-btn'),
            // Help elements
            helpPopup: document.getElementById('help-popup'),
            closeHelpBtn: document.getElementById('close-help-btn'),
            // Ranking elements
            rankingsBtn: document.getElementById('rankings-button'),
            rankingPopup: document.getElementById('rankings-popup'),
            rankingList: document.getElementById('ranking-list-container'),
            myRankingContainer: document.getElementById('my-ranking-container'),
            closeRankingBtn: document.getElementById('close-rankings-btn'),
            // Nickname elements
            nicknameInput: document.getElementById('nickname-input'),
            nicknameSaveBtn: document.getElementById('save-nickname-btn'),
            nicknameStatus: document.getElementById('nickname-status'),
            // Main menu help
            helpBtn: document.getElementById('help-button')
        };

        this._cleanupFns = [];
        this._lastItemOrder = ""; // Optimization: only reorder on change
    }

    /**
     * 플레이어 및 매니저 참조 설정 (게임 시작 시)
     */
    setPlayer(player) { this.player = player; }
    setMazeGen(mazeGen) { this.mazeGen = mazeGen; }
    setStageManager(sm) { this.stageManager = sm; }

    /**
     * 시간을 MM:SS 형식으로 변환
     */
    _formatTime(seconds) {
        if (!seconds && seconds !== 0) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 메인 메뉴 UI 표시
     */
    showMainMenu() {
        this.showInGameHUD(false);
        const mainMenu = document.getElementById('main-menu-screen');
        if (mainMenu) {
            mainMenu.classList.remove('hidden');
            mainMenu.style.display = 'flex';
        }
        // 인게임 메뉴나 사망 화면 숨김
        if (this.elements.menuPopup) this.elements.menuPopup.classList.add('hidden');
        if (this.elements.deathScreen) this.elements.deathScreen.classList.add('hidden');
    }

    /**
     * 메인 메뉴 UI 숨김
     */
    hideMainMenu() {
        const mainMenu = document.getElementById('main-menu-screen');
        if (mainMenu) {
            mainMenu.classList.add('hidden');
            mainMenu.style.display = 'none';
        }
    }

    /**
     * 전체 UI 동기화
     */
    updateAll(force = false) {
        this.updateHUD();
        this.updateItemButtons(force);
        this.updateHealthBar();
    }

    /**
     * 상단 정보 및 좌표 표시 갱신
     */
    updateHUD() {
        if (this.elements.stage) this.elements.stage.textContent = this.stageManager.level;

        if (this.elements.prevStage) {
            this.elements.prevStage.disabled = this.stageManager.level <= 1;
        }

        // 손전등 배터리 바 업데이트
        this._updateBatteryBar(
            this.player.inventory.hasFlashlight,
            this.player.isFlashlightOn,
            this.player.flashlightTimer,
            CONFIG.ITEMS.FLASHLIGHT.DURATION,
            'use-flashlight-btn'
        );

        // 사운드 센서 배터리 바 업데이트
        this._updateBatteryBar(
            this.player.inventory.hasSensor,
            this.player.isSensorOn,
            this.player.sensorTimer,
            CONFIG.ITEMS.SENSOR.DURATION,
            'use-sensor-btn'
        );

        // 스테이지 시간 및 이동 수 표시
        const timeEl = document.getElementById('stat-time');
        const movesEl = document.getElementById('stat-moves');

        if (timeEl) {
            const totalSeconds = Math.floor(this.stageManager.stageTime);
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            timeEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        if (movesEl) {
            movesEl.textContent = this.stageManager.moveCount;
        }

        if (this.elements.minimap) {
            this.elements.minimap.style.display = 'flex';
        }

        if (this.elements.disguiseOverlay) {
            this.elements.disguiseOverlay.classList.toggle('active', this.player.isDisguised);
        }
    }

    /**
     * 인게임 메뉴 토글
     */
    toggleMenu() {
        if (!this.elements.menuPopup) return;

        const isVisible = !this.elements.menuPopup.classList.contains('hidden');
        if (isVisible) {
            this.hideMenu();
        } else {
            this.showMenu();
        }
    }

    showMenu() {
        if (this.elements.menuPopup) {
            this.elements.menuPopup.classList.remove('hidden');
            this.elements.menuPopup.style.display = 'flex';
            if (this.onPause) this.onPause();
        }
    }

    hideMenu() {
        if (this.elements.menuPopup) {
            this.elements.menuPopup.classList.add('hidden');
            this.elements.menuPopup.style.display = 'none';
            if (this.onResume) this.onResume();
        }
    }

    /**
     * 인게임 HUD 표시/숨김
     */
    showInGameHUD(visible) {
        const hudElements = [
            'top-hud', 'item-actions', 'health-bar-container', 'radar-container', 'minimap-container'
        ];
        hudElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (visible) {
                    el.classList.remove('hidden');
                    // item-actions는 flex, 나머지는 block 혹은 기본값
                    if (id === 'item-actions') el.style.display = 'flex';
                    else el.style.display = 'block';
                } else {
                    el.classList.add('hidden');
                    el.style.display = 'none';
                }
            }
        });
    }

    /**
     * 사망 화면 표시
     */
    showDeathScreen() {
        if (this.elements.deathScreen) {
            this.elements.deathScreen.classList.remove('hidden');
            this.elements.deathScreen.style.display = 'flex';
            if (this.onPause) this.onPause();
        }
    }

    /**
     * 사망 화면 숨김
     */
    hideDeathScreen() {
        if (this.elements.deathScreen) {
            this.elements.deathScreen.classList.add('hidden');
            this.elements.deathScreen.style.display = 'none';
        }
    }

    /**
     * 일시정지/재개 콜백 등록
     */
    registerPauseCallbacks(onPause, onResume) {
        this.onPause = onPause;
        this.onResume = onResume;
    }

    /**
     * 설정 메뉴 초기화
     */
    initSettings(soundManager) {
        if (!this.elements.settingsPopup) return;

        // 현재 볼륨 값으로 슬라이더 초기화
        const currentBGM = Math.round(soundManager.bgmVolume * 100);
        const currentSFX = Math.round(soundManager.sfxVolume * 100);
        const currentWeather = Math.round(soundManager.weatherVolume * 100);

        this.elements.bgmSlider.value = currentBGM;
        this.elements.bgmVal.textContent = `${currentBGM}%`;
        this.elements.sfxSlider.value = currentSFX;
        this.elements.sfxVal.textContent = `${currentSFX}%`;
        this.elements.weatherSlider.value = currentWeather;
        this.elements.weatherVal.textContent = `${currentWeather}%`;

        const updateBGM = () => {
            const val = this.elements.bgmSlider.value;
            this.elements.bgmVal.textContent = `${val}%`;
            soundManager.setBGMVolume(val / 100);
        };

        const updateSFX = () => {
            const val = this.elements.sfxSlider.value;
            this.elements.sfxVal.textContent = `${val}%`;
            soundManager.setSFXVolume(val / 100);
        };

        const updateWeather = () => {
            const val = this.elements.weatherSlider.value;
            this.elements.weatherVal.textContent = `${val}%`;
            soundManager.setWeatherVolume(val / 100);
        };

        this.elements.bgmSlider.addEventListener('input', updateBGM);
        this.elements.sfxSlider.addEventListener('input', updateSFX);
        this.elements.weatherSlider.addEventListener('input', updateWeather);

        this._setupButton(this.elements.closeSettingsBtn, () => this.hideSettings());
        this._setupButton(this.elements.settingsOkBtn, () => {
            soundManager.playSFX(ASSETS.AUDIO.SFX.CLICK);
            this.hideSettings();
        });
    }

    showSettings() {
        if (this.elements.settingsPopup) {
            this.elements.settingsPopup.classList.remove('hidden');
            this.elements.settingsPopup.style.display = 'flex';
        }
    }

    hideSettings() {
        if (this.elements.settingsPopup) {
            this.elements.settingsPopup.classList.add('hidden');
            this.elements.settingsPopup.style.display = 'none';
        }
    }

    /**
     * 아이템 버튼 활성/비활성 상태 갱신
     */
    updateItemButtons(force = false) {
        if (!this.player) return;

        if (this.elements.itemActions && this.elements.itemActions.style.display === 'none') {
            this.elements.itemActions.style.display = 'flex';
        }

        const typeToElement = {
            'C4': this.elements.c4,
            'JUMP': this.elements.jump,
            'FLASHLIGHT': this.elements.flashlight,
            'TRAP': this.elements.trap,
            'TELEPORT': this.elements.teleport,
            'ZOMBIE_DISGUISE': this.elements.disguise,
            'SENSOR': this.elements.sensor,
            'MAP_PIECE': this.elements.map
        };

        const itemOrder = this.player.inventory.itemOrder || [];
        const orderKey = itemOrder.join(',');

        if (force || this._lastItemOrder !== orderKey) {
            itemOrder.forEach(type => {
                const el = typeToElement[type];
                if (el) {
                    this.elements.itemActions.appendChild(el);
                    el.classList.remove('hidden');
                }
            });

            Object.keys(typeToElement).forEach(type => {
                if (!itemOrder.includes(type)) {
                    const el = typeToElement[type];
                    if (el) el.classList.add('hidden');
                }
            });

            this._lastItemOrder = orderKey;
        }

        // 각 아이템 상태 세부 업데이트
        if (this.elements.jump) {
            const count = this.player.inventory.jumpCount;
            const countEl = this.elements.jump.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.jump.classList.toggle('locked', count <= 0);
        }

        if (this.elements.flashlight) {
            const canUse = this.player.inventory.hasFlashlight && this.player.flashlightTimer > 0;
            this.elements.flashlight.classList.toggle('locked', !canUse);
            this.elements.flashlight.classList.toggle('active', this.player.isFlashlightOn);
        }

        if (this.elements.trap) {
            const count = this.player.inventory.trapCount;
            const countEl = this.elements.trap.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.trap.classList.toggle('locked', count <= 0);
        }

        if (this.elements.teleport) {
            const count = this.player.inventory.teleportCount;
            const countEl = this.elements.teleport.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.teleport.classList.toggle('locked', count <= 0);
        }

        if (this.elements.disguise) {
            const count = this.player.inventory.disguiseCount;
            const countEl = this.elements.disguise.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            const isUsing = this.player.isDisguised;
            this.elements.disguise.classList.toggle('active', isUsing);
            this.elements.disguise.classList.toggle('locked', count <= 0 && !isUsing);
        }

        if (this.elements.sensor) {
            const sensorCfg = CONFIG.ITEMS.SENSOR;
            const progress = (this.player.sensorTimer / sensorCfg.DURATION) * 100;
            const fill = this.elements.sensor.querySelector('.battery-bar-fill');
            if (fill) fill.style.height = `${progress}%`;
            this.elements.sensor.classList.toggle('active', this.player.isSensorOn);
            this.elements.sensor.classList.toggle('locked', this.player.sensorTimer <= 0);
        }

        if (this.elements.c4) {
            const count = this.player.inventory.c4Count;
            const countEl = this.elements.c4.querySelector('.count');
            if (countEl) countEl.textContent = count.toString().padStart(2, '0');
            this.elements.c4.classList.toggle('locked', count <= 0);
        }
    }

    /**
     * 버튼 이벤트 리스너 바인딩
     */
    /**
     * 메인 메뉴 및 공용 버튼 이벤트 바인딩
     */
    bindGeneralButtons(callbacks) {
        this._setupButton(this.elements.rankingsBtn, callbacks.onShowRankings);
        this._setupButton(this.elements.helpBtn, callbacks.onShowHelp);
        this._setupButton(this.elements.ingameSettingsBtn, () => this.showSettings());

        // 공통 내부 팝업 제어 버튼 바인딩
        this._bindInternalPopupControls();

        this._setupButton(this.elements.closeRankingBtn, () => {
            if (this.elements.rankingPopup) {
                this.elements.rankingPopup.classList.add('hidden');
                this.elements.rankingPopup.style.display = 'none';
            }
        });
        this._setupButton(this.elements.closeHelpBtn, () => {
            if (this.elements.helpPopup) {
                this.elements.helpPopup.classList.add('hidden');
                this.elements.helpPopup.style.display = 'none';
            }
        });
    }

    /**
     * 게임 플레이 관련 버튼 이벤트 바인딩
     */
    bindGameButtons(callbacks) {
        // 기존 바인딩 해제 (중복 방지)
        this.unbindButtons();

        this._setupButton(this.elements.jump, callbacks.onJump);
        this._setupButton(this.elements.flashlight, callbacks.onFlashlight);
        this._setupButton(this.elements.map, callbacks.onMap);
        this._setupButton(this.elements.trap, callbacks.onTrap);
        this._setupButton(this.elements.teleport, callbacks.onTeleport);
        this._setupButton(this.elements.disguise, callbacks.onDisguise);
        this._setupButton(this.elements.sensor, callbacks.onSensor);
        this._setupButton(this.elements.c4, callbacks.onC4);

        const cheatBtn = document.getElementById('cheat-btn');
        this._setupButton(cheatBtn, callbacks.onCheat);

        this._setupButton(this.elements.prevStage, callbacks.onPrevStage);
        this._setupButton(this.elements.nextStage, callbacks.onNextStage);
        this._setupButton(this.elements.ingameSettingsBtn, callbacks.onSettings);

        // 공통 내부 팝업 제어 버튼 재바인딩 (unbindButtons 이후 필수)
        this._bindInternalPopupControls();

        this._setupButton(this.elements.restartBtn, () => {
            this.hideMenu();
            if (callbacks.onRestart) callbacks.onRestart();
        });

        this._setupButton(this.elements.mainMenuBtn, () => {
            if (this.elements.menuPopup) this.elements.menuPopup.classList.add('hidden');
            if (callbacks.onMainMenu) callbacks.onMainMenu();
        });

        this._setupButton(this.elements.menuBtn, () => this.toggleMenu());
        this._setupButton(this.elements.resumeBtn, () => this.hideMenu());
        this._setupButton(this.elements.fullscreen, () => this.toggleFullscreen());

        this._setupButton(this.elements.deathRestartBtn, () => {
            this.hideDeathScreen();
            if (callbacks.onRestart) callbacks.onRestart();
        });

        this._setupButton(this.elements.deathMainMenuBtn, () => {
            if (this.elements.deathScreen) this.elements.deathScreen.classList.add('hidden');
            if (callbacks.onMainMenu) callbacks.onMainMenu();
        });

        const onKeyDown = (e) => this.handleKeyDown(e);
        window.addEventListener('keydown', onKeyDown);
        this._cleanupFns.push(() => window.removeEventListener('keydown', onKeyDown));
    }

    unbindButtons() {
        this._cleanupFns.forEach(fn => fn());
        this._cleanupFns = [];
    }

    /**
     * 설정, 랭킹 등 내부 팝업의 닫기/확인 버튼 콜백을 항상 유지하도록 바인딩
     */
    _bindInternalPopupControls() {
        console.log('[UIManager] Binding internal popup controls...', {
            ok: !!this.elements.settingsOkBtn,
            close: !!this.elements.closeSettingsBtn
        });
        // 설정 팝업 제어
        this._setupButton(this.elements.settingsOkBtn, () => {
            console.log('[UIManager] Settings OK clicked');
            // 저장 로직 (닉네임 등) 포함
            const nickname = this.elements.nicknameInput.value.trim();
            if (this._validateNickname(nickname)) {
                this._saveNickname(nickname);
            }
            this.hideSettings();
        });
        this._setupButton(this.elements.closeSettingsBtn, () => {
            console.log('[UIManager] Settings Close clicked');
            this.hideSettings();
        });

        // 랭킹 팝업 제어
        this._setupButton(this.elements.closeRankingBtn, () => this.hideRankings());

        // 도움말 팝업 제어
        this._setupButton(this.elements.closeHelpBtn, () => this.hideHelp());
    }

    /**
     * 버튼 바인딩 헬퍼
     */
    _setupButton(element, callback) {
        if (!element) return;

        const handleAction = (e) => {
            if (callback) callback();
        };

        const onClick = (e) => {
            if (e.pointerType === 'touch') return;
            handleAction(e);
        };

        const onTouchStart = (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.add('pressed');
        };

        const onTouchEnd = (e) => {
            if (element.classList.contains('locked')) return;
            element.classList.remove('pressed');
            e.preventDefault();
            handleAction(e);
        };

        const onTouchCancel = () => {
            element.classList.remove('pressed');
        };

        element.addEventListener('click', onClick);
        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchend', onTouchEnd, { passive: false });
        element.addEventListener('touchcancel', onTouchCancel);

        this._cleanupFns.push(() => {
            element.removeEventListener('click', onClick);
            element.removeEventListener('touchstart', onTouchStart);
            element.removeEventListener('touchend', onTouchEnd);
            element.removeEventListener('touchcancel', onTouchCancel);
        });
    }

    /**
     * 360도 레이더 업데이트
     */
    updateRadar(blips, isActive) {
        const container = document.getElementById('radar-container');
        if (!container) return;

        if (!isActive) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        const oldBlips = container.querySelectorAll('.radar-blip');
        oldBlips.forEach(el => el.remove());

        if (!blips || blips.length === 0) return;

        const radius = 45;

        blips.forEach(blip => {
            const rot = blip.rotation;
            const rx = blip.dx * Math.cos(rot) - blip.dz * Math.sin(rot);
            const ry = blip.dx * Math.sin(rot) + blip.dz * Math.cos(rot);

            const dist = Math.sqrt(rx * rx + ry * ry);
            const normX = rx / dist;
            const normY = ry / dist;

            const screenX = 50 + normX * (0.9 * radius);
            const screenY = 50 + normY * (0.9 * radius);

            const el = document.createElement('div');
            el.className = 'radar-blip';
            el.style.left = `${screenX}px`;
            el.style.top = `${screenY}px`;

            const angle = Math.atan2(normY, normX);
            const deg = (angle * 180 / Math.PI) + 90;
            el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
            el.style.opacity = '1.0';

            container.appendChild(el);
        });
    }

    /**
     * 체력 바 업데이트
     */
    updateHealthBar() {
        if (!this.player || !this.elements.healthFill) return;
        const healthRatio = this.player.health / CONFIG.PLAYER.MAX_HEALTH;
        const fillWidth = Math.max(0, healthRatio * 100);
        this.elements.healthFill.style.width = `${fillWidth}%`;

        if (this.elements.healthContainer) {
            this.elements.healthContainer.classList.toggle('low-health', healthRatio <= 0.25);
        }
    }

    /**
     * 좀비에게 물렸을 때 화면 효과
     */
    showBittenEffect() {
        if (!this.elements.bittenOverlay) return;
        this.elements.bittenOverlay.classList.remove('active');
        void this.elements.bittenOverlay.offsetWidth;
        this.elements.bittenOverlay.classList.add('active');

        setTimeout(() => {
            if (this.elements.bittenOverlay) {
                this.elements.bittenOverlay.classList.remove('active');
            }
        }, 500);
    }

    /**
     * 대미지 입었을 때 글리치 효과
     */
    triggerDamageEffect() {
        if (!this.elements.healthContainer) return;
        this.elements.healthContainer.classList.add('damaged');
        setTimeout(() => {
            if (this.elements.healthContainer) {
                this.elements.healthContainer.classList.remove('damaged');
            }
        }, 300);
    }

    /**
     * 배터리 바 UI 업데이트 헬퍼
     */
    _updateBatteryBar(hasItem, isOn, currentTimer, maxDuration, btnId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        if (hasItem) {
            btn.classList.remove('locked');
            btn.classList.toggle('active', isOn);

            const bar = btn.querySelector('.battery-bar-fill');
            if (bar) {
                const ratio = currentTimer / maxDuration;
                bar.style.height = `${Math.max(0, ratio * 100)}%`;
                bar.style.backgroundColor = ratio < 0.2 ? '#ff3333' : '#00ff00';
            }
        } else {
            btn.classList.add('locked');
            btn.classList.remove('active');
        }
    }

    /**
     * 전체화면 토글
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    dispose() {
        this.unbindButtons();
        this._cleanupFns = [];
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            const isSettingsOpen = this.elements.settingsPopup && !this.elements.settingsPopup.classList.contains('hidden');
            const isHelpOpen = this.elements.helpPopup && !this.elements.helpPopup.classList.contains('hidden');

            if (isHelpOpen) {
                this.elements.helpPopup.classList.add('hidden');
            } else if (isSettingsOpen) {
                this.elements.settingsPopup.classList.add('hidden');
            } else {
                this.toggleMenu();
            }
        }
    }

    /**
     * 닉네임 설정 UI 초기화
     */
    initNicknameUI(rankingManager, saveManager) {
        if (!this.elements.nicknameInput || !this.elements.nicknameSaveBtn) return;

        // 저장된 닉네임 로드
        const settings = saveManager.loadSettings();
        const savedNickname = settings.nickname;
        if (savedNickname) {
            this.elements.nicknameInput.value = savedNickname;
        }

        const handleSave = async () => {
            const nickname = this.elements.nicknameInput.value.trim();
            const status = this.elements.nicknameStatus;

            if (nickname.length === 0) {
                if (status) {
                    status.textContent = '닉네임을 입력해주세요.';
                    status.style.color = '#ff4444';
                }
                return;
            }

            const regex = /^[a-zA-Z0-9가-힣]+$/;
            if (!regex.test(nickname)) {
                if (status) {
                    status.textContent = '한글, 영어, 숫자만 사용 가능합니다.';
                    status.style.color = '#ff4444';
                }
                return;
            }

            if (nickname.length < 2 || nickname.length > 12) {
                if (status) {
                    status.textContent = '2~12자로 입력해주세요.';
                    status.style.color = '#ff4444';
                }
                return;
            }

            if (status) {
                status.textContent = '확인 중...';
                status.style.color = '#ffffff';
            }

            try {
                // 기존 닉네임과 동일하면 중복 체크 생략 가능하지만,
                // Supabase 연결 안정성을 위해 매번 체크하는 것이 좋음
                const isAvailable = await rankingManager.checkNicknameAvailable(nickname);
                if (!isAvailable && nickname !== savedNickname) {
                    if (status) {
                        status.textContent = '이미 사용 중인 닉네임입니다.';
                        status.style.color = '#ff4444';
                    }
                    return;
                }

                // 닉네임 저장
                // Supabase 서버에 저장
                const success = await rankingManager.updateNickname(nickname);

                if (success) {
                    // 서버 저장이 성공했을 때만 로컬에도 저장
                    saveManager.saveSettings(null, null, null, nickname);

                    if (status) {
                        status.textContent = '저장되었습니다!';
                        status.style.color = '#44ff44';
                    }
                } else {
                    if (status) {
                        status.textContent = '서버 저장에 실패했습니다.';
                        status.style.color = '#ffcc00';
                    }
                }
                if (status) {
                    setTimeout(() => { if (status) status.textContent = ''; }, 2000);
                }
            } catch (error) {
                console.error('Nickname save error:', error);
                if (status) {
                    status.textContent = '연결 오류가 발생했습니다.';
                    status.style.color = '#ff4444';
                }
            }
        };

        this._setupButton(this.elements.nicknameSaveBtn, handleSave);
    }

    /**
     * 글로벌 랭킹 표시
     */
    async showRankings(rankingManager) {
        if (!this.elements.rankingPopup) return;

        this.elements.rankingPopup.classList.remove('hidden');
        this.elements.rankingPopup.style.display = 'flex';

        if (this.elements.rankingList) {
            this.elements.rankingList.innerHTML = '<div class="ranking-loading">불러오는 중...</div>';
            if (this.elements.myRankingContainer) {
                this.elements.myRankingContainer.classList.add('hidden');
            }

            try {
                // 1. 상위 10위 가져오기
                const rankings = await rankingManager.getTopScores(10);

                if (!rankings || rankings.length === 0) {
                    this.elements.rankingList.innerHTML = '<div class="ranking-loading">등록된 랭킹이 없습니다.</div>';
                } else {
                    const listHtml = rankings.map((row, index) => {
                        const isTop3 = index < 3 ? `top-${index + 1}` : '';
                        const timeStr = this._formatTime(row.time);
                        return `
                            <div class="ranking-item ${isTop3}">
                                <span class="col-rank">${index + 1}</span>
                                <span class="col-nickname">${row.nickname}</span>
                                <span class="col-stage">${row.score}</span>
                                <span class="col-time">${timeStr}</span>
                                <span class="col-turn">${row.moves}</span>
                            </div>
                        `;
                    }).join('');
                    this.elements.rankingList.innerHTML = listHtml;
                }

                // 2. 내 랭킹 가져오기
                if (this.elements.myRankingContainer) {
                    const myRank = await rankingManager.getUserRank();

                    if (myRank) {
                        const timeStr = this._formatTime(myRank.time);
                        this.elements.myRankingContainer.innerHTML = `
                            <span class="section-label">MY RANKING</span>
                            <div class="ranking-header" style="background: transparent; border-bottom: none; margin-bottom: 0;">
                                <span class="col-rank">RANK</span>
                                <span class="col-nickname">NICKNAME</span>
                                <span class="col-stage">STAGE</span>
                                <span class="col-time">TIME</span>
                                <span class="col-turn">TURN</span>
                            </div>
                            <div class="ranking-item my-best-record">
                                <span class="col-rank">${myRank.rank}</span>
                                <span class="col-nickname">${myRank.nickname}</span>
                                <span class="col-stage">${myRank.score}</span>
                                <span class="col-time">${timeStr}</span>
                                <span class="col-turn">${myRank.moves}</span>
                            </div>
                        `;
                        this.elements.myRankingContainer.classList.remove('hidden');
                    }
                }
            } catch (error) {
                console.error('Ranking fetch error:', error);
                this.elements.rankingList.innerHTML = '<div class="ranking-error">데이터를 불러오지 못했습니다.</div>';
            }
        }
    }

    initRankingUI(rankingManager) {
        this._setupButton(this.elements.closeRankingBtn, () => {
            if (this.elements.rankingPopup) {
                this.elements.rankingPopup.classList.add('hidden');
                this.elements.rankingPopup.style.display = 'none';
            }
        });
    }

    showHelp() {
        if (this.elements.helpPopup) {
            this.elements.helpPopup.classList.remove('hidden');
            this.elements.helpPopup.style.display = 'flex';
        }
    }

    initHelpUI() {
        this._setupButton(this.elements.closeHelpBtn, () => {
            if (this.elements.helpPopup) {
                this.elements.helpPopup.classList.add('hidden');
                this.elements.helpPopup.style.display = 'none';
            }
        });
    }
}
