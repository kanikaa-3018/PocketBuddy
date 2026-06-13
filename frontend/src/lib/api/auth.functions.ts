import { apiRequest } from "./request.js";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
};

type AuthFallback = Partial<AuthUser>;

function normalizeUser(user: any, fallback: AuthFallback = {}): AuthUser | null {
  const id = user?.id ?? user?._id ?? fallback.id;
  const email = user?.email ?? fallback.email;

  if (!id || !email) return null;

  return {
    id,
    email,
    fullName:
      user?.fullName ??
      user?.full_name ??
      fallback.fullName ??
      email,
    phone: user?.phone ?? fallback.phone ?? null,
  };
}

async function fetchUserWithToken(token: string, fallback: AuthFallback): Promise<AuthUser | null> {
  try {
    const result = await apiRequest("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeUser(result?.user, fallback);
  } catch {
    return normalizeUser(fallback, fallback);
  }
}

async function normalizeAuthResult(result: any, fallback: AuthFallback) {
  const sessionToken = result?.sessionToken ?? result?.token ?? result?.access_token;
  const user = normalizeUser(result?.user, fallback) ??
    (sessionToken ? await fetchUserWithToken(sessionToken, fallback) : null);

  return {
    ...result,
    sessionToken,
    user,
  };
}

export async function signUpFn({ data }: { data: any }) {
  const result = await apiRequest("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return normalizeAuthResult(result, {
    email: data.email,
    fullName: data.fullName,
    phone: data.phone ?? null,
  });
}

export async function signInWithPasswordFn({ data }: { data: any }) {
  const result = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return normalizeAuthResult(result, {
    email: data.email,
  });
}

export async function signInWithPhoneFn({ data }: { data: any }) {
  const result = await apiRequest("/api/auth/login/phone", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return normalizeAuthResult(result, {
    email: data.email,
    fullName: data.fullName,
    phone: data.phone ?? null,
  });
}

export async function signOutFn({ data }: { data: { token: string } }) {
  return apiRequest("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
