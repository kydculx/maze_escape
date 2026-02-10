import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from '../CharacterBuilder.js';
import { CONFIG } from '../Config.js';

/**
 * 기본 좀비 클래스
 */
export class Zombie extends Monster {
    constructor(scene, mazeGen, options = {}) {
        const zombieCfg = CONFIG.MONSTERS.ZOMBIE;
        super(scene, mazeGen, CONFIG.MONSTERS.TYPES.ZOMBIE, {
            color: zombieCfg.COLOR,
            scale: zombieCfg.MODEL_SCALE,
            ...options
        });

        // 레벨 기반 속도 계산
        const level = options.level || 1;
        const baseSpeed = zombieCfg.SPEED;
        const speedIncrease = zombieCfg.SPEED_INCREASE_PER_LEVEL;
        const maxMultiplier = zombieCfg.MAX_SPEED_MULTIPLIER;

        const speedMultiplier = Math.min(maxMultiplier, 1 + (level * speedIncrease));
        this.speed = baseSpeed * speedMultiplier;

        console.log(`Zombie spawned at level ${level}: speed ${this.speed.toFixed(2)}x (base: ${baseSpeed}, multiplier: ${speedMultiplier.toFixed(2)})`);

        this.sound = options.sound;
        this._initAudio();

        // Freeze 효과
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.originalColor = new THREE.Color(zombieCfg.COLOR);
        this.frozenColor = new THREE.Color(0x00ffff);
    }

    _getConfig() {
        return CONFIG.MONSTERS.ZOMBIE;
    }

    freeze(duration) {
        this.isFrozen = true;
        this.freezeTimer = duration;
        this._setBodyColor(this.frozenColor);
        this.isMovingTile = false;
        this.path = [];
    }

    _setBodyColor(color) {
        if (!this.model) return;
        this.model.traverse(child => {
            if (child.isMesh && child.material) {
                if (color.equals(this.frozenColor)) {
                    child.material.emissive.setHex(0x0088ff);
                    child.material.emissiveIntensity = 0.5;
                } else {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }

    _initAudio() {
        const audioCfg = CONFIG.AUDIO;
        this.patrolSFXUrl = audioCfg.ZOMBIE_PATROL_SFX;
        this.trackSFXUrl = audioCfg.ZOMBIE_TRACK_SFX;
        this.attackSFXUrl = audioCfg.ZOMBIE_ATTACK_SFX;
        this.soundCooldown = 0;

        // SoundManager 사운드 컨트롤러 사용
        if (this.sound) {
            this.trackSoundController = this.sound.playLoop(this.trackSFXUrl, 0); // 초기 볼륨 0
        }
    }

    _updateAudioVolumes(deltaTime, player) {
        if (!this.trackSoundController) return;

        // PlayScene에서 userData.player를 설정하지 않으므로 인자로 받은 player 사용
        if (!player) return;

        const distInTiles = this.position.distanceTo(player.position) / CONFIG.MAZE.WALL_THICKNESS;
        const maxDist = this._getConfig().DETECTION_RANGE;
        const isTracking = !this.isPatrolling && this.state === CONFIG.MONSTERS.STATES.MOVE;

        let targetVolume = this._calculateVolume(distInTiles, maxDist);

        if (isTracking && targetVolume > 0) {
            if (!this.trackSoundController.isPlaying) {
                // console.log(`[Zombie] Starting track audio. Dist: ${distInTiles.toFixed(2)}, Vol: ${targetVolume.toFixed(2)}`); // 기존 로그 제거 또는 유지
                this.trackSoundController.play();
            }

            // sfxVolume 적용
            const sfxVolume = this.sound.sfxVolume || 1.0;
            this.trackSoundController.setVolume(targetVolume * sfxVolume);
        } else {
            if (this.trackSoundController.isPlaying) {
                console.log('[Zombie] Stopping track audio');
                this.trackSoundController.stop();
            }
        }
    }

    _initModel(options) {
        this.model = CharacterBuilder.createZombie(options);
        this.group.add(this.model);

        this.leftLeg = this.model.getObjectByName('leftLeg');
        this.rightLeg = this.model.getObjectByName('rightLeg');
        this.leftArm = this.model.getObjectByName('leftArm');
        this.rightArm = this.model.getObjectByName('rightArm');
        this.head = this.model.getObjectByName('head');
    }

    _updateAnimation(deltaTime) {
        if (!this.model || this.isFrozen) return;

        const cfg = this._getConfig();

        if (this.isMovingTile) {
            const bobSpeed = cfg.WALK_BOB_SPEED;
            const bobAmp = cfg.WALK_BOB_AMPLITUDE;

            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.leftArm) this.leftArm.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp * 0.5;
            if (this.rightArm) this.rightArm.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp * 0.5;
            if (this.head) this.head.rotation.y = Math.sin(this.animTime * bobSpeed * 0.5) * 0.1;
        } else {
            const swaySpeed = cfg.IDLE_SWAY_SPEED;
            const swayAmp = cfg.IDLE_SWAY_AMPLITUDE;

            if (this.head) this.head.rotation.y = Math.sin(this.animTime * swaySpeed) * swayAmp;
            if (this.leftLeg) this.leftLeg.rotation.x = 0;
            if (this.rightLeg) this.rightLeg.rotation.x = 0;
            if (this.leftArm) this.leftArm.rotation.x = 0;
            if (this.rightArm) this.rightArm.rotation.x = 0;
        }
    }

    update(deltaTime, player) {
        if (!this.group) return;

        if (this.isFrozen) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                this._setBodyColor(this.originalColor);
            }
            return;
        }

        super.update(deltaTime, player);
        this._updateAudioVolumes(deltaTime, player);

        if (this.minimapMarker) {
            this.minimapMarker.position.copy(this.position);
        }
    }

    destroy() {
        if (this.trackAudio) {
            this.trackAudio.pause();
            this.trackAudio.currentTime = 0;
        }
        super.destroy();
    }

    _calculateVolume(distInTiles, maxDist) {
        if (distInTiles >= maxDist) return 0;
        const steps = Math.floor(maxDist);
        const stepSize = 1.0 / steps;
        const currentStep = Math.floor(distInTiles);
        return Math.max(0, 1.0 - (currentStep * stepSize));
    }

    isMakingSound() {
        if (!this.trackAudio) return false;
        return !this.trackAudio.paused && this.trackAudio.volume > 0.01;
    }
}
