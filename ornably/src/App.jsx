import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import RouteLogger from "./app/routerLogger";

/**
 * App은 "라우터를 실행하는 컨테이너" 역할만 한다.
 * 페이지별 UI는 router가 결정한다.
 */
export default function App() {
  return (
  <RouterProvider router={router} />
  );
}
