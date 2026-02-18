import axios from 'axios';

const ornablyAPI = axios.create({
  baseURL: "http://localhost:8088/api",
  timeout: 15000,
  withCredentials: true,
});

ornablyAPI.interceptors.request.use((config) => {
  console.log("==================================");
  console.log("ornablyAPI axios 요청 호출");
  console.log("config: [",config,"]");
  console.log("==================================");
  return config;
})

ornablyAPI.interceptors.response.use(
  (res) => {
    console.log("==================================");
    console.log("ornablyAPI axios 응답 성공");
    console.log("response: [",res,"]");
    console.log("==================================");
    return res;
  },
  (err) => {
    console.log("==================================");
    console.log("ornablyAPI axios 응답 에러");
    console.log("error: [",err,"]");
    console.log("==================================");
    // 에러로 취급 하기 위해 .reject() 사용
    return Promise.reject(err);
  }
)

export default ornablyAPI;