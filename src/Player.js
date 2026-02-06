import * as THREE from 'three';
import { CONFIG, PLAYER_ACTION_STATES } from './Config.js';
import { CharacterBuilder } from './CharacterBuilder.js';

/**
 * 플레이어 캐릭터의 모델, 이동, 애니메이션, 상태를 관리하는 클래스
 */
export class Player {
    constructor(scene, mazeGen, soundManager) {
        this.scene = scene;
        this.mazeGen = mazeGen;
        this.sound = soundManager;

        // 플레이어 그룹 (이 그룹이 실제 월드 상의 위치/회전을 가짐)
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // 시각적 모델 제작
        this.model = CharacterBuilder.createPlayerModel();
        this.model.scale.set(0.3, 0.3, 0.3);
        this.model.visible = false; // 기본 1인칭이므로 숨김
        this.group.add(this.model);

        // 스포트라이트 (횃불 효과)
        this._initTorch();

        // 상태 변수
        this.actionState = PLAYER_ACTION_STATES.IDLE;
        this.lastActionState = null;
        this.animationTime = 0;
        this.lastFootstepTime = 0;
        this.stateSprite = null;

        // 이동/회전/점프 제어용 변수
        this.isMoving = false;
        this.moveTimer = 0;
        this.startPos = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();

        this.isRotating = false;
        this.rotationTimer = 0;
        this.startRotationY = 0;
        this.targetRotationY = 0;

        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpHeight = CONFIG.PHYSICS.JUMP_HEIGHT;
        this.jumpDuration = CONFIG.PHYSICS.JUMP_DURATION;

        this.updateStateLabel();
    }

    _initTorch() {
        const lightCfg = CONFIG.ENVIRONMENT.SPOTLIGHT;
        this.torch = new THREE.SpotLight(
            lightCfg.COLOR,
            lightCfg.INTENSITY,
            lightCfg.DISTANCE,
            lightCfg.ANGLE,
            lightCfg.PENUMBRA,
            lightCfg.DECAY
        );
        this.torch.position.set(0, 0.4, 0);

        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(0, 0.4, -5);
        this.group.add(lightTarget);
        this.torch.target = lightTarget;
        this.torch.castShadow = true;
        this.group.add(this.torch);
    }

    /**
     * 위치 및 회전 초기화
     */
    reset(pos, angle) {
        this.group.position.set(pos.x, 0, pos.z);
        this.group.rotation.y = angle;

        this.isMoving = false;
        this.isRotating = false;
        this.isJumping = false;
        this.actionState = PLAYER_ACTION_STATES.IDLE;
        this.animationTime = 0;
        this.updateStateLabel();
    }

    update(deltaTime) {
        // 0. 횃불 깜빡임
        this.torch.intensity = CONFIG.ENVIRONMENT.SPOTLIGHT.INTENSITY + Math.sin(Date.now() * 0.075) * 0.15 + Math.random() * 0.1;

        // 1. 애니메이션
        this.animateCharacter(deltaTime);

        // 2. 상태 라벨
        if (this.lastActionState !== this.actionState) {
            this.updateStateLabel();
            this.lastActionState = this.actionState;
        }

        // 3. 회전 처리
        if (this.isRotating) {
            this.rotationTimer += deltaTime;
            const progress = Math.min(this.rotationTimer / CONFIG.PHYSICS.ROTATION_DURATION, 1);
            this.group.rotation.y = THREE.MathUtils.lerp(this.startRotationY, this.targetRotationY, progress);
            if (progress >= 1) this.isRotating = false;
        }

        // 4. 이동 처리
        if (this.isMoving) {
            if (!this.isJumping) this.actionState = PLAYER_ACTION_STATES.MOVE;
            this.moveTimer += deltaTime;
            const progress = Math.min(this.moveTimer / CONFIG.PHYSICS.MOVE_DURATION, 1);

            const currentY = this.group.position.y;
            this.group.position.lerpVectors(this.startPos, this.targetPos, progress);
            this.group.position.y = this.isJumping ? currentY : 0;

            if (progress >= 1) {
                this.isMoving = false;
                if (!this.isJumping) this.actionState = PLAYER_ACTION_STATES.IDLE;
            }
        }

        // 5. 점프 처리
        if (this.isJumping) {
            this.actionState = PLAYER_ACTION_STATES.JUMP;
            this.jumpTimer += deltaTime;
            const progress = Math.min(this.jumpTimer / this.jumpDuration, 1);
            this.group.position.y = Math.sin(progress * Math.PI) * this.jumpHeight;

            if (progress >= 1) {
                this.isJumping = false;
                this.group.position.y = 0;
                this.actionState = this.isMoving ? PLAYER_ACTION_STATES.MOVE : PLAYER_ACTION_STATES.IDLE;
            }
        }
    }

