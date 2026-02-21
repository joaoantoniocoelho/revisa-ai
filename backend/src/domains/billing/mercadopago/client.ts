import axios from "axios";

export const mercadoPagoClient = axios.create({
    baseURL: process.env.MP_API_BASE_URL,
    timeout: 10000,

    headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
    }
});     