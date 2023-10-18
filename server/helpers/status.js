import { writeFileSync, readFileSync } from 'fs';
import { parsingStatusPath } from '../index.js';
import { format } from 'date-fns';

export class Status {
  static current = {};

  static get() {
    return this.current.status && this.current.lastUpdateTime
      ? this.current
      : JSON.parse(readFileSync(parsingStatusPath, 'utf-8'));
  }
  static run() {
    this.current.lastUpdateTime = format(new Date(), 'dd.MM.yyyy, HH:mm:ss');
    this.current.status = 'Парсинг';
    writeFileSync(parsingStatusPath, JSON.stringify(this.current));
  }
  static done() {
    this.current.lastUpdateTime = format(new Date(), 'dd.MM.yyyy, HH:mm:ss');
    this.current.status = 'Выполнено';
    writeFileSync(parsingStatusPath, JSON.stringify(this.current));
  }
}
