# 채팅별 연결 프로필 · 기본 + 예외

SillyTavern **1.18.0 / 1.19.0**용 독립 서드파티 UI 확장입니다. JS-Slash-Runner 없이 동작합니다.

기본 연결 프로필 B를 한 번 지정하면, 예외가 없는 기존/새 채팅은 전부 B를 사용합니다. 원하는 **개별 채팅**에만 연결 프로필 A를 지정하세요. 같은 캐릭터의 다른 채팅도 예외가 없으면 B입니다. 그룹 채팅도 해당 채팅의 메타데이터를 기준으로 동작합니다.

## 설치

1. ZIP을 풀어 `chat-profile-default` 폴더를 얻습니다.
2. SillyTavern 설치 폴더 안의 `data/<사용자 핸들>/extensions/`에 이 폴더를 넣습니다. 기본 계정은 보통 `data/default-user/extensions/`입니다. `chat-profile-default/manifest.json`이 바로 보여야 합니다. 폴더가 이중으로 중첩되지 않게 하세요.
3. SillyTavern 페이지를 새로고침합니다. 확장 관리에서 내장 **Connection Manager**가 켜져 있어야 합니다.
4. 채팅 입력창 옆 **요술봉 → 채팅별 연결 프로필**을 눌러 관리 창을 엽니다.

모든 사용자에게 설치하려면 `public/scripts/extensions/third-party/chat-profile-default/`에 넣을 수도 있습니다. 두 위치에 중복 설치하지 마세요. Docker에서는 컨테이너에 연결된 실제 데이터 폴더를 사용하세요. ZIP 파일 자체를 ‘확장 설치’ URL 칸에 넣는 방식은 아닙니다.

## 사용: B는 한 번, A는 필요한 채팅에만

1.1.0부터 관리 위치는 **채팅 입력창 옆 요술봉 → 채팅별 연결 프로필**입니다. 별도 창에서 설정하며 닫아도 자동 전환은 계속 동작합니다. 기본 B와 기존 채팅 예외를 다시 지정할 필요는 없습니다. 현재 열린 채팅 이름이 창 상단에 표시됩니다. 채팅이 없으면 예외 선택은 비활성화됩니다.

1. SillyTavern의 Connection Manager에서 사용할 연결 프로필 A와 B를 먼저 저장합니다. A/B는 예시 이름이며 실제 이름은 자유롭습니다.
2. 이 확장에서 **기본 연결 프로필 B**를 선택합니다. **자동 전환 사용**은 켜 둡니다.
3. 예외를 줄 채팅을 연 뒤 **현재 개별 채팅의 예외 A**를 선택합니다. 즉시 적용되고 해당 채팅에 저장됩니다.
4. 다른 채팅으로 이동하면 예외가 없는 한 기본 B로 돌아갑니다. 기존 채팅을 하나씩 설정할 필요가 없습니다.
5. 예외를 해제하려면 그 채팅에서 **예외 없음 → 기본 B 사용**을 선택합니다.

설정은 선택 즉시 저장 요청됩니다. 예외를 바꾼 직후에는 잠시 저장을 기다린 뒤 채팅을 이동하세요. 전환 중에는 상태에 `전환 중…`이 표시됩니다. 답변 생성은 전환이 끝나고 SillyTavern의 연결 상태가 정상인지 확인한 뒤 시작하세요. **현재 채팅에 적용**으로 현재 채팅의 규칙을 다시 확인할 수 있습니다.

## 동작과 주의점

