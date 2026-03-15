# ChatAssistX YouTube Live Chat Server

YouTube.js (youtubei.js) 라이브러리를 사용하여 유튜브 실시간 채팅을 가져오는 중계 서버입니다.

같은 채널에 여러 클라이언트가 동시에 접속하면 하나의 YouTube 채팅 세션을 공유하여 효율적으로 동작합니다.

## 설치

```bash
cd server
npm install
```

## 사용법

### 서버 실행

```bash
npm start
```

기본 포트는 8090이며, `PORT` 환경 변수로 변경 가능합니다.

```bash
PORT=9000 npm start
```

### ChatAssistX 연동

ChatAssistX 클라이언트 URL에 다음 파라미터를 추가합니다:

```
?ytChannel=@유튜브핸들&ytServer=your-domain.com
```

- `ytChannel` : 유튜브 채널 핸들(@handle), 채널 ID(UC...) 또는 영상 ID
- `ytServer` : 중계 서버 주소 (기본 프로토콜: wss://, ws:// 또는 wss:// 지정 가능)

### 예시

```
https://chatassistx.cc/?ytChannel=@YouTubeHandle&ytServer=your-domain.com
```

### nginx 설정 (Ubuntu 24.04)

`nginx.conf.example` 파일을 참고하여 nginx 리버스 프록시를 설정합니다:

```bash
# nginx 설치
sudo apt install nginx

# 설정 파일 복사 (your-domain.com을 실제 도메인으로 변경)
sudo cp nginx.conf.example /etc/nginx/sites-available/chatassistx-youtube
sudo ln -s /etc/nginx/sites-available/chatassistx-youtube /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL 인증서 설치 (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 재시도 동작

- **라이브 스트림 미발견/종료 시**: 서버가 `not_found` 또는 `ended` 메시지를 전송하고, 클라이언트가 30초 후 자동으로 재시도합니다.
- **WebSocket 연결 끊김 시**: 클라이언트가 5초 후 WebSocket 연결을 자동으로 재시도합니다.

## 서버-클라이언트 통신 프로토콜

### 클라이언트 → 서버

```json
{
  "type": "connect",
  "channel": "@YouTubeHandle"
}
```

### 서버 → 클라이언트

**일반 채팅:**
```json
{
  "type": "chat",
  "nickname": "사용자명",
  "message": "채팅 내용",
  "isOwner": false,
  "isMod": false,
  "isMember": false,
  "id": "채널ID"
}
```

**슈퍼챗:**
```json
{
  "type": "superchat",
  "nickname": "사용자명",
  "message": "채팅 내용",
  "amount": "₩5,000",
  "isOwner": false,
  "isMod": false,
  "id": "채널ID"
}
```

**정보:**
```json
{
  "type": "info",
  "message": "상태 메시지"
}
```

**오류:**
```json
{
  "type": "error",
  "message": "오류 메시지"
}
```

**라이브 스트림 미발견 (클라이언트가 재시도 필요):**
```json
{
  "type": "not_found",
  "message": "No active live stream found for this channel"
}
```

**라이브 스트림 종료 (클라이언트가 재시도 필요):**
```json
{
  "type": "ended",
  "message": "Live stream has ended"
}
```
