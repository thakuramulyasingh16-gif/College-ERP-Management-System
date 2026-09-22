const BASE_URL = "https://college-erp-management-system-a9xk.onrender.com/api";

export const getToken = () => {
  return localStorage.getItem("token") || "";
};

export const authFetch = (url, options = {}) => {
  const token = getToken();
  const headers = {
    "Authorization": token ? `Bearer ${token}` : "",
    ...(options.headers || {})
  };

  // Only add Content-Type if not already present and not FormData
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  } else if (headers["Content-Type"] === 'multipart/form-data') {
    // For FormData, let the browser set the Content-Type with boundary
    delete headers["Content-Type"];
  }

  return fetch(url, {
    ...options,
    headers
  });
};

export const fetchData = async (endpoint) => {
  const url = `${BASE_URL}${endpoint}`;
  console.log("Fetching from:", url);
  try {
    const res = await authFetch(url);
    
    if (!res.ok) {
        console.error("Fetch failed with status:", res.status);
        return [];
    }
    
    const data = await res.json();
    console.log("Data received from", endpoint, ":", data);
    return data;
  } catch (err) {
    console.error("Fetch Error for", endpoint, ":", err);
    return [];
  }
};
