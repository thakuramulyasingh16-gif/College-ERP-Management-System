const BASE_URL = "https://college-erp-management-system-a9xk.onrender.com/api";

export const getToken = () => {
  return localStorage.getItem("token") || "";
};

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the Bearer token from localStorage.
 * On 401 (expired/invalid/session-invalidated token), clears local storage
 * and redirects to /login with session error messaging.
 */
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
    ...(options.headers || {})
  };

  // Only add Content-Type if not already present and not FormData
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  } else if (headers["Content-Type"] === "multipart/form-data") {
    // Let the browser set Content-Type with boundary for FormData
    delete headers["Content-Type"];
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle 401: Unauthorized / Session Invalidated
    if (response.status === 401) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data && data.code === "SESSION_INVALIDATED") {
          sessionStorage.setItem(
            "session_invalidated_msg",
            data.message || "You have been logged out because your account was signed in from another device."
          );
        }
      } catch (e) {
        // Ignore json parse error on clone
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("teacher");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return response;
    }

    if (!response.ok) {
      console.warn(`Request to ${url} returned status ${response.status}`);
    }

    return response;
  } catch (err) {
    console.error(`authFetch Network Error for ${url}:`, err);
    throw err;
  }
};

export const fetchData = async (endpoint) => {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await authFetch(url);
    if (!res.ok) {
      console.error(`Fetch failed with status ${res.status} for ${endpoint}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("Fetch Error for", endpoint, ":", err);
    return [];
  }
};

export const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return '';
  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) return mediaPath;
  const token = getToken();
  const base = "https://college-erp-management-system-a9xk.onrender.com";
  const cleanPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
  return token ? `${base}${cleanPath}?token=${encodeURIComponent(token)}` : `${base}${cleanPath}`;
};
