export const generateVerifyCode = (): number => {
  const num = Math.floor(Math.random() * 100000)
    .toString()
    .padEnd(5, '0');

  return parseInt(num, 10);
};
