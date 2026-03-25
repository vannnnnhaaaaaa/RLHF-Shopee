export const isCustomerLoggedIn = () => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    // Decode JWT token payload (without verification for frontend)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if user is customer and token is not expired
    return payload.auth === 'customer' && payload.exp > Date.now() / 1000;
  } catch (error) {
    console.error('Error checking customer login:', error);
    return false;
  }
};

export const getUserRole = () => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.auth;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};