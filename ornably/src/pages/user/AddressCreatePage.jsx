import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getApiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "요청 중 오류가 발생했습니다."
  );
}

function validateForm({ addressName, addressPostalCode, addressRegion, addressDetail }) {
  if (!addressName?.trim()) return "배송지명을 입력해주세요.";
  if (!addressPostalCode?.trim()) return "우편번호를 입력해주세요. (주소 검색 필요)";
  if (!addressRegion?.trim()) return "주소(지역)를 입력해주세요. (주소 검색 필요)";
  if (!addressDetail?.trim()) return "상세주소를 입력해주세요.";
  return "";
}

export default function AddressCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    addressName: "",
    addressPostalCode: "",
    addressRegion: "",
    addressDetail: "",
  });

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [daumReady, setDaumReady] = useState(false);

  const canSubmit = useMemo(() => {
    return !validateForm(form) && !loading;
  }, [form, loading]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    console.log("다음 우편번호 스크립트 로드");
    // 다음 우편번호 스크립트 로드
    const id = "daum-postcode-script";
    if (document.getElementById(id)) {
      setDaumReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.async = true;
    s.onload = () => setDaumReady(true);
    s.onerror = () => setErrMsg("주소 검색 스크립트를 불러오지 못했습니다.");
    document.body.appendChild(s);
  },[]);

  const openAddressSearch = () => {
    setErrMsg("");
    setOkMsg("");

    if (!daumReady || !window?.daum?.Postcode) {
      setErrMsg("주소 검색 모듈이 로드되지 않았습니다. (Daum Postcode 스크립트 확인)");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        const zonecode = data?.zonecode ?? "";
        const roadAddr = data?.roadAddress ?? "";
        const jibunAddr = data?.jibunAddress ?? "";
        const region = roadAddr || jibunAddr || "";

        setForm((f) => ({
          ...f,
          addressPostalCode: zonecode,
          addressRegion: region,
        }));
      },
    }).open();
  };

  const submit = async () => {
    setErrMsg("");
    setOkMsg("");

    const v = validateForm(form);
    if (v) {
      setErrMsg(v);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/user/address/regist`,
        {
          addressName: form.addressName.trim(),
          addressPostalCode: form.addressPostalCode.trim(),
          addressRegion: form.addressRegion.trim(),
          addressDetail: form.addressDetail.trim(),
        },
        { withCredentials: true }
      );

      setOkMsg("배송지가 등록되었습니다.");
      setTimeout(() => navigate("/account/address"), 400);
    } catch (err) {
      setErrMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="py-8">
        {/* header */}
        <div className="rounded-3xl border bg-white shadow-sm p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-gray-900">배송지 등록</p>
            <p className="mt-1 text-sm text-gray-500">주소를 입력하고 배송지를 추가하세요.</p>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-11 px-4 rounded-2xl border bg-white text-gray-800 font-extrabold text-sm hover:border-gray-300 transition"
          >
            뒤로
          </button>
        </div>

        {/* alerts */}
        {!!errMsg && (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-extrabold text-rose-700">오류</p>
            <p className="mt-1 text-sm text-rose-700">{errMsg}</p>
          </div>
        )}
        {!!okMsg && (
          <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-extrabold text-emerald-700">완료</p>
            <p className="mt-1 text-sm text-emerald-700">{okMsg}</p>
          </div>
        )}

        {/* form */}
        <div className="mt-6 rounded-3xl border bg-white shadow-sm p-6">
          <p className="text-base font-extrabold text-gray-900">주소 정보</p>

          {/* 배송지명 */}
          <div className="mt-6">
            <label className="block text-sm font-extrabold text-gray-700">배송지명</label>
            <input
              value={form.addressName}
              onChange={(e) => setField("addressName", e.target.value)}
              placeholder="집 / 회사"
              className="mt-2 w-full h-12 rounded-2xl border px-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {/* 우편번호 + 주소검색 */}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-extrabold text-gray-700">우편번호</label>
              <input
                value={form.addressPostalCode}
                readOnly
                placeholder="우편번호"
                className="mt-2 w-full h-12 rounded-2xl border px-4 text-sm bg-gray-50 text-gray-700"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={openAddressSearch}
                className="w-full h-12 rounded-2xl border bg-white text-gray-900 font-extrabold text-sm hover:border-gray-300 transition"
              >
                주소 검색
              </button>
            </div>
          </div>

          {/* 주소(지역) */}
          <div className="mt-5">
            <label className="block text-sm font-extrabold text-gray-700">주소(지역)</label>
            <input
              value={form.addressRegion}
              readOnly
              placeholder="주소 검색 버튼을 눌러 선택"
              className="mt-2 w-full h-12 rounded-2xl border px-4 text-sm bg-gray-50 text-gray-700"
            />
          </div>

          {/* 상세주소 */}
          <div className="mt-5">
            <label className="block text-sm font-extrabold text-gray-700">상세주소</label>
            <input
              value={form.addressDetail}
              onChange={(e) => setField("addressDetail", e.target.value)}
              placeholder="상세주소"
              className="mt-2 w-full h-12 rounded-2xl border px-4 text-sm outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {/* submit */}
          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/account/address")}
              className="h-12 px-5 rounded-2xl border bg-white text-gray-900 font-extrabold text-sm hover:border-gray-300 transition"
            >
              목록으로
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={cx(
                "flex-1 h-12 rounded-2xl border font-extrabold text-sm transition",
                canSubmit
                  ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                  : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
              )}
            >
              {loading ? "등록 중..." : "배송지 등록"}
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
}
