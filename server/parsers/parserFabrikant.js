import process from 'node:process';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { dateFormat } from '../helpers/dateFormatter.js';
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

const parserFabrikant = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 300000;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  const active = args.a ? '0' : '1'; // -a поиск по архивным закупкам

  const customer = args.c?.toLowerCase() || searchParams?.client;

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  class UrlEncode {
    constructor(query, active) {
      this.url = `https://www.fabrikant.ru/trades/procedure/search/?query=${encodeURIComponent(
        query
      )}&active=${active}`;
    }
  }

  const queries = args.q ? [args.q] : QUERIES.Fabrikant;

  let countQueries = queries.length;

  const parseResults = [];

  console.log(
    `\nFabrikant — Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = (html, minPrice, query) => {
    let data = [];
    const $ = cheerio.load(html);

    const isExsist = !$('.Search-result-no')['0']?.name === 'div';

    if (!isExsist) {
      $('.innerGrid').each((i, elem) => {
        // isNotExist = $(elem).find('td').text().trim() === '(нет данных)';

        const result = {
          number: $(elem)
            .find('.marketplace-unit__info__name span')
            .text()
            .replace(/\D/gm, ''),
          type: $(elem)
            .find('.marketplace-unit__info__name span')
            .text()
            .split('№')[0],
          status: $(elem).find('.bid-evt-color').text(),
          customer: $(elem)
            .find('.marketplace-unit__organizer a span:last-child')
            .text(),
          description: $(elem).find('.marketplace-unit__title a').text().trim(),
          price:
            $(elem)
              .find('.marketplace-unit__price span strong')
              .text()
              .trim() ||
            $(elem).find('.marketplace-unit__price p').text().trim() ||
            $(elem).find('.marketplace-unit__price>span').text().trim(),
          published: $(elem)
            .find(
              '.marketplace-unit__state__wrap>.marketplace-unit__state:first-child .dt'
            )
            .text(),
          end:
            $(elem)
              .find(
                '.marketplace-unit__state__wrap>.marketplace-unit__state:last-child .dt'
              )
              .text()
              ?.trim() || '—',
          link: $(elem).find('.marketplace-unit__title a').attr('href')
        };

        result.link =
          result.link != undefined &&
          !result.link.includes('etp-ets') &&
          !result.link.includes('fabrikant')
            ? 'https://www.fabrikant.ru'.concat(result.link)
            : result.link;

        result.published = dateFormat(result.published);
        result.end = dateFormat(result.end);
        result.price = result.price != 'Участие бесплатно' ? result.price : '0';

        if (
          !parseResults.filter((parseResult) => parseResult.link == result.link)
            .length
          // Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
        ) {
          if (result.published === date || date === '*') {
            // Фильтр по дате, если дата не указана выводятся все даты
            const isCustomer = customer
              ? !!result.customer
                  .toLowerCase()
                  .replaceAll('"', '')
                  .match(customer)
              : undefined;
            if (
              isCustomer ||
              (customer === undefined && priceFilter(result.price, minPrice))
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
      });
    }

    // console.log(`Fabrikant — ${query} (${countQueries})`);

    if (data.length > 0) {
      console.log(data);
    } else {
      console.log(
        `Fabrikant — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}" (${countQueries})\n`
      );
    }
  };

  const getData = (query) => {
    const url = new UrlEncode(query, active).url;

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
        console.log(`Fabrikant — ${query} (${countQueries}) — ${err.message}`);
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

export { parserFabrikant };
