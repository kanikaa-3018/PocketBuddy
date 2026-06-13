import { apiRequest } from "./api/request.js";

export async function seedDemoData() {
  return apiRequest("/api/seed", {
    method: "POST",
  });
}