- 제어 대상은 **연결 프로필(Connection Profile)**입니다. 생성 프리셋만을 선택하는 기능이 아닙니다. 다만 연결 프로필에 포함해 저장한 프리셋·모델·API 등의 항목은 SillyTavern의 기본 프로필 적용 동작에 따라 함께 바뀝니다. 프로필에서 제외한 항목은 이 확장이 별도로 채우지 않습니다.
- 기본 B는 사용자별 확장 설정에, 예외 A는 채팅 메타데이터에 **프로필 ID만** 저장합니다. API 키나 프로필 사본을 저장하거나 외부 서비스로 전송하지 않습니다. 실제 연결은 SillyTavern이 기존 설정대로 처리합니다.
- 프로필 이름을 바꿔도 같은 ID이면 유지됩니다. 삭제한 예외는 경고 후 기본 B로 대체합니다. 기본 B가 삭제되면 경고하고 전환을 중단하므로 다시 선택하세요. 기본 B를 지정하지 않았거나 자동 전환을 끈 경우 연결을 변경하지 않습니다.
- 채팅 복제/분기/내보내기에 메타데이터가 포함되면 예외 설정도 따라갈 수 있습니다. 다른 설치로 가져오면 프로필 ID가 다를 수 있으므로 다시 지정하세요.
- 채팅 진입·페이지 시작·설정 변경 시 규칙을 적용합니다. 수동으로 다른 프로필을 고르면 다음 채팅 이동 또는 **현재 채팅에 적용**까지 유지됩니다. 프로필 선택 표시가 이미 대상과 같으면 불필요한 재연결을 생략합니다. 선택 후 모델 등을 수동 수정한 경우 원본 프로필의 다시 불러오기 기능을 사용하세요.
- JS-Slash-Runner와 함께 설치할 수 있지만, `/profile`을 자동 실행하는 기존 스크립트나 다른 자동 전환 확장은 꺼 주세요. 여러 기능이 동시에 연결을 바꾸는 상황은 조정하지 않습니다.
- 빠른 채팅 이동은 순차 처리하여 최종 채팅의 규칙을 적용합니다. 이미 시작한 SillyTavern 내부 전환을 강제로 취소하지 않습니다. 이 확장은 생성 요청을 가로막거나 실패한 API 연결을 자동 복구하지 않습니다. 전환 오류 시 상태 메시지를 확인하세요.
- 1.0.2부터 채팅 변경 이벤트가 끝난 뒤 전환을 예약합니다. 연결 프로필의 정규식 설정이 채팅을 다시 불러와도 같은 전환 작업을 기다리며 멈추지 않습니다. 홈/최근 채팅처럼 열린 채팅이 없는 화면에서는 전환을 보류하고, 다음 실제 채팅에 들어갈 때 B 또는 예외 A를 적용합니다. 이는 [채팅 없는 화면에서 정규식 변경 시 안전 화면으로 이동하는 ST 문제](https://github.com/SillyTavern/SillyTavern/issues/5718)를 피하기 위한 동작입니다. 이미 진행 중인 내부 전환의 강제 취소까지 보장하지는 않습니다.
- 자동 전환을 끄면 현재 연결을 그대로 둡니다. 제거할 때는 확장을 비활성화하고 새로고침한 뒤 설치 폴더를 삭제하세요. 저장된 설정은 남을 수 있습니다.

## 확인한 공식 API / 소스

1.0.1에서는 [1.18.0 Connection Manager](https://github.com/SillyTavern/SillyTavern/blob/1.18.0/public/scripts/extensions/connection-manager/index.js)도 비교했습니다. 사용하는 연결 프로필 명령, 이벤트, context 필드와 activate 로딩이 존재하여 최소 지원 버전을 1.18.0으로 조정했습니다. 1.0.0의 버전 제한 오류가 표시되면 확장 관리에서 이 확장을 업데이트하고 페이지를 새로고침하세요.

2026-10-18 확인. release 브랜치의 버전과 1.19.0 태그를 기준으로 조사했습니다. 이후 SillyTavern 내부 API 변경 시 수정이 필요할 수 있습니다.

- [공식 UI 확장 문서](https://docs.sillytavern.app/for-contributors/writing-extensions/): manifest 의존성, `activate`, `getContext`, 영구 설정, 채팅 메타데이터.
- [1.19.0 st-context.js](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/scripts/st-context.js): `extensionSettings`, `chatMetadata`, `saveMetadata`, `saveSettingsDebounced`, `SlashCommandParser`.
- [1.19.0 events.js](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/scripts/events.js): `APP_READY`, `CHAT_CHANGED`, `CONNECTION_PROFILE_*`.
- [1.19.0 Connection Manager](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/scripts/extensions/connection-manager/index.js): `/profile await=true timeout=2000 프로필이름` 및 적용 완료 이벤트. 확장은 명령 문자열을 조립하지 않고 등록된 `/profile` 콜백에 이름을 리터럴 인수로 전달합니다. 이름 속 `|`, 따옴표, 매크로가 별도 명령으로 해석되지 않게 하기 위함입니다. 내부 콜백 접근은 향후 버전에서 바뀔 수 있습니다.

실제 사용자의 SillyTavern 서버와 API 계정에서 실접속 테스트한 것은 아닙니다. 포함한 `VALIDATION.ko.md`에서 검증 범위를 확인하세요.

라이선스: MIT (`LICENSE`).
