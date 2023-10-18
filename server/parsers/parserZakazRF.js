import process from 'node:process';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { bot, myEmitter, db, dbPath, mailer } from '../index.js';
import { writeFileSync } from 'fs';
import { isNew } from '../helpers/isNew.js';
import { priceFilter } from '../helpers/priceFilter.js';
import { searchParams } from '../main.js';
import { Template } from '../mailer/template/mail-template.service.js';
import { constructMessage } from '../helpers/constructMessage.js';
import QUERIES from '../configs/queries.js';
import pageUserAgent from '../configs/pageUserAgent.js';
import telegramMsgConfig from '../configs/telegramMsgConfig.js';

const parserZakazRF = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 300_000;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  const customer = args.c?.toLowerCase() || searchParams?.client;

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  class UrlEncode {
    constructor(query) {
      this.query = query;
      this.url = `http://zakazrf.ru/NotificationEx/Index?Filter=1&OrderName=${encodeURIComponent(
        this.query
      )}&ExpandFilter=1`;
    }
  }

  const queries = args.q ? [args.q] : QUERIES.ZakazRF;

  let countQueries = queries.length;

  const parseResults = [];

  console.log(
    `\nZakazRF: Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = (html, minPrice, query) => {
    let data = [];
    const $ = cheerio.load(html);
    let isNotExist = false;

    $('.reporttable tr:not(:first-child)').each((i, elem) => {
      isNotExist = $(elem).find('td').text().trim() === '(нет данных)';
      if (isNotExist) {
        console.log(
          `Нет доступных результатов по ключевому запросу "${query}"\n`
        );
      } else {
        const result = {
          number: $(elem).find('td:nth-child(2)').text(),
          type: $(elem).find('td:first-child').text(),
          customer: $(elem).find('td:nth-child(8)').text(),
          description: $(elem).find('td:nth-child(5)').text(),
          price: $(elem).find('td:nth-child(6)').text() + ' руб.',
          published: $(elem).find('td:nth-child(10)').text(),
          end: $(elem).find('td:nth-child(12)').text()?.trim() || '—',
          link:
            'http://zakazrf.ru' + $(elem).find('td:nth-child(2)>a').attr('href')
        };

        if (
          !parseResults.filter((parseResult) => parseResult.link == result.link)
            .length
          // Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
        ) {
          if (result.published == date || date == '*') {
            // Фильтр по дате, если дата не указана выводятся все даты
            const isCustomer = args.c
              ? result.customer
                  .toLowerCase()
                  .replaceAll('"', '')
                  .match(customer)
              : undefined;
            if (
              isCustomer ||
              (args.c === undefined && priceFilter(result.price, minPrice))
            ) {
              // Фильтр по наименованию клиента
              data.push(result);
              if (isNew(db, result.number)) {
                db.push(result);
                writeFileSync(dbPath, JSON.stringify(db));
                const message = constructMessage(result);

                setTimeout(() => {
                  bot.telegram.sendMessage(
                    process.env.CHAT_ID,
                    message,
                    telegramMsgConfig
                  );
                  mailer.send(new Template([result]));
                }, delay);
                delay += 1000;
              }
            }
          }
        }

        parseResults.push(result);

        //data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
      }
    });

    // console.log(`ZakazRF — ${query} (${countQueries})`);

    if (!isNotExist) {
      if (data.length > 0) {
        console.log(data);
      } else {
        console.log(
          `ZakazRF — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}" (${countQueries})\n`
        );
      }
    }
  };

  const getData = (query) => {
    const url = new UrlEncode(query).url;

    axios
      .get(url, {
        timeout: 15_000,
        headers: {
          'User-Agent': pageUserAgent
        }
      })
      .then((res) => {
        parseData(res.data, minPrice, query);
      })
      .catch((err) => {
        console.log(`ZakazRF — ${query} (${countQueries}) — ${err.message}`);
      })
      .finally(() => {
        countQueries--;
        if (countQueries == 0) {
          setTimeout(() => {
            myEmitter.emit('next');
          }, 3000);
        }
      });
  };

  for (const query of queries) {
    getData(query);
  }
};

export { parserZakazRF };
