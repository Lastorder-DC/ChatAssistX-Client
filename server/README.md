# ChatAssistX YouTube Live Chat Server

YouTube.js (youtubei.js) 라이브러리를 사용하여 유튜브 실시간 채팅을 가져오는 중계 서버입니다.

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
?ytChannel=@유튜브핸들&ytServer=localhost:8090
```

- `ytChannel` : 유튜브 채널 핸들(@handle), 채널 ID(UC...) 또는 영상 ID
- `ytServer` : 중계 서버 주소 (ws:// 또는 wss:// 프로토콜 포함 가능)

### 예시

```
https://chatassistx.vercel.app/?ytChannel=@YouTubeHandle&ytServer=ws://localhost:8090
```

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

**정보/오류:**
```json
{
  "type": "info",
  "message": "상태 메시지"
}
```
```json
{
  "type": "error",
  "message": "오류 메시지"
}
```
