const countDays = (firstDate: Date, secondDate: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;

  // Truncate the time part by setting the hours, minutes, seconds, and milliseconds to zero
  const firstDateTruncated = new Date(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate(),
  );
  const secondDateTruncated = new Date(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate(),
  );

  console.log(firstDateTruncated);
  console.log(secondDateTruncated);

  return Math.round((secondDateTruncated.getTime() - firstDateTruncated.getTime()) / oneDay);
};

export { countDays };
