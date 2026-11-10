import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

const client = axios.create({
  baseURL,
  timeout: 30000,
  headers: { Accept: "application/json" },
});

export const isApiConfigured = true;

export async function apiRequest(config) {
  try {
    const response = await client.request(config);
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || error.message || "The API request failed.";
    throw new Error(message);
  }
}
