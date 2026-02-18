/**
 * Container: 화면이 너무 넓어지지 않게 폭을 잡는 컴포넌트
 * 반응형에서 "깨짐"을 줄이는 가장 쉬운 방법 중 하나
 */
export default function Container({ children }) {
  return <div className="max-w-6xl mx-auto px-4">{children}</div>;
}