    startMove(stepDir) {
        if (this.isMoving || this.isRotating || this.isJumping) return;

        const moveDistance = CONFIG.MAZE.WALL_THICKNESS;
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
        const nextPos = this.group.position.clone().add(direction.multiplyScalar(moveDistance * stepDir));

        if (!this.checkCollision(nextPos.x, nextPos.z)) {
            this.isMoving = true;
            this.moveTimer = 0;
            this.startPos.copy(this.group.position);
            this.targetPos.copy(nextPos);
        }
    }

    startRotation(angle) {
        if (this.isMoving || this.isRotating || this.isJumping) return;
        this.isRotating = true;
        this.rotationTimer = 0;
        this.startRotationY = this.group.rotation.y;
        this.targetRotationY = this.startRotationY + angle;
    }

    startJump() {
        if (this.isJumping) return;
        this.isJumping = true;
        this.jumpTimer = 0;
        if (this.sound) this.sound.playSFX(CONFIG.AUDIO.JUMP_SFX_URL, 0.4);
    }

    animateCharacter(deltaTime) {
        if (!this.model) return;
        this.animationTime += deltaTime;

        const leftArm = this.model.getObjectByName('leftArm');
        const rightArm = this.model.getObjectByName('rightArm');
        const leftLeg = this.model.getObjectByName('leftLeg');
        const rightLeg = this.model.getObjectByName('rightLeg');
        const body = this.model.getObjectByName('body');
        const head = this.model.getObjectByName('headGroup');

        if (!leftArm || !rightArm || !leftLeg || !rightLeg || !body || !head) return;

        const lerpSpeed = 0.15;

        switch (this.actionState) {
            case PLAYER_ACTION_STATES.MOVE:
                const walkSpeed = 12;
                const swing = Math.sin(this.animationTime * walkSpeed) * 0.6;
                leftLeg.rotation.x = swing;
                rightLeg.rotation.x = -swing;
                leftArm.rotation.x = -swing;
                rightArm.rotation.x = swing;

                const bob = Math.abs(Math.cos(this.animationTime * walkSpeed)) * 0.04;
                body.position.y = 0.54 + bob;
                head.position.y = 0.845 + bob;

                if (this.animationTime - this.lastFootstepTime >= Math.PI / walkSpeed) {
                    if (this.sound) this.sound.playSFX(CONFIG.AUDIO.FOOTSTEP_SFX_URL, 0.3);
                    this.lastFootstepTime = this.animationTime;
                }
                break;

            case PLAYER_ACTION_STATES.JUMP:
                leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, -0.6, 0.2);
                rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, -0.6, 0.2);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.4, 0.2);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.4, 0.2);
                break;

            case PLAYER_ACTION_STATES.IDLE:
            default:
                const idleBob = Math.sin(this.animationTime * 2.5) * 0.015;
                body.position.y = 0.54 + idleBob;
                head.position.y = 0.845 + idleBob;
                leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, lerpSpeed);
                rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, lerpSpeed);
                leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, lerpSpeed);
                rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, lerpSpeed);
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, lerpSpeed);
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0, lerpSpeed);
                break;
        }
    }

    updateStateLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 128);

        let color = '#00ffff';
        if (this.actionState === PLAYER_ACTION_STATES.JUMP) color = '#ff00ff';
        else if (this.actionState === PLAYER_ACTION_STATES.MOVE) color = '#ffff00';

        ctx.font = 'Bold 60px Inter, Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(this.actionState, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        if (!this.stateSprite) {
            this.stateSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
            this.stateSprite.scale.set(0.8, 0.4, 1);
            this.stateSprite.position.set(0, 1.2, 0);
            this.group.add(this.stateSprite);
        } else {
            this.stateSprite.material.map.dispose();
            this.stateSprite.material.map = texture;
        }
    }

    checkCollision(x, z) {
        const thickness = CONFIG.MAZE.WALL_THICKNESS;
        const radius = CONFIG.PHYSICS.PLAYER_RADIUS;
        const offsetX = -(this.mazeGen.width * thickness) / 2;
        const offsetZ = -(this.mazeGen.height * thickness) / 2;

        const points = [
            { x: x, z: z }, { x: x + radius, z: z }, { x: x - radius, z: z },
            { x: x, z: z + radius }, { x: x, z: z - radius }
        ];

        for (const p of points) {
            const gx = Math.floor((p.x - offsetX) / thickness);
            const gy = Math.floor((p.z - offsetZ) / thickness);
            if (gx < 0 || gx >= this.mazeGen.width || gy < 0 || gy >= this.mazeGen.height) return true;
            if (this.mazeGen.grid[gy][gx] === 1) return true;
        }
        return false;
    }

    get position() { return this.group.position; }
    get rotation() { return this.group.rotation; }
    get quaternion() { return this.group.quaternion; }

    /**
     * 시점 전환 대응 (모델 가시성 조절)
     */
    setVisibility(visible) {
        if (this.model) this.model.visible = visible;
    }
}
