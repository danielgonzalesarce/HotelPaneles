import { describe, it, expect, beforeEach } from 'vitest';
import { storage, resetStorageCacheForTests } from './storage';
import { RoomStatus, RoomType } from '../types';

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageCacheForTests();
  });

  describe('Rooms', () => {
    it('should initialize with default rooms if empty', () => {
      const rooms = storage.getRooms();
      expect(rooms.length).toBeGreaterThan(0);
      expect(rooms[0]).toHaveProperty('id');
      expect(rooms[0]).toHaveProperty('name');
    });

    it('should save and retrieve a room', () => {
      const newRoom = {
        id: 'test-room-1',
        number: '101',
        floor: '1',
        name: 'Test Room',
        type: RoomType.Standard,
        price: 100,
        capacity: 2,
        status: RoomStatus.Available,
        description: 'A test room',
        images: [],
        amenities: []
      };

      storage.saveRoom(newRoom);
      
      const rooms = storage.getRooms();
      const savedRoom = rooms.find(r => r.id === 'test-room-1');
      
      expect(savedRoom).toBeDefined();
      expect(savedRoom?.name).toBe('Test Room');
    });

    it('should update room status', () => {
      const rooms = storage.getRooms();
      const firstRoomId = rooms[0].id;
      
      storage.updateRoomStatus(firstRoomId, RoomStatus.Occupied);
      
      const updatedRooms = storage.getRooms();
      const updatedRoom = updatedRooms.find(r => r.id === firstRoomId);
      
      expect(updatedRoom?.status).toBe(RoomStatus.Occupied);
    });

    it('should delete a room', () => {
      // Create a new room first so it's not part of INITIAL_ROOMS
      const roomToDelete = {
        id: 'room-to-delete',
        number: '999',
        floor: '1',
        name: 'Temporary Room',
        type: RoomType.Standard,
        price: 50,
        capacity: 1,
        status: RoomStatus.Available,
        description: 'Will be deleted',
        images: [],
        amenities: []
      };
      storage.saveRoom(roomToDelete);

      const rooms = storage.getRooms();
      const initialCount = rooms.length;
      
      storage.deleteRoom('room-to-delete');
      
      const updatedRooms = storage.getRooms();
      expect(updatedRooms.length).toBe(initialCount - 1);
      expect(updatedRooms.find(r => r.id === 'room-to-delete')).toBeUndefined();
    });
  });

  describe('Auth', () => {
    it('should set and get current user', () => {
      const user = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        role: 'user' as const,
        createdAt: new Date().toISOString()
      };

      storage.setCurrentUser(user);
      
      const currentUser = storage.getCurrentUser();
      expect(currentUser).toEqual(user);
    });

    it('should clear current user when null is passed', () => {
      storage.setCurrentUser(null);
      expect(storage.getCurrentUser()).toBeNull();
    });
  });
});
