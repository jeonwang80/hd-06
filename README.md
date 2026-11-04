# AI WORKSPACE

## 회원 게시판

왼쪽 회원 게시판 메뉴에서 로그인 후 글을 읽고 작성할 수 있습니다. 제목 검색과 20개 단위 페이지 이동을 제공하며 본인 글 또는 관리자 권한으로 수정·삭제합니다. 글은 Supabase `posts` 테이블의 `board` 분류로 저장됩니다. 제목은 150자, 본문은 10,000자까지 입력합니다. `supabase-board.sql`은 기존 분류와 행을 유지하면서 게시판 분류를 추가합니다.

생성형 AI 업무자동화 전문가과정 2차수의 공개 Padlet 자료를 정리한 개인 학습 대시보드입니다.

- 사이트: https://jeonwang80.github.io/hd-06/
- 원본 자료: https://padlet.com/dreamitbiz/ai-2-https-padlet-com-dreamitbiz-build02-s0244frqwtwl5k2agd32
- 원본 교육 자료 작성·운영: 이애본 및 과정 참여자
- 자료 정리 기준일: 2026-11-04

## 사용하기

학습 홈에서 자료와 프로젝트를 확인하고, 자료 모아보기에서 일차·유형·검색어로 찾아볼 수 있습니다. 프로젝트 화면은 참여자의 프로젝트 소개와 공개된 결과물 링크를 제공합니다. 교육 일정은 원문에 안내된 6일의 날짜를 표시합니다.

북마크는 현재 브라우저의 localStorage에만 저장됩니다. 회원가입·로그인·회원정보는 Supabase Auth와 기존 profiles 테이블을 사용합니다. 학습 자료는 기존 JSON 파일로 관리합니다.

## 자료 수정하기

`dashboard-data.json`의 `resources`, `projects`, `schedule`, `sections`, `quickLinks`를 수정하면 화면에 반영됩니다. `meta.snapshotDate`도 자료를 확인한 날짜로 갱신합니다. 검색·필터 선택지는 데이터에서 생성됩니다.

이 사이트는 원문을 실시간으로 동기화하지 않습니다. 게시물은 제목과 요약 중심으로 정리했으며, 첨부파일과 최신 안내는 Padlet 원문에서 확인합니다. 만료되는 서명 첨부 URL, Zoom 접속 암호, 계좌번호와 개인 연락처는 게시 데이터에 넣지 않습니다. 게시자가 공유한 결과물의 동작·성능을 대시보드가 별도로 보증하지 않습니다.

## 로컬 실행

프로젝트 폴더에서 아래 명령을 실행한 뒤 http://localhost:8765 에 접속합니다. JSON을 불러오기 때문에 HTML 파일을 직접 더블클릭하는 대신 HTTP 서버를 사용합니다.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

정적 HTML/CSS/JavaScript로 구성되어 설치할 npm 패키지나 빌드 과정이 없습니다. GitHub Pages는 `main` 브랜치의 루트 폴더를 배포합니다.

## 파일

- `index.html`: 화면 구조와 메타데이터
- `dashboard.css`: 반응형 화면 스타일
- `dashboard.js`: 검색·필터·북마크·상세 창·일정
- `dashboard-data.json`: 공개 자료를 정리한 데이터

기존 저장소의 Git 이력을 보존하고 대시보드 화면과 데이터를 개편했습니다. 자료별 원문 링크를 통해 출처를 확인할 수 있습니다.

## 회원 기능

- Supabase 프로젝트: AI-EDU (`orywdthlnofrhhjietls`)
- 연결 설정: `supabase-config.js` (브라우저용 publishable 키만 포함)
- 화면: `auth.js`, `auth.css`
- 공식 SDK: `vendor/supabase.min.js`, @supabase/supabase-js 2.118.0, MIT 라이선스
- 권한 설정: `supabase-auth.sql` (2026-11-04 적용 및 권한 검증)

회원은 본인 이름과 소속만 수정할 수 있습니다. 역할과 사용자 ID는 브라우저에서 변경할 수 없습니다. 신규 가입 시 기존 DB 트리거가 회원 프로필을 생성합니다. 관리자 회원 조회·계정 처리는 Supabase Dashboard의 Authentication → Users 및 Table Editor → profiles에서 합니다.

메일 발송은 사용하지 않는 구성(`emailEnabled: false`)입니다. 비밀번호 분실 시 운영자에게 문의하도록 안내합니다. 사용자 승인에 따라 Supabase Authentication → Sign In / Providers의 Confirm email을 꺼서 이메일 인증 없이 즉시 가입하도록 설정했습니다. 이메일 소유 여부는 검증되지 않으므로 이메일 자체를 신원 확인의 근거로 사용하지 않습니다.

인증 URL은 `https://jeonwang80.github.io/hd-06/`로 등록합니다. 비밀번호 및 비밀 API 키를 저장소에 넣지 않습니다. 테스트는 실제 회원 생성·메일 발송 없이 화면과 mock SDK 흐름으로 수행합니다.
