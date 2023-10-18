//import { readFileSync, writeFileSync } from 'fs';

//let db = JSON.parse(readFileSync('../../db/db.json', 'utf-8')).flat();

export const isNew = (db, number) => {
  for (const dbItem of db) {
    if (dbItem.number == number) return false;
  }
  return true;
};

//console.log(isNew(db, [{ number: 10 }]));
