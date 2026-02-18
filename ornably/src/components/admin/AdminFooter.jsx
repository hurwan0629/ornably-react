import Container from "../common/Container";

export default function AdminFooter() {
  return (
    <footer className="mt-10 border-t border-gray-200 bg-white/60 backdrop-blur">
      <Container>
        <div className="py-6 text-sm text-gray-500 flex items-center justify-between">
          <span>© ORNABLY Admin</span>
          <span className="text-xs">관리자 시스템</span>
        </div>
      </Container>
    </footer>
  );
}
