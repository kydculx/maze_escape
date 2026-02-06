import * as THREE from 'three';

/**
 * 플레이어 캐릭터 모델을 제작하는 클래스 (마인크래프트 스타일)
 */
export class CharacterBuilder {
    /**
     * 마인크래프트 스티브 스타일의 캐릭터 모델 생성
     * @returns {THREE.Group} 캐릭터 모델 그룹
     */
    static createPlayerModel() {
        const group = new THREE.Group();

        // 1. 재질 정의 (마인크래프트 클래식 컬러)
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC }); // 살색
        const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0x00AFAF }); // 민트색 셔츠
        const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); // 파란색 바지
        const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 });  // 갈색 머리
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });   // 흰자
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x442200 }); // 눈동자

        // 2. 다리 (Legs - Blue Pants)
        const legGeom = new THREE.BoxGeometry(0.12, 0.36, 0.12);
        const leftLeg = new THREE.Mesh(legGeom, pantsMaterial);
        leftLeg.name = 'leftLeg';
        leftLeg.position.set(-0.065, 0.18, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeom, pantsMaterial);
        rightLeg.name = 'rightLeg';
        rightLeg.position.set(0.065, 0.18, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // 3. 몸통 (Body - Cyan Shirt)
        const bodyGeom = new THREE.BoxGeometry(0.25, 0.36, 0.12);
        const body = new THREE.Mesh(bodyGeom, shirtMaterial);
        body.name = 'body';
        body.position.set(0, 0.54, 0); // 다리 위에 배치 (0.36 + 0.18)
        body.castShadow = true;
        group.add(body);

        // 4. 팔 (Arms - Cyan/Skin)
        const armGeom = new THREE.BoxGeometry(0.12, 0.36, 0.12);

        const leftArm = new THREE.Mesh(armGeom, shirtMaterial);
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.19, 0.54, 0);
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeom, shirtMaterial);
        rightArm.name = 'rightArm';
        rightArm.position.set(0.19, 0.54, 0);
        rightArm.castShadow = true;
        group.add(rightArm);

        // 5. 머리 (Head - Peach/Hair)
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.72 + 0.125, 0); // 몸통 위에 배치

        const headGeom = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        const headBase = new THREE.Mesh(headGeom, skinMaterial);
        headBase.castShadow = true;
        headGroup.add(headBase);

        // 머리카락 (Head Top/Back)
        const hairGeom = new THREE.BoxGeometry(0.26, 0.08, 0.26);
        const hairTop = new THREE.Mesh(hairGeom, hairMaterial);
        hairTop.position.y = 0.09;
        headGroup.add(hairTop);

        // 눈 (Eyes)
        const eyeGeom = new THREE.BoxGeometry(0.06, 0.03, 0.02);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        leftEye.position.set(-0.06, 0, -0.126);
        headGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        rightEye.position.set(0.06, 0, -0.126);
        headGroup.add(rightEye);

        // 눈동자
        const pupilGeom = new THREE.BoxGeometry(0.03, 0.03, 0.03);
        const leftPupil = new THREE.Mesh(pupilGeom, pupilMaterial);
        leftPupil.position.set(-0.075, 0, -0.13);
        headGroup.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeom, pupilMaterial);
        rightPupil.position.set(0.075, 0, -0.13);
        headGroup.add(rightPupil);

        group.add(headGroup);

        return group;
    }
}
