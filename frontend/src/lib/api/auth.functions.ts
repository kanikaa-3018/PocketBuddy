import { apiRequest } from "./request.js";

export async function signUpFn({ data }: { data: any }) {
  return apiRequest("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signInWithPasswordFn({ data }: { data: any }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signInWithPhoneFn({ data }: { data: any }) {
  return apiRequest("/api/auth/login/phone", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function signOutFn({ data }: { data: { token: string } }) {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
