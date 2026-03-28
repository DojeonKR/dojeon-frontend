# Dojeon React App

## 1) 프로젝트 개요
- React + TypeScript + Vite 기반의 모바일 우선 UI 데모
- 화면은 414px 기준 모바일 폭 중심으로 구성
- 현재 구현: 시작/로그인/회원가입 화면 전환 기반의 폼 UI

## 2) 현재 화면 구성
- `Splash` (예비 화면)
  - 보유 이미지 캐릭터 + 제목
- `Login`
  - 회색 프로필(원형)
  - Email / Password 입력
  - forgot password?
  - Login 버튼
  - Log in with Google 버튼
  - Sign up 링크(회원가입 화면 이동)
- `Signup`
  - 상단 뒤로가기 버튼
  - Sign Up 타이틀
  - Email, Create a password, Confirm password 입력
  - 이메일/비밀번호 유효성 메시지
  - 약관 체크 리스트 영역(체크 아이콘/문구)
  - Register 버튼

## 3) 구현 목표
- 화면 구성은 모바일 1칸 레이아웃 기준으로 일관되게 정렬
- 화면 간 전환 상태 기반으로 유지
- 회원가입 전용 유효성 검사 반영
- 추후 라우팅 연동 및 실제 인증 API 붙이기

## 4) 폴더 구조
- `src/main.tsx`
- `src/App.tsx`
  - 현재 화면 전환 상태(`login` / `signup` / `splash`) 관리
- `src/pages/SplashPage.tsx`, `src/pages/SplashPage.css`
- `src/pages/LoginPage.tsx`, `src/pages/LoginPage.css`
- `src/pages/SignupPage.tsx`, `src/pages/SignupPage.css`

## 5) 실행 방법
```bash
npm install
npm run dev
```

## 6) 빌드
```bash
npm run build
```

## 7) 테스트 전략 (TDD 적용 가이드)
프론트엔드도 TDD를 적용할 수 있다.
- TDD 권장 순서:
  1. 실패하는 테스트 작성
  2. 테스트 통과를 위한 최소 구현
  3. 리팩토링
- 단, UI는 픽셀 단위 검증보다는 “의도(요소 존재/상태 변화/제약 조건)” 중심으로 테스트

### 테스트 항목 제안
- `Email`/`Password` 입력 검증
  - 이메일 형식 검사
  - 비밀번호 최소 길이(8자)
  - 비밀번호 확인 일치 검사
- 화면 전환
  - `Sign up` 클릭 → 회원가입 화면 렌더
  - 뒤로가기 클릭 → 로그인 화면 복귀
- 필수 UI 표시
  - 각 화면의 주요 타이틀/버튼/문구 존재 확인

## 8) 구현 체크리스트
- [x] 모바일 폭 기준 루트 레이아웃 정리
- [x] 로그인 화면 구성
- [x] 회원가입 화면 구성
- [x] 회원가입 전환 버튼 및 뒤로가기 동작
- [x] 회원가입 유효성(메일/비밀번호/확인)
- [ ] 테스트 인프라(Vitest + React Testing Library) 도입
- [ ] 컴포넌트 단위 테스트 작성
- [ ] 실제 로그인/회원가입 API 연동
- [ ] 라우팅 적용(`react-router`) 및 URL 기반 화면 관리
- [ ] 접근성 보강(`aria`/레이블 연결, 키보드 탐색)

## 9) 다음 단계
1. 회원가입 체크 항목을 실제 동의 체크박스(필수/선택)로 전환
2. Register 버튼 활성화 조건 정교화(필수 항목 체크 여부)
3. 폼 상태관리 및 공통 Input 컴포넌트 분리
4. 테스트 코드 추가 후 CI 연동
