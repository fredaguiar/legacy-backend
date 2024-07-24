import textract from 'textract';
import pdf from 'pdf-parse';

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

export const extractText = async (buffer: Buffer, mimetype: string) => {
  if (mimetype.includes('application/pdf')) {
    const pdfData = await pdf(buffer);
    return pdfData.text;
  }

  const textExtractTypes = [
    'officedocument',
    'msword',
    'ms-excel',
    'ms-powerpoint',
    'rtf',
    'text/plain',
    'text/html',
    'text/markdown',
    'text/editor',
    'epub+zip',
    'opendocument',
  ];

  const isTextExtractType = textExtractTypes.some((type) => type.includes(mimetype));
  if (isTextExtractType) {
    const result = await new Promise((resolve: (value: string) => void, reject) => {
      textract.fromBufferWithMime(mimetype, buffer, (error, text) => {
        if (error) reject(error as any);
        else resolve(text as string);
      });
    });
    return result;
  }

  return '';
};
