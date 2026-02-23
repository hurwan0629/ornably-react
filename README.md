# 오너블리 프론트

React + Vite 기반 오너블리 온라인 쇼핑몰 프론트엔드 프로젝트

사용자 페이지와 관리자 페이지를 포함하며  
REST API 서버와 연동하여 인증, 상품 조회, 관리자 기능 등을 제공합니다.

---

## 📌 프로젝트 개요

- React 기반 SPA 쇼핑몰 프론트엔드
- 사용자 권한에 따른 페이지 접근 제어
- 관리자 상품 / 회원 / 이벤트 관리 UI 제공
- REST API 서버와 연동

---

## 🛠 기술 스택

- React
- Vite
- React Router
- Context API
- Axios

---

## 📁 프로젝트 구조

src/
 ┣ app/            # 라우터 및 전역 설정
 ┣ components/     # 공통 UI 컴포넌트
 ┣ pages/          # 사용자 / 관리자 페이지
 ┣ lib/            # API 통신 모듈
 ┗ assets/         # 스타일 및 리소스

---

## 🚀 실행 방법

1. 리액트 프로젝트 설치
npm create vite@latest
2. 저장소 클론
git clone https://github.com/hurwan0629/ornably-react
3. 의존성 설치
npm ci
4. 개발 서버 실행
npm run dev
5. 브라우저 접속
http://localhost:5173

---

## 🔑 주요 기능

- 사용자 로그인 / 회원가입 UI
- 권한 기반 페이지 라우팅
- 관리자 대시보드
- 상품 / 회원 / 이벤트 관리 화면
- REST API 연동

---

## 📌 참고

본 프로젝트는 Ornably 쇼핑몰 백엔드와 연동하여 동작합니다.
[백엔드 프로젝트 링크](https://github.com/hurwan0629/ornably)

---

## 제작자
- 허완
