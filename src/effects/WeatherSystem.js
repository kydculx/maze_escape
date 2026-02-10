import * as THREE from 'three';
import { CONFIG } from '../Config.js';

export class WeatherSystem {
    constructor(scene, camera, audioListener) {
        this.scene = scene;
        this.camera = camera;
        this.weatherConfig = CONFIG.ENVIRONMENT.WEATHER;

        // Rain properties
        this.rainSystem = null;
        this.rainGeo = null;
        this.rainMaterial = null;
        this.rainCount = this.weatherConfig.RAIN.COUNT;
        this.rainPositions = [];
        this.rainVelocities = [];

        // Lightning properties
        this.lightningLight = null;
        this.lightningTimer = 0;
        this.nextLightningTime = 0;
        this.isLightningActive = false;
        this.lightningDuration = 0.2;

        // Audio
        this.rainSound = null;
        this.thunderSound = null;
        this.audioListener = audioListener;

        this.init();
    }

    init() {
        if (this.weatherConfig.RAIN.ENABLED) {
            this.createRain();
        }
        if (this.weatherConfig.LIGHTNING.ENABLED) {
            this.createLightningEffect();
            this.nextLightningTime = this.getRandomLightningInterval();
        }
        // Initialize audio if listener is provided
        if (this.audioListener) {
            this.initAudio();
        }

        // Store original environment colors
        this.originalBackgroundColor = this.scene.background ? this.scene.background.clone() : new THREE.Color(0x000000);
        this.originalFogColor = this.scene.fog ? this.scene.fog.color.clone() : new THREE.Color(0x000000);
    }

    initAudio() {
        const audioLoader = new THREE.AudioLoader();

        // Rain Background Sound
        if (CONFIG.AUDIO.RAIN_BGS_URL) {
            this.rainSound = new THREE.Audio(this.audioListener);
            audioLoader.load(CONFIG.AUDIO.RAIN_BGS_URL, (buffer) => {
                this.rainSound.setBuffer(buffer);
                this.rainSound.setLoop(true);
                this.rainSound.setVolume(0.3);
                this.rainSound.play();
            });
        }

        // Thunder Sound Effect
        if (CONFIG.AUDIO.THUNDER_SFX_URL) {
            this.thunderSound = new THREE.Audio(this.audioListener);
            audioLoader.load(CONFIG.AUDIO.THUNDER_SFX_URL, (buffer) => {
                this.thunderSound.setBuffer(buffer);
                this.thunderSound.setVolume(1.0);
            });
        }
    }

    createRain() {
        const rainConfig = this.weatherConfig.RAIN;

        // Use a BoxGeometry for 3D rain drops (allows thickness)
        const geometry = new THREE.BoxGeometry(rainConfig.SIZE, rainConfig.LENGTH, rainConfig.SIZE);
        const material = new THREE.MeshBasicMaterial({
            color: rainConfig.COLOR,
            transparent: true,
            opacity: 0.6
        });

        this.rainSystem = new THREE.InstancedMesh(geometry, material, this.rainCount);
        this.rainSystem.name = 'weather-rain';
        this.rainSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        this.dummy = new THREE.Object3D();
        this.rainVelocities = [];

        for (let i = 0; i < this.rainCount; i++) {
            const x = (Math.random() - 0.5) * rainConfig.RANGE_X;
            const y = Math.random() * rainConfig.HEIGHT;
            const z = (Math.random() - 0.5) * rainConfig.RANGE_Z;

            this.dummy.position.set(x, y, z);
            this.dummy.updateMatrix();
            this.rainSystem.setMatrixAt(i, this.dummy.matrix);

            this.rainVelocities.push(rainConfig.SPEED_Y + Math.random() * 5);
        }

        this.scene.add(this.rainSystem);
    }

    createLightningEffect() {
        const lightConfig = this.weatherConfig.LIGHTNING;
        // Directional Light for global flash effect (PointLight was too local/weak)
        this.lightningLight = new THREE.DirectionalLight(lightConfig.COLOR, 0);
        this.lightningLight.position.set(0, 100, 0);
        this.scene.add(this.lightningLight);

        // Also add an ambient light flash for shadow lifting
        this.lightningAmbient = new THREE.AmbientLight(lightConfig.COLOR, 0);
        this.scene.add(this.lightningAmbient);
    }

    getRandomLightningInterval() {
        const min = this.weatherConfig.LIGHTNING.INTERVAL_MIN;
        const max = this.weatherConfig.LIGHTNING.INTERVAL_MAX;
        return Math.random() * (max - min) + min;
    }

