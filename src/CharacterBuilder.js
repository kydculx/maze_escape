import * as THREE from 'three';
import { ASSETS } from './Assets.js';

/**
 * 3D 캐릭터 모델을 절차적으로 생성하는 유틸리티 클래스
 */
export class CharacterBuilder {
    static textureLoader = new THREE.TextureLoader();
    static zombieSkinTex = null;
    static zombieClothesTex = null;
    static zombieHeadOverhaulTex = null;
    static zombieBodyOverhaulTex = null;

    static _initZombieTextures() {
        // --- 에셋 폴더의 이미지를 로드하여 텍스처로 사용 ---
        const loadTex = (url) => {
            const tex = this.textureLoader.load(url);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            return tex;
        };

        // 기존 절차적 생성 로직 대신 준비된 이미지 에셋을 로드합니다.
        if (!this.zombieHeadOverhaulTex) {
            this.zombieHeadOverhaulTex = loadTex(ASSETS.TEXTURES.ZOMBIE.HEAD_OVERHAUL);
        }
        if (!this.zombieBodyOverhaulTex) {
            this.zombieBodyOverhaulTex = loadTex(ASSETS.TEXTURES.ZOMBIE.BODY_OVERHAUL);
        }
        if (!this.zombieSkinTex) {
            this.zombieSkinTex = loadTex(ASSETS.TEXTURES.ZOMBIE.SKIN);
            this.zombieSkinTex.wrapS = this.zombieSkinTex.wrapT = THREE.RepeatWrapping;
        }
        if (!this.zombieClothesTex) {
            this.zombieClothesTex = loadTex(ASSETS.TEXTURES.ZOMBIE.CLOTHES);
            this.zombieClothesTex.wrapS = this.zombieClothesTex.wrapT = THREE.RepeatWrapping;
        }
    }

    /**
     * 박스 지오메트리의 특정 면에 대한 UV를 조정합니다.
     */
    static _setBoxFaceUVs(geometry, faceIndex, u, v) {
        const uvAttr = geometry.attributes.uv;
        const faceGroups = geometry.groups;
        if (!faceGroups[faceIndex]) return;

        const start = faceGroups[faceIndex].start;
        const count = faceGroups[faceIndex].count;

        for (let i = start; i < start + count; i++) {
            let curU = uvAttr.getX(i);
            let curV = uvAttr.getY(i);
            // 아틀라스 2x2 그리드 매핑
            uvAttr.setXY(i, u + curU * 0.5, v + curV * 0.5);
        }
        uvAttr.needsUpdate = true;
    }

