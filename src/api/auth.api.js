import api from "@/lib/axios";

/** POST /auth/register — { name, email, phone } -> OTP sent (fixed 123456 in dev) */
export const register = (body) => api.post("/auth/register", body);

/** POST /auth/register/otp-verify — { name, email, phone, otp } -> { user } */
export const verifyRegisterOtp = (body) =>
  api.post("/auth/register/otp-verify", body);

/** POST /auth/login — { phone } -> OTP sent */
export const login = (phone) => api.post("/auth/login", { phone });

/** POST /auth/login/otp-verify — { phone, otp } -> { user, token } */
export const verifyLoginOtp = (body) =>
  api.post("/auth/login/otp-verify", body);

/** POST /auth/register-password — { name, email, phone?, password } -> { user, token } */
export const registerWithPassword = (body) =>
  api.post("/auth/register-password", body);

/** POST /auth/login-password — { email, password } -> { user, token } */
export const loginWithPassword = (body) =>
  api.post("/auth/login-password", body);

/** GET /auth/me -> { user } */
export const getMe = () => api.get("/auth/me");
