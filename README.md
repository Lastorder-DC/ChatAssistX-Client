# ChatAssistX Legacy
참고용으로 코드를 공개합니다. 코드 관련 문의 : lastorderdc@gmail.com

추가 개발은 이루어지지 않을 예정입니다. 코드 개선 요청도 이 브랜치에서는 받지 않습니다.

보안 취약점 관련 제보는 위 메일주소로 보내주세요.

간단 사용 주소 : https://chatassistx.vercel.app/?twitch=트위치아이디&list=디시콘목록

## 유튜브 라이브 채팅 연동

유튜브 채널의 라이브 채팅을 연동하려면 YouTube Data API v3 키가 필요합니다.

### API 키 발급 방법

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속하여 로그인합니다.
2. 새 프로젝트를 생성하거나 기존 프로젝트를 선택합니다.
3. 좌측 메뉴에서 **API 및 서비스** > **라이브러리**로 이동합니다.
4. **YouTube Data API v3**를 검색하여 **사용 설정**합니다.
5. **API 및 서비스** > **사용자 인증 정보**로 이동합니다.
6. **사용자 인증 정보 만들기** > **API 키**를 클릭하여 키를 발급받습니다.
7. (권장) 발급된 키를 클릭하여 **API 제한사항**에서 YouTube Data API v3만 선택하여 보안을 강화합니다.

### 사용 방법

URL 파라미터에 유튜브 채널 핸들과 API 키를 추가합니다:

```
https://chatassistx.vercel.app/?ytChannel=@채널핸들&ytApiKey=발급받은API키
```

#### 파라미터 설명

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `ytChannel` | 유튜브 채널 핸들(@로 시작) 또는 채널 ID | `@Funzinnu` |
| `ytApiKey` | YouTube Data API v3 키 | `AIzaSy...` |

#### 사용 예시

```
https://chatassistx.vercel.app/?ytChannel=@Funzinnu&ytApiKey=YOUR_API_KEY&list=디시콘목록
```

다른 플랫폼과 동시에 사용할 수도 있습니다:

```
https://chatassistx.vercel.app/?twitch=트위치아이디&ytChannel=@Funzinnu&ytApiKey=YOUR_API_KEY&list=디시콘목록
```

### 주의사항

- YouTube Data API v3는 일일 할당량(기본 10,000 유닛)이 있습니다.
- 채팅 폴링은 호출당 약 5 유닛을 소비하며, YouTube가 지정한 폴링 간격(보통 5~10초)에 따라 호출됩니다.
- 현재 진행중인 라이브 방송이 있어야 채팅 연동이 가능합니다.
- API 키는 URL에 노출되므로, Google Cloud Console에서 HTTP 리퍼러 제한을 설정하는 것을 권장합니다.
