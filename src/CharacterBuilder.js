import * as THREE from 'three';

/**
 * 3D 캐릭터 모델을 절차적으로 생성하는 유틸리티 클래스
 */
export class CharacterBuilder {
    /**
     * 기본 이족보행 캐릭터 모델 생성
     * @param {Object} options { color, scale }
     */
    static createBasicCharacter(options = {}) {
        const {
            color = 0x77aa77,
            scale = 0.5
        } = options;

        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);

        // 1. 몸통 (Torso)
        const torsoGeom = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const torsoMat = new THREE.MeshStandardMaterial({ color: color });
        const torso = new THREE.Mesh(torsoGeom, torsoMat);
        torso.position.y = 0.9;
        torso.castShadow = true;
        group.add(torso);

        // 2. 머리 (Head)
        const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({ color: color });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // 눈 (Eyes) - 좀비 느낌을 위해 약간 비대칭이거나 붉은색
        const eyeGeom = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(-0.15, 1.65, 0.25);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(0.15, 1.65, 0.25);
        group.add(rightEye);

        // 3. 팔 (Arms)
        const armGeom = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const armMat = new THREE.MeshStandardMaterial({ color: color });

        const leftArm = new THREE.Mesh(armGeom, armMat);
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.45, 1.0, 0);
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeom, armMat);
        rightArm.name = 'rightArm';
        rightArm.position.set(0.45, 1.0, 0);
        rightArm.castShadow = true;
        group.add(rightArm);

        // 4. 다리 (Legs)
        const legGeom = new THREE.BoxGeometry(0.25, 0.6, 0.25);
        const legMat = new THREE.MeshStandardMaterial({ color: color });

        const leftLeg = new THREE.Mesh(legGeom, legMat);
        leftLeg.name = 'leftLeg';
        leftLeg.position.set(-0.2, 0.3, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeom, legMat);
        rightLeg.name = 'rightLeg';
        rightLeg.position.set(0.2, 0.3, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        return group;
    }
}
