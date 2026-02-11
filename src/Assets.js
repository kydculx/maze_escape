// 모든 에셋(이미지, 오디오)을 이곳에서 import하여 관리합니다.
// 이렇게 하면 다른 설정 파일들이 import 구문으로 지저분해지는 것을 방지할 수 있습니다.

// [Audio - BGM]
// [Audio - BGM]
const bgmUrl = new URL('./assets/audio/bgm_background.mp3', import.meta.url).href;

// [Audio - SFX]
const thunderSfxUrl = new URL('./assets/audio/eff_thunder.mp3', import.meta.url).href;
const rainBgsUrl = new URL('./assets/audio/eff_rain.mp3', import.meta.url).href;
const clickSfxUrl = new URL('./assets/audio/eff_click.mp3', import.meta.url).href;
const footstepSfxUrl = new URL('./assets/audio/eff_footstep.mp3', import.meta.url).href;
const jumpSfxUrl = new URL('./assets/audio/eff_jump.wav', import.meta.url).href;
const itemPickupSfxUrl = new URL('./assets/audio/eff_itemget.mp3', import.meta.url).href;
const zombiePatrolSfx = new URL('./assets/audio/eff_zombie_patrol.mp3', import.meta.url).href;
const zombieTrackSfx = new URL('./assets/audio/eff_zombie_track.mp3', import.meta.url).href;
const zombieAttackSfx = new URL('./assets/audio/eff_zombie_attack.mp3', import.meta.url).href;
const wolfPatrolSfx = new URL('./assets/audio/eff_wolf_patrol.mp3', import.meta.url).href;
const wolfTrackSfx = new URL('./assets/audio/eff_wolf_track.mp3', import.meta.url).href;
const wolfAttackSfx = new URL('./assets/audio/eff_wolf_attack.mp3', import.meta.url).href;

const flashlightSwitchSfxUrl = new URL('./assets/audio/eff_flashlight_switch.mp3', import.meta.url).href;
const sensorToggleSfxUrl = new URL('./assets/audio/eff_sensor_switch.mp3', import.meta.url).href;
const teleportSfxUrl = new URL('./assets/audio/eff_teleport.mp3', import.meta.url).href;
const hammerSfxUrl = new URL('./assets/audio/eff_hammer_smash.mp3', import.meta.url).href;
const trapSfxUrl = new URL('./assets/audio/eff_trap.mp3', import.meta.url).href;

// [Textures]
const wallBrickUrl = new URL('./assets/textures/wall_brick.png', import.meta.url).href;
const floorStoneUrl = new URL('./assets/textures/floor_stone.png', import.meta.url).href;

export const ASSETS = {
    AUDIO: {
        BGM: bgmUrl,
        SFX: {
            THUNDER: thunderSfxUrl,
            RAIN: rainBgsUrl,
            CLICK: clickSfxUrl,
            FOOTSTEP: footstepSfxUrl,
            JUMP: jumpSfxUrl,
            ITEM_PICKUP: itemPickupSfxUrl,
            ZOMBIE: {
                PATROL: zombiePatrolSfx,
                TRACK: zombieTrackSfx,
                ATTACK: zombieAttackSfx
            },
            WOLF: {
                PATROL: wolfPatrolSfx,
                TRACK: wolfTrackSfx,
                ATTACK: wolfAttackSfx
            },
            ITEM: {
                FLASHLIGHT: flashlightSwitchSfxUrl,
                SENSOR: sensorToggleSfxUrl,
                TELEPORT: teleportSfxUrl,
                HAMMER: hammerSfxUrl,
                TRAP: trapSfxUrl
            }
        }
    },
    TEXTURES: {
        WALL_BRICK: wallBrickUrl,
        FLOOR_STONE: floorStoneUrl
    }
};
