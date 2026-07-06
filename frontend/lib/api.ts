import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

console.log("================================");
console.log("NEXT_PUBLIC_API_URL =", BASE_URL);
console.log("================================");

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;