// This file contains authentication functionality for the anonymous feedback platform

import { type User } from './schema';

// Mock user data for demonstration
const mockUsers: User[] = [
  {
    id: "user-1",
    role: "staff",
    department: "Engineering",
    position: "Developer",
    priorityLevel: 1,
    email: "john.doe@company.com",
    name: "John Doe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "user-2",
    role: "manager",
    department: "Engineering",
    position: "Engineering Manager",
    priorityLevel: 2,
    email: "jane.smith@company.com",
    name: "Jane Smith",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "user-3",
    role: "executive",
    department: "Executive",
    position: "CTO",
    priorityLevel: 3,
    email: "michael.johnson@company.com",
    name: "Michael Johnson",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "user-4",
    role: "admin",
    department: "IT",
    position: "System Administrator",
    priorityLevel: 3,
    email: "admin@company.com",
    name: "Admin User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Authentication functions
export async function login(email: string, password: string): Promise<User | null> {
  // In a real implementation, this would verify credentials against a database
  // and use proper password hashing
  const user = mockUsers.find(user => user.email === email);
  return user || null;
}

export async function getCurrentUser(): Promise<User | null> {
  // In a real implementation, this would verify the session token
  // and return the current authenticated user
  return mockUsers[0]; // Return the first user for demonstration
}

export async function getUserById(id: string): Promise<User | null> {
  const user = mockUsers.find(user => user.id === id);
  return user || null;
}

export async function getAllUsers(): Promise<User[]> {
  return mockUsers;
}

export async function getUsersByDepartment(department: string): Promise<User[]> {
  return mockUsers.filter(user => user.department === department);
}

export async function getUsersByRole(role: 'staff' | 'manager' | 'executive' | 'admin'): Promise<User[]> {
  return mockUsers.filter(user => user.role === role);
}

export function isAuthorized(user: User, requiredRole: 'staff' | 'manager' | 'executive' | 'admin'): boolean {
  const roleHierarchy = {
    'staff': 1,
    'manager': 2,
    'executive': 3,
    'admin': 4
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}
