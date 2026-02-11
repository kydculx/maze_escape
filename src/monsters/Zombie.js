import * as THREE from 'three';
import { Monster } from './Monster.js';
import { CharacterBuilder } from '../CharacterBuilder.js';
import { CONFIG } from '../Config.js';
import { ASSETS } from '../Assets.js';

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

        this._initAudio();
    }

    /**
     * 좀비 설정 반환
     */
    _getConfig() {
        return CONFIG.MONSTERS.ZOMBIE;
    }


    /**
     * 좀비 모델 생성 (CharacterBuilder 사용)
     */
    _initModel(options) {
        this.model = CharacterBuilder.createZombie(options);
        this.group.add(this.model);

        this.leftLeg = this.model.getObjectByName('leftLeg');
        this.rightLeg = this.model.getObjectByName('rightLeg');
        this.leftArm = this.model.getObjectByName('leftArm');
        this.rightArm = this.model.getObjectByName('rightArm');
        this.head = this.model.getObjectByName('head');
    }

    /**
     * 좀비 애니메이션 업데이트 (걷기/대기)
     */
    _updateAnimation(deltaTime) {
        if (!this.model || this.isFrozen) return;

        const cfg = this._getConfig();

        if (this.isMovingTile) {
            // Scale animation speed by the monster's speed
            const bobSpeed = cfg.WALK_BOB_SPEED * this.speed;
            const bobAmp = cfg.WALK_BOB_AMPLITUDE;

            if (this.leftLeg) this.leftLeg.rotation.x = Math.sin(this.animTime * bobSpeed) * bobAmp;
            if (this.rightLeg) this.rightLeg.rotation.x = -Math.sin(this.animTime * bobSpeed) * bobAmp;

            // 팔이 앞으로 뻗은 상태(-PI/2)에서 위아래로 약간 흔들림
            const armForwardBase = -Math.PI / 2;
            const armSwing = Math.sin(this.animTime * bobSpeed) * bobAmp * 0.3;
            if (this.leftArm) this.leftArm.rotation.x = armForwardBase + armSwing;
            if (this.rightArm) this.rightArm.rotation.x = armForwardBase - armSwing;

            if (this.head) this.head.rotation.y = Math.sin(this.animTime * bobSpeed * 0.5) * 0.1;
        } else {
            const swaySpeed = cfg.IDLE_SWAY_SPEED;
            const swayAmp = cfg.IDLE_SWAY_AMPLITUDE;

            if (this.head) this.head.rotation.y = Math.sin(this.animTime * swaySpeed) * swayAmp;
            if (this.leftLeg) this.leftLeg.rotation.x = 0;
            if (this.rightLeg) this.rightLeg.rotation.x = 0;

            // 대기 시에도 팔을 앞으로 뻗고 있음
            const armForwardBase = -Math.PI / 2;
            if (this.leftArm) this.leftArm.rotation.x = armForwardBase;
            if (this.rightArm) this.rightArm.rotation.x = armForwardBase;
        }
    }

    /**
     * 오디오 설정 초기화
     */
    _initAudio() {
        this.patrolSFXUrl = ASSETS.AUDIO.SFX.ZOMBIE.PATROL;
        this.trackSFXUrl = ASSETS.AUDIO.SFX.ZOMBIE.TRACK;
        this.attackSFXUrl = ASSETS.AUDIO.SFX.ZOMBIE.ATTACK;
        this.soundCooldown = 0;

        // 부모 클래스의 오디오 시스템 초기화 호출
        this._initAudioSystem();
    }


}