    /**
     * 좀비 전용 상세 캐릭터 모델 생성 (Minecraft aggressive style)
     */
    static createZombie(options = {}) {
        this._initZombieTextures();

        const {
            color = 0x7a7a5a,
            scale = 0.4,
            shirtColor = 0x5a5a4a,
            pantsColor = 0x3a2a22
        } = options;

        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.zombieHeadOverhaulTex, roughness: 0.8 });
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.zombieBodyOverhaulTex, roughness: 1.0 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.zombieSkinTex, roughness: 0.9 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.zombieSkinTex, roughness: 1.0 }); // Use skin for arms
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.zombieClothesTex, roughness: 1.0 });

        // 1. 머리
        const headPivot = new THREE.Group();
        headPivot.name = 'head';
        headPivot.position.y = 1.5;
        group.add(headPivot);

        const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        // [Verified in Stage 6] -Z is the forward face when chasing.
        this._setBoxFaceUVs(headGeom, 5, 0, 0.5);   // 정면 (-Z) <- Front (Face)
        this._setBoxFaceUVs(headGeom, 4, 0.5, 0);   // 뒷면 (+Z) <- Back (Neck/Brain)
        this._setBoxFaceUVs(headGeom, 0, 0.5, 0.5); // 측면 (+X)
        this._setBoxFaceUVs(headGeom, 1, 0.5, 0.5); // 측면 (-X)
        this._setBoxFaceUVs(headGeom, 2, 0, 0);     // 윗면 (+Y)
        this._setBoxFaceUVs(headGeom, 3, 0.5, 0);   // 아랫면 (-Y)

        const headMesh = new THREE.Mesh(headGeom, headMat);
        headMesh.position.y = 0.25;
        headMesh.castShadow = true;
        headPivot.add(headMesh);

        // 2. 몸통
        const torsoGeom = new THREE.BoxGeometry(0.5, 0.75, 0.25);
        // [Verified in Stage 6] -Z is the forward face.
        this._setBoxFaceUVs(torsoGeom, 5, 0, 0.5);   // 정면 (-Z) <- Front (Ribs)
        this._setBoxFaceUVs(torsoGeom, 4, 0.5, 0.5); // 뒷면 (+Z) <- Back (Spine)
        this._setBoxFaceUVs(torsoGeom, 1, 0, 0);     // 왼쪽 (-X)
        this._setBoxFaceUVs(torsoGeom, 0, 0.5, 0);   // 오른쪽 (+X)
        this._setBoxFaceUVs(torsoGeom, 2, 0, 0.5);   // 윗면
        this._setBoxFaceUVs(torsoGeom, 3, 0.5, 0.5); // 아랫면

        const torso = new THREE.Mesh(torsoGeom, torsoMat);
        torso.position.y = 1.125;
        torso.castShadow = true;
        group.add(torso);

        // 3. 팔 (Limb mapping)
        const leftArmGeom = new THREE.BoxGeometry(0.25, 0.75, 0.25);
        const rightArmGeom = new THREE.BoxGeometry(0.25, 0.75, 0.25);

        // Specific limb mapping helper
        const setLimbUVs = (geom, u, v) => {
            for (let i = 0; i < 6; i++) this._setBoxFaceUVs(geom, i, u, v);
        };
        setLimbUVs(leftArmGeom, 0, 0);    // Left side skin
        setLimbUVs(rightArmGeom, 0.5, 0); // Right side skin

        const leftArm = new THREE.Group();
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.375, 1.5, 0);
        leftArm.rotation.x = -Math.PI / 2;
        group.add(leftArm);
        const leftArmMesh = new THREE.Mesh(leftArmGeom, torsoMat);
        leftArmMesh.position.y = -0.375;
        leftArmMesh.castShadow = true;
        leftArm.add(leftArmMesh);

        const rightArm = new THREE.Group();
        rightArm.name = 'rightArm';
        rightArm.position.set(0.375, 1.5, 0);
        rightArm.rotation.x = -Math.PI / 2;
        group.add(rightArm);
        const rightArmMesh = new THREE.Mesh(rightArmGeom, torsoMat);
        rightArmMesh.position.y = -0.375;
        rightArmMesh.castShadow = true;
        rightArm.add(rightArmMesh);

        // 4. 다리
        const leftLegGeom = new THREE.BoxGeometry(0.25, 0.75, 0.25);
        const rightLegGeom = new THREE.BoxGeometry(0.25, 0.75, 0.25);

        setLimbUVs(leftLegGeom, 0, 0);
        setLimbUVs(rightLegGeom, 0.5, 0);

        const leftLeg = new THREE.Group();
        leftLeg.name = 'leftLeg';
        leftLeg.position.set(-0.125, 0.75, 0);
        group.add(leftLeg);
        const leftLegMesh = new THREE.Mesh(leftLegGeom, pantsMat);
        leftLegMesh.position.y = -0.375;
        leftLegMesh.castShadow = true;
        leftLeg.add(leftLegMesh);

        const rightLeg = new THREE.Group();
        rightLeg.name = 'rightLeg';
        rightLeg.position.set(0.125, 0.75, 0);
        group.add(rightLeg);
        const rightLegMesh = new THREE.Mesh(rightLegGeom, pantsMat);
        rightLegMesh.position.y = -0.375;
        rightLegMesh.castShadow = true;
        rightLeg.add(rightLegMesh);

        return group;
    }

    static createWolf(options = {}) {
        const { color = 0xaa4444, scale = 0.35 } = options;
        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);

        // 정면(+Z)을 향하도록 기하구조 배치 (회전값 대신 배치로 정면 결정)
        const bodyGeom = new THREE.BoxGeometry(0.5, 0.6, 1.2); // Z축이 긺
        const bodyMat = new THREE.MeshStandardMaterial({ color, map: this.zombieSkinTex });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.set(0, 0.3, 0); // 높이 조절
        body.castShadow = true;
        group.add(body);

        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 0.6, 0.6); // 정면(+Z)에 머리 배치
        group.add(headGroup);

        const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), bodyMat);
        // Wolf head also needs orientation fix if bodyMat uses torso/head atlas
        // But wolf currently uses uniform zombieSkinTex. Applying same logic just in case:
        const headGeom = headMesh.geometry;
        this._setBoxFaceUVs(headGeom, 5, 0, 0.5); // Front
        this._setBoxFaceUVs(headGeom, 4, 0.5, 0.5); // Back

        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // 울프 다리 배치 (4개)
        const legGeom = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const legMat = bodyMat;

        const positions = [
            [-0.2, 0.2, 0.4], [0.2, 0.2, 0.4], // 앞다리
            [-0.2, 0.2, -0.4], [0.2, 0.2, -0.4] // 뒷다리
        ];

        positions.forEach((pos, i) => {
            const leg = new THREE.Mesh(legGeom, legMat);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.name = i < 2 ? (i === 0 ? 'frontLeftLeg' : 'frontRightLeg') : (i === 2 ? 'backLeftLeg' : 'backRightLeg');
            leg.castShadow = true;
            group.add(leg);
        });

        return group;
    }

    static createBasicCharacter(options = {}) {
        const { color = 0x77aa77, scale = 0.5 } = options;
        const group = new THREE.Group();
        group.scale.set(scale, scale, scale);
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color }));
        torso.position.y = 0.9;
        group.add(torso);
        return group;
    }
}
