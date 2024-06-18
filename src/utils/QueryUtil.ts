export const findSafeById = async (user: TUser, safeId: string | undefined) => {
  return user.safes.find((safe) => safe._id?.toString() === safeId);
};
