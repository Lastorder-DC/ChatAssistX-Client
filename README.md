# ChatAssistX Legacy

## 설정 페이지

URL 파라미터를 직접 입력하지 않고도 아래 설정 페이지에서 간편하게 설정할 수 있습니다.

**설정 페이지 주소 : https://chatassistx.cc/config.html**

설정을 완료하면 생성된 URL을 복사하여 OBS 등의 브라우저 소스에 붙여넣으면 됩니다.

## URL 파라미터 설명

직접 URL을 구성하려면 아래 표를 참고하세요.

### 플랫폼 설정

| 파라미터 | 설명 | 기본값 | 예시 |
|---|---|---|---|
| `twitch` | Twitch 채널명 | _(없음)_ | `twitch=lastorder_dc` |
| `kick` | Kick 스트리머 아이디 | _(없음)_ | `kick=streamerid` |
| `ytChannel` | YouTube 채널 핸들(@) 또는 채널 ID | _(없음)_ | `ytChannel=@channelname` |
| `ytServer` | YouTube 라이브 채팅 중계 서버 주소 | _(없음)_ | `ytServer=wss://example.com` |
| `nvrChannel` | 치지직(Chzzk) 채널 ID (베타) | _(없음)_ | `nvrChannel=channelid` |
| `cime` | ci.me 스트리머 채널 ID | _(없음)_ | `cime=channelid` |

### 이모티콘 및 미디어 설정

| 파라미터 | 설명 | 기본값 | 예시 |
|---|---|---|---|
| `list` | 이모티콘 목록 URL (JS 또는 JSON) | _(없음)_ | `list=https://example.com/emoticons.js` |
| `allowEmoticon` | 디시콘 이모티콘 사용 여부 | `true` | `allowEmoticon=false` |
| `ignoreMQEmoticon` | 마퀴태그 + 이모티콘 동시 사용 방지 | `true` | `ignoreMQEmoticon=false` |
| `allowExternalSource` | 외부 이미지(`[img 주소]` 문법) 허용 | `false` | `allowExternalSource=true` |
| `enableTwitchEmoticon` | 트위치 이모티콘 사용 여부 | `true` | `enableTwitchEmoticon=false` |
| `TwitchEmoticonsize` | 트위치 이모티콘 크기 배율 | `1.0` | `TwitchEmoticonsize=2.0` |
| `TwitchEmoticonMode` | 트위치 이모티콘 테마 (`light` / `dark`) | `light` | `TwitchEmoticonMode=dark` |

### 채팅 필터링 설정

| 파라미터 | 설명 | 기본값 | 예시 |
|---|---|---|---|
| `ignoreNickname` | 필터링할 닉네임 목록 (쉼표 구분) | `nightbot,twipkr` | `ignoreNickname=nightbot,twipkr,bot1` |
| `replace` | 단어 치환 규칙 (`원래\|치환` 형식, 쉼표 구분) | _(없음)_ | `replace=나쁜말\|***,금지어\|ㅁㅁ` |

### 익명화 설정

| 파라미터 | 설명 | 기본값 | 예시 |
|---|---|---|---|
| `anon` | 닉네임 익명화 활성화 | `false` | `anon=true` |
| `anon_nickname` | 익명화 시 표시할 기본 닉네임 | _(없음)_ | `anon_nickname=시청자` |
| `anon_random` | 랜덤 접미사 유형 (`string` / `number` / `false`) | `string` | `anon_random=number` |
| `random_length` | 랜덤 접미사 길이 | `4` | `random_length=6` |
| `fix_random_id` | 같은 시청자에게 같은 랜덤 값 고정 (새로고침 시 초기화) | `false` | `fix_random_id=true` |

## 채팅 명령어

스트리머와 모더레이터가 채팅에서 사용할 수 있는 `~` 명령어입니다.

> **참고:** Twitch에서는 스트리머만 명령어를 사용할 수 있습니다. 치지직(Chzzk), ci.me, YouTube에서는 스트리머와 모더레이터 모두 사용 가능합니다.

| 명령어 | 설명 | 사용 예시 |
|---|---|---|
| `~채팅초기화` | 화면의 모든 채팅 메시지를 삭제합니다. | `~채팅초기화` |
| `~이미지 켜기` | 외부 이미지(`[img 주소]`) 문법을 활성화합니다. | `~이미지 켜기` |
| `~이미지 끄기` | 외부 이미지 문법을 비활성화합니다. | `~이미지 끄기` |
| `~이모티콘 켜기` | 디시콘 이모티콘 표시를 활성화합니다. | `~이모티콘 켜기` |
| `~이모티콘 끄기` | 디시콘 이모티콘 표시를 비활성화합니다. | `~이모티콘 끄기` |
| `~테마 {테마이름}` | 내장 테마를 적용합니다. | `~테마 grey_round` |
| `~테마 {CSS URL}` | 외부 CSS 파일을 테마로 적용합니다. (`.css` 확장자만 허용) | `~테마 https://example.com/my_theme.css` |
| `~테마 초기화` | 적용된 테마를 제거하고 기본 스타일로 되돌립니다. | `~테마 초기화` |

> `켜기` 대신 `활성화`, `온`도 사용 가능하며, `끄기` 대신 `비활성화`, `오프`도 사용 가능합니다.

### 내장 테마 목록

| 테마 이름 | 설명 |
|---|---|
| `grey_round` | 유리 질감 다크 모던 스타일 |
| `light_clean` | 밝은색 배경의 깔끔한 스타일 |
| `gaming` | 네온 글로우 게이밍 스타일 |
| `memo` | 메모지 / 포스트잇 스타일 |
| `retro_terminal` | 고전 컴퓨터 터미널 스타일 |
