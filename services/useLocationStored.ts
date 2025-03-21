import { useState, useCallback } from "react";
import axios from "axios";
import { StoredLocation } from "@/types/locationStored";


const BASE_URL = "https://sharemebackend.online/stored-locations";

const useStoredLocation = () => {
  const [loading, setLoading] = useState(false);
  const [storedLocations, setStoredLocations] = useState<StoredLocation[]>([]);
  const [storedLocation, setStoredLocation] = useState<StoredLocation | null>(null);

  // Fetch danh sách stored locations
  const fetchStoredLocations = useCallback(async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}?page=${page}&limit=${limit}`);
      setStoredLocations(response.data.content);
      return response.data.content;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách stored locations:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch stored location theo id
  const fetchStoredLocationById = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      setStoredLocation(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy stored location:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tạo mới stored location
  const createStoredLocation = useCallback(async (newLocation: Omit<StoredLocation, "id">) => {
    setLoading(true);
    try {
      const response = await axios.post(BASE_URL, newLocation);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi tạo stored location:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cập nhật stored location
  const updateStoredLocation = useCallback(async (id: number, updatedData: Partial<StoredLocation>) => {
    setLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật stored location:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Xóa stored location
  const deleteStoredLocation = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa stored location:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    storedLocations,
    storedLocation,
    fetchStoredLocations,
    fetchStoredLocationById,
    createStoredLocation,
    updateStoredLocation,
    deleteStoredLocation,
  };
};

export default useStoredLocation;
