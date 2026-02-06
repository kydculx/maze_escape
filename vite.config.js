import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // GitHub Pages 배포를 위한 상대 경로 설정
    server: {
        allowedHosts: true
    }
})
