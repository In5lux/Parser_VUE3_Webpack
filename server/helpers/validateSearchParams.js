export const validateSearchParams = (data) => {
  const params = ['date', 'desc', 'client'];

  let checkRes = true;

  if (typeof data == 'object') {
    for (const key of Object.keys(data)) {
      if (!params.includes(key)) checkRes = false;
    }
  } else {
    checkRes = false;
  }
  return checkRes;
};
