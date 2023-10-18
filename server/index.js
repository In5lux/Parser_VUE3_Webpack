#!/usr/bin/env node
import process from 'node:process';
import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import { EventEmitter } from 'events';
import { parserZakupkiGov } from './parsers/parserZakupkiGov.js';
import { parserRosatom } from './parsers/parserRosatom.js';
import { parserZakazRF } from './parsers/parserZakazRF.js';
import { parserEtpEts } from './parsers/parserEtpEts.js';
import { parserFabrikant } from './parsers/parserFabrikant.js';
import { parserZakupkiMos } from './parsers/parserZakupkiMos.js';
import { parserSberbankAst } from './parsers/parserSberbankAst.js';
import { parserB2BCenter } from './parsers/parserB2BCenter.js';
import { parserLOTonline } from './parsers/parserLOTonline.js';
import { parserRoseltorg } from './parsers/parserRoseltorg.js';
import { parserEtpGPB } from './parsers/parserEtpGPB.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getArgs } from './helpers/args.js';
import { parsersInfo } from './helpers/parsersInfo.js';
import { Status } from './helpers/status.js';
import { argv } from 'process';
import { runServer, searchParams } from './main.js';
import { Mailer } from './mailer/mailer.js';
import { CronJob } from 'cron';
import { format } from 'date-fns';

//const __filename = fileURLToPath(import.meta.url);

export const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const dbPath = path.join(__dirname, '../db/db.json');
export const stopWordsPath = path.join(__dirname, '../db/stopwords.json');
export const parsingStatusPath = path.join(
  __dirname,
  '../db/parsingStatus.json'
);

config({ path: path.join(__dirname, '../.env') });
export const bot = new Telegraf(process.env.TOKEN);
export const mailer = new Mailer(
  process.env.M_USER,
  process.env.M_PASS,
  process.env.EMAILS
);
export let db = JSON.parse(readFileSync(dbPath, 'utf-8')).flat();

//console.clear();

const parsers = [
  parserZakupkiGov,
  parserRosatom,
  parserFabrikant,
  parserEtpEts,
  parserZakazRF,
  parserRoseltorg,
  parserSberbankAst,
  parserZakupkiMos,
  parserLOTonline,
  parserEtpGPB,
  parserB2BCenter
];

export let dataInfo = {
  name: null,
  length: parsers.length,
  index: null
};

export let parsersIterator = parsers[Symbol.iterator]();

export const myEmitter = new EventEmitter();

myEmitter.on('next', () => {
  const { value, done } = parsersIterator.next();
  if (!done) {
    dataInfo.name = parsersInfo[value.name];
    dataInfo.index = parsers.indexOf(value);
    myEmitter.emit('getExecutor');
    value();
  } else {
    Status.done();
    myEmitter.emit('done');
    parsersIterator = parsers[Symbol.iterator]();
  }
});

console.log(new Date().toLocaleString());

const args = getArgs(argv);
if (args.cmd) {
  parsersIterator.next().value();
}
if (args.server) {
  runServer();
}

const job = new CronJob(
  '0 0 10,12,14,16,18,20 * * *',
  function () {
    searchParams.date = format(new Date(), 'dd.MM.yyyy');
    Status.run();
    myEmitter.emit('next');
    myEmitter.emit('cron');
  },
  null,
  true,
  'Europe/Moscow'
);
job.start();
