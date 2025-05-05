// src/lib/auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";
import prisma from "./prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });

  return user;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true }
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    include: { role: true }
  });
}

export async function getUsersByDepartment(department: string) {
  return prisma.user.findMany({
    where: { team: { name: department } },
    include: { role: true, team: true }
  });
}

export async function getUsersByRole(roleName: string) {
  return prisma.user.findMany({
    where: { role: { name: roleName } },
    include: { role: true }
  });
}

export async function isAuthorized(userId: string, requiredRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });

  if (!user?.role) return false;

  const roleHierarchy = {
    'Staff': 1,
    'Manager': 2,
    'Leadership': 3,
    'Admin': 4
  };

  const userLevel = roleHierarchy[user.role.name] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}
