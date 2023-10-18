const dateDict = {
  янв: '01',
  фев: '02',
  мар: '03',
  апр: '04',
  мая: '05',
  июн: '06',
  июл: '07',
  авг: '08',
  сен: '09',
  окт: '10',
  ноя: '11',
  дек: '12'
};

const dateFormat = (date) => {
  const res = date.split(' ');
  if (res[0].length == 1) {
    res[0] = '0' + res[0];
  }
  res[1] = dateDict[res[1]];
  return res.join('.');
};

export { dateFormat };
