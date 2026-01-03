import { Trip, User } from '../types';

const STORAGE_KEYS = {
  USER: 'rupaya_user',
  TRIPS: 'rupaya_trips',
};

export const StorageService = {
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  saveUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getTrips: (): Trip[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
    return data ? JSON.parse(data) : [];
  },

  saveTrips: (trips: Trip[]): void => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  },

  addTrip: (trip: Trip): void => {
    const trips = StorageService.getTrips();
    trips.unshift(trip);
    StorageService.saveTrips(trips);
  },

  updateTrip: (updatedTrip: Trip): void => {
    const trips = StorageService.getTrips();
    const index = trips.findIndex(t => t.id === updatedTrip.id);
    if (index !== -1) {
      trips[index] = updatedTrip;
      StorageService.saveTrips(trips);
    }
  }
};
