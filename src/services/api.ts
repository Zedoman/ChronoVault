import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default {
  async getActivities(address: string) {
    const response = await axios.get(`${API_BASE_URL}/activity/${address}`);
    return response.data;
  },

  async getHeirs(address: string) {
    const response = await axios.get(`${API_BASE_URL}/heirs/${address}`);
    return response.data;
  },

  async addHeir(address: string, heirData: { heirAddress: string, share: number }) {
    const response = await axios.post(`${API_BASE_URL}/heirs/${address}`, heirData);
    return response.data;
  },

  async getRiddle(address: string) {
    // Simulated riddle endpoint
    const response = await axios.get(`${API_BASE_URL}/riddle/${address}`);
    return response.data;
  },

  async verifyRiddle(address: string, riddleData: { riddleId: string, answer: string }) {
    // Simulated riddle verification
    const response = await axios.post(`${API_BASE_URL}/riddle/verify/${address}`, riddleData);
    return response.data;
  }
};