/** @type {import('tailwindcss').Config} */
export default {
  // ✅ Tailwind가 className을 찾을 파일 범위를 지정
  // 너무 좁으면(bg-blue-500 같은 클래스) CSS가 생성되지 않아서 "안 먹는 것처럼" 보임
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};