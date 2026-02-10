import * as THREE from 'three';

/**
 * 3D 캐릭터 모델을 절차적으로 생성하는 유틸리티 클래스
 */
export class CharacterBuilder {
    /**
     * 좀비 전용 상세 캐릭터 모델 생성
     * @param {Object} options { color, scale, shirtColor, pantsColor }
     */
    static createZombie(options = {}) {
        const {
            color = 0x77aa77, // 피부색 (창백한 초록)
            scale = 0.3,
            shirtColor = 0x334455, // 낡은 셔츠 색상
            pantsColor = 0x222222  // 낡은 바지 색상
        } = options;

        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);

        // 1. 몸통 (Torso) - 상의 색상 적용
        const torsoGroup = new THREE.Group();
        torsoGroup.position.y = 0.9;
        group.add(torsoGroup);

        const torsoGeom = new THREE.BoxGeometry(0.6, 0.8, 0.4);
        const torsoMat = new THREE.MeshStandardMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeom, torsoMat);
        torso.castShadow = true;
        torsoGroup.add(torso);

        // 2. 머리 (Head) - 피부색
        const headPivot = new THREE.Group();
        headPivot.position.y = 1.3; // 목 위치
        group.add(headPivot);

        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headPivot.add(headGroup);

        const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshStandardMaterial({ color: color });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 0.25; // 목에서 위로
        head.castShadow = true;
        headGroup.add(head);

        // 뇌 (Brain) - 머리 윗부분 일부 노출
        const brainGeom = new THREE.BoxGeometry(0.35, 0.15, 0.35);
        const brainMat = new THREE.MeshStandardMaterial({ color: 0xffaacc });
        const brain = new THREE.Mesh(brainGeom, brainMat);
        brain.position.set(0, 0.5, 0.05);
        headGroup.add(brain);

        // 눈 (Sunken Eyes)
        const eyeSocketGeom = new THREE.BoxGeometry(0.12, 0.12, 0.05);
        const eyeSocketMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const eyeGeom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x440000 });

        // 왼쪽 눈
        const lSocket = new THREE.Mesh(eyeSocketGeom, eyeSocketMat);
        lSocket.position.set(-0.15, 0.35, 0.23);
        headGroup.add(lSocket);
        const lEye = new THREE.Mesh(eyeGeom, eyeMat);
        lEye.position.set(-0.15, 0.35, 0.25);
        headGroup.add(lEye);

        // 오른쪽 눈 (약간 비대칭)
        const rSocket = new THREE.Mesh(eyeSocketGeom, eyeSocketMat);
        rSocket.position.set(0.15, 0.3, 0.23);
        headGroup.add(rSocket);
        const rEye = new THREE.Mesh(eyeGeom, eyeMat);
        rEye.position.set(0.15, 0.3, 0.25);
        headGroup.add(rEye);

        // 입 (Open Mouth)
        const mouthGeom = new THREE.BoxGeometry(0.25, 0.1, 0.1);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x221111 });
        const mouth = new THREE.Mesh(mouthGeom, mouthMat);
        mouth.position.set(0, 0.1, 0.22);
        headGroup.add(mouth);

        // 3. 팔 (Arms) - 어깨 피벗 적용
        const armGeom = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const armSkinMat = new THREE.MeshStandardMaterial({ color: color });
        const armShirtMat = new THREE.MeshStandardMaterial({ color: shirtColor });

        // 왼쪽 팔
        const lArmPivot = new THREE.Group();
        lArmPivot.name = 'leftArm';
        lArmPivot.position.set(-0.4, 1.2, 0); // 어깨 위치
        group.add(lArmPivot);

        const lArmMesh = new THREE.Mesh(armGeom, armShirtMat);
        lArmMesh.position.y = -0.3; // 피벗에서 아래로
        lArmMesh.castShadow = true;
        lArmPivot.add(lArmMesh);

        // 팔 끝에 손(피부색) 추가
        const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), armSkinMat);
        lHand.position.y = -0.7;
        lArmPivot.add(lHand);

        // 오른쪽 팔
        const rArmPivot = new THREE.Group();
        rArmPivot.name = 'rightArm';
        rArmPivot.position.set(0.4, 1.2, 0);
        group.add(rArmPivot);

        const rArmMesh = new THREE.Mesh(armGeom, armShirtMat);
        rArmMesh.position.y = -0.3;
        rArmMesh.castShadow = true;
        rArmPivot.add(rArmMesh);

        const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), armSkinMat);
        rHand.position.y = -0.7;
        rArmPivot.add(rHand);

        // 4. 다리 (Legs) - 골반 피벗 적용
        const legGeom = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMat = new THREE.MeshStandardMaterial({ color: pantsColor });

        // 왼쪽 다리
        const lLegPivot = new THREE.Group();
        lLegPivot.name = 'leftLeg';
        lLegPivot.position.set(-0.2, 0.6, 0); // 골반 위치
        group.add(lLegPivot);

        const lLegMesh = new THREE.Mesh(legGeom, legMat);
        lLegMesh.position.y = -0.3;
        lLegMesh.castShadow = true;
        lLegPivot.add(lLegMesh);

        // 오른쪽 다리
        const rLegPivot = new THREE.Group();
        rLegPivot.name = 'rightLeg';
        rLegPivot.position.set(0.2, 0.6, 0);
        group.add(rLegPivot);

        const rLegMesh = new THREE.Mesh(legGeom, legMat);
        rLegMesh.position.y = -0.3;
        rLegMesh.castShadow = true;
        rLegPivot.add(rLegMesh);

        return group;
    }

    /**
     * 늑대 좀비 전용 사족보행 모델 생성
     * @param {Object} options { color, scale }
     */
    static createWolf(options = {}) {
        const {
            color = 0xaa4444, // 붉은 늑대 색상
            scale = 0.35
        } = options;

        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);

        // 모델을 90도 회전시켜 좀비와 같은 방향(-Z)을 바라보도록 설정
        group.rotation.y = -Math.PI / 2;

        // 1. 늑대 몸통 (수평으로 긴 형태)
        const bodyGeom = new THREE.BoxGeometry(1.2, 0.6, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.set(0, 0.5, 0);
        body.castShadow = true;
        group.add(body);

        // 2. 늑대 머리 (주둥이 포함)
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0.7, 0.6, 0);
        group.add(headGroup);

        // 머리 메인 부분
        const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.castShadow = true;
        headGroup.add(head);

        // 주둥이 (Snout)
        const snoutGeom = new THREE.BoxGeometry(0.3, 0.2, 0.2);
        const snout = new THREE.Mesh(snoutGeom, bodyMat);
        snout.position.set(0.3, -0.05, 0);
        snout.castShadow = true;
        headGroup.add(snout);

        // 귀 (삼각형 모양)
        const earGeom = new THREE.ConeGeometry(0.15, 0.3, 3);
        const lEar = new THREE.Mesh(earGeom, bodyMat);
        lEar.position.set(-0.1, 0.3, -0.1);
        lEar.rotation.z = Math.PI / 6;
        lEar.castShadow = true;
        headGroup.add(lEar);

        const rEar = new THREE.Mesh(earGeom, bodyMat);
        rEar.position.set(-0.1, 0.3, 0.1);
        rEar.rotation.z = Math.PI / 6;
        rEar.castShadow = true;
        headGroup.add(rEar);

        // 눈 (빛나는 붉은 눈)
        const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });

        const lEye = new THREE.Mesh(eyeGeom, eyeMat);
        lEye.position.set(0.15, 0.1, -0.15);
        headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeom, eyeMat);
        rEye.position.set(0.15, 0.1, 0.15);
        headGroup.add(rEye);

        // 3. 네 개의 다리 (사족보행)
        const legGeom = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const legMat = new THREE.MeshStandardMaterial({ color });

        // 앞 왼쪽 다리
        const flLegPivot = new THREE.Group();
        flLegPivot.name = 'frontLeftLeg';
        flLegPivot.position.set(0.4, 0.3, -0.2);
        group.add(flLegPivot);
        const flLeg = new THREE.Mesh(legGeom, legMat);
        flLeg.position.y = -0.25;
        flLeg.castShadow = true;
        flLegPivot.add(flLeg);

        // 앞 오른쪽 다리
        const frLegPivot = new THREE.Group();
        frLegPivot.name = 'frontRightLeg';
        frLegPivot.position.set(0.4, 0.3, 0.2);
        group.add(frLegPivot);
        const frLeg = new THREE.Mesh(legGeom, legMat);
        frLeg.position.y = -0.25;
        frLeg.castShadow = true;
        frLegPivot.add(frLeg);

        // 뒤 왼쪽 다리
        const blLegPivot = new THREE.Group();
        blLegPivot.name = 'backLeftLeg';
        blLegPivot.position.set(-0.4, 0.3, -0.2);
        group.add(blLegPivot);
        const blLeg = new THREE.Mesh(legGeom, legMat);
        blLeg.position.y = -0.25;
        blLeg.castShadow = true;
        blLegPivot.add(blLeg);

        // 뒤 오른쪽 다리
        const brLegPivot = new THREE.Group();
        brLegPivot.name = 'backRightLeg';
        brLegPivot.position.set(-0.4, 0.3, 0.2);
        group.add(brLegPivot);
        const brLeg = new THREE.Mesh(legGeom, legMat);
        brLeg.position.y = -0.25;
        brLeg.castShadow = true;
        brLegPivot.add(brLeg);

        // 4. 꼬리
        const tailGeom = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const tail = new THREE.Mesh(tailGeom, legMat);
        tail.position.set(-0.7, 0.6, 0);
        tail.rotation.x = -Math.PI / 4;
        tail.castShadow = true;
        group.add(tail);

        return group;
    }

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
