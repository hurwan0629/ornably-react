import { createBrowserRouter } from "react-router-dom";

import UserLayout from "../layouts/UserLayout";
import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";

// ===== EVERYONE (공개) =====
import HomePage from "../pages/public/HomePage";
import ItemListPage from "../pages/public/ItemListPage";
import ItemDetailPage from "../pages/public/ItemDetailPage";
import AlarmPage from "../pages/public/AlarmPage";

// ===== NONE (비로그인 전용) =====
import LoginPage from "../pages/guest/LoginPage";
import SignupPage from "../pages/guest/SignupPage";

// ===== ONBOARD =====
import OnboardPage from "../pages/onboard/OnboardPage";

// ===== USER =====
import AccountPage from "../pages/user/AccountPage";
import AddressListPage from "../pages/user/AddressListPage";
import AddressCreatePage from "../pages/user/AddressCreatePage";
import CartPage from "../pages/user/CartPage";
import OrderListPage from "../pages/user/OrderListPage";
import OrderDetailPage from "../pages/user/OrderDetailPage";
import CheckoutPage from "../pages/user/CheckoutPage";
import CheckoutSuccessPage from "../pages/user/CheckoutSuccessPage";
import CheckoutFailPage from "../pages/user/CheckoutFailPage";
import WishlistPage from "../pages/user/WishlistPage";
import MyReviewsPage from "../pages/user/MyReviewsPage";
import ReviewWritePage from "../pages/user/ReviewWritePage";
import WithdrawPage from "../pages/user/WithdrawPage";

// ===== ADMIN =====
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import AdminHomePage from "../pages/admin/AdminHomePage";
import AdminItemSearchPage from "../pages/admin/AdminItemSearchPage";
import AdminItemRegistPage from "../pages/admin/AdminItemRegistPage";
import AdminItemManagePage from "../pages/admin/AdminItemManagePage";
import AdminItemReviewsPage from "../pages/admin/AdminItemReviewsPage";
import AdminAccountSearchPage from "../pages/admin/AdminAccountSearchPage";
import AdminAccountManagePage from "../pages/admin/AdminAccountManagePage";
import AdminEventManagePage from "../pages/admin/AdminEventManagePage";
import AdminEventRegistPage from "../pages/admin/AdminEventRegistPage";

import Forbidden403 from "../pages/error/403";
import RootError from "../pages/error/errorElement"

// ✅ 여기만 바뀜
import Guard from "../auth/Gaurd";


export const router = createBrowserRouter([
  { path: "/403", element: <Forbidden403 /> },

  // ONBOARD를 제외한 권한(= ONBOARD면 튕김) + UserLayout
  {
    element: (
      <Guard block={["ONBOARD"]} redirectForbiddenTo="/403">
        <UserLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/items", element: <ItemListPage /> },
      { path: "/items/:itemId", element: <ItemDetailPage /> },
      { path: "/alarms", element: <AlarmPage /> },
    ],
  },

  // USER 전용 + UserLayout
  {
    element: (
      <Guard auth allow={["USER"]}>
        <UserLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/account", element: <AccountPage /> },
      { path: "/account/addresses", element: <AddressListPage /> },
      { path: "/account/addresses/new", element: <AddressCreatePage /> },
      { path: "/account/reviews", element: <MyReviewsPage /> },
      { path: "/account/withdraw", element: <WithdrawPage /> },
      { path: "/cart", element: <CartPage /> },
      { path: "/orders", element: <OrderListPage /> },
      { path: "/orders/:orderId", element: <OrderDetailPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/checkout/success", element: <CheckoutSuccessPage /> },
      { path: "/checkout/fail", element: <CheckoutFailPage /> },
      { path: "/wishlist", element: <WishlistPage /> },
      { path: "/reviews/new", element: <ReviewWritePage /> },
    ],
  },

  // 비로그인 전용 + PublicLayout
  {
    element: (
      <Guard guest redirectAuthedTo="/">
        <PublicLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/auth/signup", element: <SignupPage /> },
      { path: "/admin/login", element: <AdminLoginPage /> },
    ],
  },

  // ONBOARD 전용 + PublicLayout
  {
    element: (
      <Guard auth allow={["ONBOARD"]}>
        <PublicLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [{ path: "/onboard", element: <OnboardPage /> }],
  },

  // ADMIN 전용 + AdminLayout
  {
    path: "/admin",
    element: (
      <Guard auth allow={["ADMIN"]}>
        <AdminLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { index: true, element: <AdminHomePage /> },

      { path: "items", element: <AdminItemSearchPage /> },
      { path: "items/new", element: <AdminItemRegistPage /> },
      { path: "items/:itemId", element: <AdminItemManagePage /> },
      { path: "items/:itemId/reviews", element: <AdminItemReviewsPage /> },

      { path: "accounts", element: <AdminAccountSearchPage /> },
      { path: "accounts/:accountId", element: <AdminAccountManagePage /> },

      { path: "events", element: <AdminEventManagePage /> },
      { path: "events/new", element: <AdminEventRegistPage /> },
    ],
  },
  { path: "*", element: <Forbidden403 /> },
]);
