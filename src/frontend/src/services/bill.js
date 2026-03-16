import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const billService = {
  createBill: async (billData) => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error("Vui lòng đăng nhập!");

    const response = await axios.post(`${API_URL}/bills/`, billData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(response)
    return response.data;
  }
};