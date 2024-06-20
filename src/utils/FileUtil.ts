export const bucketFilePath = ({
  userId,
  safeId,
  fileId,
}: {
  userId: string;
  safeId: string;
  fileId: string;
}) => {
  return `${userId}/${safeId}/${fileId}`;
};
