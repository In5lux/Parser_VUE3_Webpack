export const priceFilter = (data, minPrice) => {
  const price =
    typeof data == 'string' ? parseInt(data.replace(/\s/g, '')) : data;
  if (price < minPrice) return false;
  return true;
};
