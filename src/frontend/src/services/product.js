import axios from 'axios';

const API_URL = 'http://localhost:8000' ;

export const getProduct = async () =>{
    const response = await axios.get(`${API_URL}/products`)
    console.log(response)
    console.log(response.data)
    return response
}

