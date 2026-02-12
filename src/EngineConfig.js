/**
 * 엔진/시스템 설정
 * (카메라, 환경, 조명, 오디오, 메뉴 오브젝트)
 */

import { ASSETS } from './Assets.js';

export const ENGINE_CONFIG = {
    // [1] 화면 및 렌더링 (Display & Rendering)
    RENDERER: {
        CLEAR_COLOR: 0x000000,        // 렌더링 배경 초기화 색상 (검정)
        ANTIALIAS: true,              // 계단 현상 제거 (안티앨리어싱) 활성화 여부
        PIXEL_RATIO: Math.min(window.devicePixelRatio, 2) // 픽셀 비율 제한 (고해상도에서의 성능 저하 방지, 최대 2배)
    },

    // [2] 환경 및 조명 (Environment & Lighting)
    ENVIRONMENT: {
        LIGHTING: {
            // 메뉴/스플래시 화면용 조명 설정
            MENU_AMBIENT: {
                COLOR: 0xffffff,      // 주변광 색상
                INTENSITY: 0.0       // 주변광 강도 (0~1)
            },
        },
        // 날씨 설정
        WEATHER: {
            RAIN: {
                ENABLED: true,
                COUNT: 3000,          // 비 입자 개수
                COLOR: 0xaaaaaa,      // 비 색상 (약간 회색)
                SPEED_Y: 25,          // 낙하 속도
                RANGE_X: 40,          // 생성 범위 X (플레이어 기준)
                RANGE_Z: 40,          // 생성 범위 Z (플레이어 기준)
                HEIGHT: 30,           // 생성 높이
                SIZE: 0.001,           // 빗줄기 굵기
                LENGTH: 0.5           // 빗줄기 길이
            },
            LIGHTNING: {
                ENABLED: true,
                COLOR: 0xffffff,      // 번개 빛 색상
                INTENSITY: 2.5,       // 번개 빛 강도 (순간적)
                INTERVAL_MIN: 15,     // 최소 간격 (초)
                INTERVAL_MAX: 30,     // 최대 간격 (초)
                DURATION: 0.2,        // 번개 지속 시간 (초)
                HEIGHT: 12            // 번개 생성 높이 (벽 높이 위)
            },
            FOG: {
                COLOR: 0x000000,      // 어두운 안개 색상 (비오는 날)
                NEAR: 2,
                FAR: 10               // 시야를 좁게 하여 공포감 조성
            }
        }
    },

    // [4] 사운드 리소스 및 설정 (Audio Assets)
    AUDIO: {
        DEFAULT_BGM_VOLUME: 0.4
    }
};
