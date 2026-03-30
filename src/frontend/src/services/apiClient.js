/**
 * API Client with Automatic Authorization Headers
 * Handles all authenticated API requests to FastAPI backend
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Fetch wrapper that automatically adds Authorization header
 * @param {string} endpoint - API endpoint path (e.g., '/available')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
export const authorizedFetch = async (endpoint, options = {}) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Build headers with Authorization
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Bearer token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`[API] Sending request to ${endpoint} with token`);
  } else {
    console.warn(`[API] No token found in localStorage for ${endpoint}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Log response status
    console.log(`[API] ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);

    // Handle 401 Unauthorized - Token expired or invalid
    if (response.status === 401) {
      console.error('[API] 401 Unauthorized - Clearing credentials');
      localStorage.removeItem('token');
      localStorage.removeItem('auth');
      localStorage.removeItem('user_id');
      // Optionally redirect to login
      window.location.href = '/shope_rlhf/login';
      return response;
    }

    // Handle 403 Forbidden - User doesn't have permission
    if (response.status === 403) {
      console.error('[API] 403 Forbidden - User does not have required permissions');
      const errorData = await response.json();
      console.error('[API] Error details:', errorData);
      // Optionally redirect to login
      window.location.href = '/shope_rlhf/login';
      return response;
    }

    return response;
  } catch (error) {
    console.error('[API] Network error:', error);
    throw error;
  }
};

/**
 * GET request with Authorization
 */
export const apiGet = async (endpoint) => {
  return authorizedFetch(endpoint, {
    method: 'GET',
  });
};

/**
 * POST request with Authorization
 */
export const apiPost = async (endpoint, body = {}) => {
  return authorizedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

/**
 * PUT request with Authorization
 */
export const apiPut = async (endpoint, body = {}) => {
  return authorizedFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

/**
 * PATCH request with Authorization
 */
export const apiPatch = async (endpoint, body = {}) => {
  return authorizedFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

/**
 * DELETE request with Authorization
 */
export const apiDelete = async (endpoint) => {
  return authorizedFetch(endpoint, {
    method: 'DELETE',
  });
};

export default {
  authorizedFetch,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
};
