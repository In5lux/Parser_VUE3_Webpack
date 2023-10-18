import { readFileSync } from 'fs';
import { stopWordsPath } from '../index.js';

export const txtFilterByStopWords = (data) => {
  const stopWords = JSON.parse(readFileSync(stopWordsPath, 'utf-8'));

  if (typeof data == 'string') {
    const text = data.toLowerCase();
    for (const word of stopWords) {
      if (text.indexOf(word) != -1) return false;
    }
  } else if (typeof data != 'string') {
    return false;
  }
  return true;
};
