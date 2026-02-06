---
description: how to enable external access for the maze game
---

나중에 외부에서 접속하여 테스트하고 싶으실 때 다음 단계를 따라하시면 됩니다.

### 1단계: 개발 서버 실행
터미널에서 먼저 게임 서버를 실행합니다. (`--host` 옵션이 이미 `package.json`에 설정되어 있습니다.)

```bash
npm run dev
```

### 2단계: 외부 터널링 (다음 중 택 1)

**방법 A: Serveo (추천 - 별도 설치 불필요)**
가장 안정적이며 SSH만 있으면 됩니다.
```bash
ssh -o StrictHostKeyChecking=no -R 80:localhost:5173 serveo.net
```
*실행 후 화면에 나오는 `https://...serveousercontent.com` 주소로 접속하세요.*

**방법 B: LocalTunnel**
```bash
npx localtunnel --port 5173
```
*웹 페이지 접속 시 Tunnel Password를 물어보면 본인의 공인 IP(터미널에서 `curl ifconfig.me`로 확인 가능)를 입력하세요.*

**방법 C: Cloudflare Tunnel**
```bash
npx cloudflared tunnel --url http://localhost:5173
```

### 3단계: 종료 방법
테스트가 끝나면 터미널에서 `Ctrl + C`를 눌러 프로세스를 종료하시면 됩니다.
모든 관련 프로세스를 한 번에 강제 종료하려면 다음 명령어를 사용하세요:
```bash
killall node ssh cloudflared
```
