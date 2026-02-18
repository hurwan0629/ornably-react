# Router & Guard 권한 설계 설명서

이 문서는 현재 프로젝트에서 사용 중인 **Router / Guard 기반 권한 제어 구조**를 이해하고, 유지보수·확장을 쉽게 하기 위한 설계 의도를 설명합니다.

---

## 1. 설계 목표

이 구조의 핵심 목표는 다음 3가지입니다.

1. **결합도 최소화**

   * router.jsx가 인증/권한 판정의 세부 로직을 알지 않도록 함

2. **응집도 최대화**

   * Guard는 “접근 가능 여부 판단 + 리다이렉트”라는 단일 책임만 가짐

3. **정책 중심 설계 (Policy-based Routing)**

   * URL 접근 규칙을 코드가 아닌 “정책 객체”로 선언적으로 관리

---

## 2. 전체 구조 한눈에 보기

```
AuthContext (로그인 상태, 역할)
        ↓
     Guard
        ↓ (policy 적용)
     Router
```

* **Router**: 어떤 URL에 어떤 정책을 쓸지만 선언
* **Guard**: 정책을 받아 실제 접근 가능 여부 판단
* **Policy**: 접근 규칙을 정의한 순수 데이터

---

## 3. 역할(Role) 정의

프론트엔드에서 사용하는 사용자 상태는 다음 4가지입니다.

| 구분      | 의미                 |
| ------- | ------------------ |
| NONE    | 비로그인 사용자 (게스트)     |
| ONBOARD | 소셜 로그인 후 추가 정보 미완성 |
| USER    | 일반 사용자             |
| ADMIN   | 관리자                |

> 이 역할 값들은 `AuthContext`에서 관리되며, Guard는 이를 **읽기만** 합니다.

---

## 4. routeAccess.js (접근 정책 정의)

### 4.1 정책 파일의 역할

`routeAccess.js`는 **“누가 어디에 접근할 수 있는지”**를 한 곳에 모아 관리하는 파일입니다.

* router.jsx는 이 정책 객체만 사용
* Guard는 정책 구조를 해석해서 동작

### 4.2 정책 기본 구조

```js
{
  mode: "public" | "guest" | "auth",
  allow?: [ROLE...],
  block?: [ROLE...],
  redirects?: {
    unauthed?: string,
    forbidden?: string,
    authed?: string
  }
}
```

### 4.3 mode 설명

| mode   | 의미                    |
| ------ | --------------------- |
| public | 누구나 접근 가능 (선택적 차단 가능) |
| guest  | 비로그인만 접근 가능           |
| auth   | 로그인 + 권한 검사 필요        |

---

### 4.4 기본 제공 정책 예시

#### PUBLIC_BLOCK_ONBOARD

* 홈, 상품 목록 등 공개 페이지
* 단, ONBOARD 사용자는 접근 차단

#### GUEST_ONLY

* 로그인 / 회원가입 페이지
* 이미 로그인한 사용자는 접근 불가

#### ONBOARD_ONLY

* 온보딩 페이지 전용

#### USER_ONLY

* 마이페이지, 주문, 장바구니 등

#### ADMIN_ONLY

* 관리자 페이지 전용

---

## 5. Guard 컴포넌트

### 5.1 Guard의 책임

Guard는 **딱 한 가지**만 합니다.

> “이 사용자가 이 정책을 만족하는가?”

그 결과에 따라:

* 통과 → children / Outlet 렌더링
* 실패 → Navigate로 리다이렉트

---

### 5.2 Guard 내부 흐름

1. AuthContext에서 현재 상태 조회
2. policy 기반 접근 판정
3. 결과에 따라:

   * allow → 화면 표시
   * redirect → 지정된 경로로 이동

> Guard는 **라우트 구조를 전혀 모름**

---

### 5.3 decideAccess 함수

`decideAccess()`는 순수 함수로 설계됨

특징:

* 외부 상태 변경 없음
* 테스트 가능
* 정책 추가 시 Guard 수정 필요 없음

반환 타입:

| type     | 의미         |
| -------- | ---------- |
| loading  | 인증 상태 확인 중 |
| allow    | 접근 허용      |
| redirect | 특정 경로로 이동  |

---

## 6. router.jsx 설계 방식

### 6.1 router.jsx의 역할

router.jsx는 다음만 담당합니다.

* URL 구조 정의
* 어떤 레이아웃을 쓰는지
* 어떤 정책을 적용하는지

> ❌ 인증/권한 로직 직접 작성 금지

---

### 6.2 정책 적용 예시

```jsx
{
  element: (
    <Guard policy={ACCESS.USER_ONLY}>
      <UserLayout />
    </Guard>
  ),
  children: [ ... ]
}
```

이 구조의 의미:

* 이 라우트 트리 전체는 USER_ONLY 정책 적용
* 개별 페이지에서는 권한을 신경 쓸 필요 없음

---

## 7. 이 구조의 장점 요약

### 유지보수 관점

* 권한 변경 → routeAccess.js만 수정
* 라우트 추가 → router.jsx만 수정

### 확장 관점

* 새로운 역할 추가 가능
* 새로운 정책 조합 가능

### 협업 관점

* 기획자/백엔드와 접근 규칙 논의 시 정책 파일만 공유 가능

---

## 8. 확장 시 권장 패턴

* 정책 팩토리 함수 도입
* 역할 문자열 normalize
* 서버 권한과 프론트 권한 매핑 분리

---

## 9. 한 문장 요약

> **Router는 선언만, Guard는 판단만, 정책은 규칙만 가진다.**

이 원칙을 지키면 구조는 오래간다.
