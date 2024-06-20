export const findSafeById = async (user: TUser, safeId: string | undefined) => {
  return user.safes.find((safe) => safe._id?.toString() === safeId);
};

export const findFileById = async (
  user: TUser,
  safeId: string | undefined,
  fileId: string | undefined,
) => {
  const safe = (await findSafeById(user, safeId)) as TSafe;
  return safe.files?.find((file) => {
    return file._id?.toString() === fileId;
  });
};

export const findFileIndexById = async (
  user: TUser,
  safeId: string | undefined,
  fileId: string | undefined,
) => {
  const safe = (await findSafeById(user, safeId)) as TSafe;
  let index: number | undefined;
  safe.files?.find((file, idx) => {
    if (file._id?.toString() === fileId) index = idx;
    return file._id?.toString() === fileId;
  });
  return index;
};
