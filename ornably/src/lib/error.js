export function getApiMessage(err, fallback = "요청 중 오류가 발생했습니다.") {
  console.log("==================================");
  console.log("에러 메시지 추출");
  console.log("err: ["+err+"]");
  console.log("==================================");

  const message =  
        err?.response?.data?.message
    ||  err?.message
    ||  fallback;

  return message;
}

export function getErrorInfo(err, fallback = "요청중 오류가 발생했습니다.") {
  console.log("==================================");
  console.log("에러 정보 추출");
  console.log("err: ["+err+"]");
  console.log("==================================");

  if (!err) return { status: 500, code: "UNKNOWN", message: fallback };

  // http상태 (4xx 5xx)
  const status = 
        err?.status
    ||  err?.response?.status
    ||  500;

  // 간단한 코드 (BAD_REQUEST NOT_FOUNT)
  const code = 
        err?.response?.data?.code
    ||  err?.code
    ||  err?.response?.statusText
    || "ERROR";
  
  const message =  
        err?.response?.data?.message
    ||  err?.message
    ||  fallback;

  return { status: status, code: code, message: message};
}