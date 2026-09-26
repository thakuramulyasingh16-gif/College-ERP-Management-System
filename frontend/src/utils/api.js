const BASE_URL = "https://college-erp-management-system-a9xk.onrender.com/api";

export const getToken = () => {
  return localStorage.getItem("token") || "";
};

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the Bearer token from localStorage.
 * On 401 (expired/invalid/blacklisted token), clears local storage
 * and redirects to /login so the user cannot stay on a protected page.
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

  const response = await fetch(url, { ...options, headers });

  // If the server rejects the token, force logout on the client side
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("teacher");
    // Hard redirect: ensures the page is fully unloaded and cannot be restored by Back
    window.location.replace("/login");
    return response;
  }

  return response;
};

export const fetchData = async (endpoint) => {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await authFetch(url);
    if (!res.ok) {
      console.error("Fetch failed with status:", res.status);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("Fetch Error for", endpoint, ":", err);
    return [];
  }
};
