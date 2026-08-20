import prisma from "../config/database.js";

// Service function to create a new mess
export const createMess = async ({ userId, name, description, address }) => {
  const messName = name.trim();

  const mess = await prisma.mess.create({
    data: {
      name: messName,
      description: description?.trim() || null,
      address: address?.trim() || null,

      memberships: {
        create: {
          userId,
          role: "MANAGER",
        },
      },
    },

    include: {
      memberships: {
        where: {
          userId,
        },
        select: {
          id: true,
          role: true,
          userId: true,
        },
      },
    },
  });

  return mess;
};

// Service function to get all messes for a user
export const getMyMesses = async (userId) => {
  const memberships = await prisma.messMember.findMany({
    where: {
      userId,
    },
    include: {
      mess: {
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return memberships.map((membership) => ({
    ...membership.mess,
    role: membership.role,
    membershipId: membership.id,
  }));
};

// Service function to get mess details for a user
export const getMessDetails = async (userId, messId) => {
  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
    select: {
      id: true,
      role: true,
      userId: true,
      messId: true,
    },
  });

  if (!membership) {
    const error = new Error("You are not a member of this mess");
    error.statusCode = 403;
    throw error;
  }

  const mess = await prisma.mess.findUnique({
    where: {
      id: messId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!mess) {
    const error = new Error("Mess not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...mess,
    membership: {
      id: membership.id,
      role: membership.role,
    },
  };
};

// Service function to update mess details
export const updateMess = async ({ messId, name, description, address }) => {
  const existingMess = await prisma.mess.findUnique({
    where: {
      id: messId,
    },
  });

  if (!existingMess) {
    const error = new Error("Mess not found");
    error.statusCode = 404;
    throw error;
  }

  const data = {};

  if (name !== undefined) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      const error = new Error("Mess name cannot be empty");
      error.statusCode = 400;
      throw error;
    }

    data.name = trimmedName;
  }

  if (description !== undefined) {
    data.description = description?.trim() || null;
  }

  if (address !== undefined) {
    data.address = address?.trim() || null;
  }

  const updatedMess = await prisma.mess.update({
    where: {
      id: messId,
    },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedMess;
};

// Service function to remove a member from a mess
export const removeMessMember = async ({ messId, userId, managerId }) => {
  if (userId === managerId) {
    const error = new Error("A manager cannot remove themselves from the mess");

    error.statusCode = 400;

    throw error;
  }

  const membership = await prisma.messMember.findUnique({
    where: {
      userId_messId: {
        userId,
        messId,
      },
    },
  });

  if (!membership) {
    const error = new Error("User is not a member of this mess");

    error.statusCode = 404;

    throw error;
  }

  await prisma.messMember.delete({
    where: {
      id: membership.id,
    },
  });
};
