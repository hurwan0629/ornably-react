/**
 * PageShell: 모든 페이지가 공통으로 쓰는 "뼈대"
 * - 제목(h1)은 스크린리더/SEO에 중요
 * - TODO는 백엔드와 맞출 API 명세를 적어두는 용도
 */
export default function PageShell({ title, todos = [] }) {
  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold">{title}</h1>

      {todos.length > 0 && (
        <section className="mt-3">
          <h2 className="sr-only">할 일</h2>
          <ul className="text-gray-600 list-disc pl-5 space-y-1">
            {todos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
