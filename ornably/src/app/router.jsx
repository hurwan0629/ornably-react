import { createBrowserRouter } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";

import HomePage from "../pages/public/HomePage";
import ItemListPage from "../pages/public/ItemListPage";
import ItemDetailPage from "../pages/public/ItemDetailPage";

import LoginPage from "../pages/guest/LoginPage";
import SignupPage from "../pages/guest/SignupPage";

import OnboardPage from "../pages/onboard/OnboardPage";

import AccountPage from "../pages/user/AccountPage";
import AddressListPage from "../pages/user/AddressListPage";
import AddressCreatePage from "../pages/user/AddressCreatePage";
import CartPage from "../pages/user/CartPage";
import OrderListPage from "../pages/user/OrderListPage";
import OrderDetailPage from "../pages/user/OrderDetailPage";
import CheckoutPage from "../pages/user/CheckoutPage";
import WishlistPage from "../pages/user/WishlistPage";
import MyReviewsPage from "../pages/user/MyReviewsPage";
import ReviewWritePage from "../pages/user/ReviewWritePage";
import WithdrawPage from "../pages/user/WithdrawPage";

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
import NotFound404 from "../pages/error/404";
import RootError from "../pages/error/errorElement";

import Guard from "../auth/Gaurd";
import { ACCESS } from "../auth/routeAccess";
import GuestLayout from "../layouts/GuestLayout";

export const router = createBrowserRouter([
  { path: "/403", element: <Forbidden403 /> },

  // PUBLIC (block onboard) + UserLayout
  {
    element: (
      <Guard policy={ACCESS.PUBLIC_BLOCK_ONBOARD}>
        <PublicLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/items", element: <ItemListPage /> },
      { path: "/items/:type", element: <ItemListPage />},
      { path: "/item/:itemPk", element: <ItemDetailPage /> },
    ],
  },

  // USER ONLY + UserLayout
  {
    path: "/account",
    element: (
      <Guard policy={ACCESS.USER_ONLY}>
        <PublicLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { index: true, element: <AccountPage /> },
      { path: "address", element: <AddressListPage /> },
      { path: "address/new", element: <AddressCreatePage /> },
      { path: "review", element: <MyReviewsPage /> },
      { path: "withdraw", element: <WithdrawPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "order", element: <OrderListPage /> },
      { path: "order/:orderPk", element: <OrderDetailPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "wishlist", element: <WishlistPage /> },
      { path: "review/write", element: <ReviewWritePage /> },
    ],
  },

  // GUEST ONLY + PublicLayout
  {
    element: (
      <Guard policy={ACCESS.GUEST_ONLY}>
        <GuestLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
    ],
  },
  {
    element: (
      <Guard policy={ACCESS.GUEST_ONLY}>
        <AdminLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { path: "/admin/login", element: <AdminLoginPage /> },
    ],
  },

  // ONBOARD ONLY + PublicLayout
  {
    element: (
      <Guard policy={ACCESS.ONBOARD_ONLY}>
        <GuestLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [{ path: "/onboard", element: <OnboardPage /> }],
  },

  // ADMIN ONLY + AdminLayout
  {
    path: "/admin",
    element: (
      <Guard policy={ACCESS.ADMIN_ONLY}>
        <AdminLayout />
      </Guard>
    ),
    errorElement: <RootError />,
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: "item", element: <AdminItemSearchPage /> },
      { path: "item/new", element: <AdminItemRegistPage /> },
      { path: "item/:itemPk", element: <AdminItemManagePage /> },
      { path: "item/:itemPk/review", element: <AdminItemReviewsPage /> },
      { path: "account", element: <AdminAccountSearchPage /> },
      { path: "account/:accountPk", element: <AdminAccountManagePage /> },
      { path: "event", element: <AdminEventManagePage /> },
      { path: "event/new", element: <AdminEventRegistPage /> },
    ],
  },

  { path: "*", element: <NotFound404 /> },
]);