    update(deltaTime, playerPosition) {
        // 1. Update Rain
        if (this.rainSystem && playerPosition) {
            const rainConfig = this.weatherConfig.RAIN;

            for (let i = 0; i < this.rainCount; i++) {
                this.rainSystem.getMatrixAt(i, this.dummy.matrix);
                this.dummy.position.setFromMatrixPosition(this.dummy.matrix);

                // Gravity
                this.dummy.position.y -= this.rainVelocities[i] * deltaTime;

                // Reset logic
                if (this.dummy.position.y < 0) {
                    this.dummy.position.y = rainConfig.HEIGHT;
                    this.dummy.position.x = playerPosition.x + (Math.random() - 0.5) * rainConfig.RANGE_X;
                    this.dummy.position.z = playerPosition.z + (Math.random() - 0.5) * rainConfig.RANGE_Z;
                }

                this.dummy.updateMatrix();
                this.rainSystem.setMatrixAt(i, this.dummy.matrix);
            }
            this.rainSystem.instanceMatrix.needsUpdate = true;
        }
        // Optional: Move the entire rain system to follow player tightly?
        // If we just reset particles around player, it creates a field of rain.
        // But if player moves fast, they might leave the field.
        // A better way for "infinite" rain is to wrap positions relative to player.
        // But strict wrapping can be visible. The reset-on-drop approach is usually good enough for moderate speeds.

        // 2. Update Lightning
        if (this.weatherConfig.LIGHTNING.ENABLED) {
            if (this.isLightningActive) {
                this.lightningTimer += deltaTime;

                // Lightning is currently striking (flash)
                if (this.lightningTimer >= this.lightningDuration) {
                    // End lightning
                    this.isLightningActive = false;
                    this.lightningTimer = 0;
                    this.nextLightningTime = this.getRandomLightningInterval();

                    // Reset Visuals
                    this.lightningLight.intensity = 0;
                    this.lightningAmbient.intensity = 0;
                    if (this.scene.background) this.scene.background.copy(this.originalBackgroundColor);
                    if (this.scene.fog) this.scene.fog.color.copy(this.originalFogColor);

                } else {
                    // Flicker effect
                    const intensity = Math.random() * this.weatherConfig.LIGHTNING.INTENSITY;
                    this.lightningLight.intensity = intensity;
                    this.lightningAmbient.intensity = intensity * 0.5;

                    // Flash Background & Fog
                    // Interpolate between original dark and bright flash color based on intensity
                    const flashColor = new THREE.Color(0x8899aa); // Blueish white flash
                    const factor = intensity / this.weatherConfig.LIGHTNING.INTENSITY; // 0.0 to 1.0

                    if (this.scene.background) {
                        this.scene.background.lerpColors(this.originalBackgroundColor, flashColor, factor * 0.5);
                    }
                    if (this.scene.fog) {
                        this.scene.fog.color.lerpColors(this.originalFogColor, flashColor, factor * 0.5);
                    }
                }
            } else {
                // Waiting for next strike
                this.lightningTimer += deltaTime;
                if (this.lightningTimer >= this.nextLightningTime) {
                    this.triggerLightning(playerPosition);
                }
            }
        }
    }

    triggerLightning(playerPosition) {
        this.isLightningActive = true;
        this.lightningTimer = 0;
        this.lightningDuration = this.weatherConfig.LIGHTNING.DURATION;

        // Initial Flash
        this.lightningLight.intensity = this.weatherConfig.LIGHTNING.INTENSITY;
        this.lightningAmbient.intensity = this.weatherConfig.LIGHTNING.INTENSITY * 0.5;

        // Position lightning roughly near player (Directional light pos invalidates shadows if changed too much, but for flash it's ok)
        // Actually keep directional light high up fixed

        // Sound
        if (this.thunderSound && !this.thunderSound.isPlaying) {
            if (this.thunderSound.context.state === 'running') {
                this.thunderSound.play();
            }
        }

        console.log('[Weather] Lightning triggered!');
    }

    stop() {
        if (this.rainSound && this.rainSound.isPlaying) this.rainSound.stop();
        if (this.thunderSound && this.thunderSound.isPlaying) this.thunderSound.stop();

        if (this.rainSystem) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.dispose();
            if (this.rainSystem.geometry) this.rainSystem.geometry.dispose();
            if (this.rainSystem.material) this.rainSystem.material.dispose();
        }
        if (this.lightningLight) {
            this.scene.remove(this.lightningLight);
        }
        if (this.lightningAmbient) {
            this.scene.remove(this.lightningAmbient);
        }
    }

    pause() {
        if (this.rainSound && this.rainSound.isPlaying) {
            this.rainSound.pause();
        }
        if (this.thunderSound && this.thunderSound.isPlaying) {
            this.thunderSound.pause();
        }
    }

    resume() {
        if (this.rainSound && !this.rainSound.isPlaying && this.weatherConfig.RAIN.ENABLED) {
            this.rainSound.play();
        }
        // Thunder doesn't resume automatically as it's an event, unless it was mid-play
        // But for simplicity, we just resume rain loop.
    }
}
