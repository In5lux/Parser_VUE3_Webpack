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

const parserRosatom = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 1_000_000;
  const customer = args.c?.toLowerCase() || searchParams?.client;
  const year = args.y;
  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  // Формат — node -s "цена контракта (число)" -y "год публикации закупки (гггг)"

  class UrlEncode {
    constructor(query) {
      this.query = query;
      this.url = `https://zakupki.rosatom.ru/Web.aspx?node=currentorders&ot=${encodeURIComponent(
        this.query
      )}&tso=1&tsl=1&sbflag=0&pricemon=0&ostate=P&pform=a`;
    }
  }

  const queries = args.q ? [args.q] : QUERIES.Rosatom;

  let countQueries = queries.length;

  const parseResults = [];

  console.log('\nRosatom: результаты поиска\n');

  const parseData = async (html, minPrice, query) => {
    let data = [];
    const $ = cheerio.load(html);

    $('.table-lots-list>table>tbody>tr').each((i, elem) => {
      const result = {
        number: $(elem).find('td.description>p:first-child').text().trim(),
        customer: $(elem).find('td:nth-child(5)>p').text().trim(),
        description: $(elem)
          .find('td.description>p:nth-child(2)>a')
          .text()
          .replace(/\n/g, ' '),
        price: $(elem).find('tr td:nth-child(4)>p:first-child').text().trim(),
        published: $(elem).find('td:nth-child(6)>p').text().trim(),
        end:
          $(elem)
            .find('td:nth-child(7)>p')
            .text()
            .replace(/\s{2,}/gm, ' ')
            ?.trim() || '—',
        link:
          'https://zakupki.rosatom.ru' +
          $(elem).find('td.description>p:nth-child(2)>a').attr('href')
      };

      const yearPublished = result.published.split('.')[2];

      if (
        parseResults.filter((parseResult) => parseResult.link == result.link)
          .length == 0 &&
        !!result.number
        // Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
      ) {
        if (
          yearPublished == year ||
          date === '*' ||
          result.published === date
        ) {
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

    // console.log(`Rosatom — ${query} (${countQueries})`);

    if (data.length > 0) {
      console.log(data);
    } else {
      console.log(
        `Rosatom — нет результатов на дату ${
          year || date
        } с минимальной ценой контракта ${minPrice} по запросу «${query}» (${countQueries})`
      );
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
        console.log(`Rosatom — ${query} (${countQueries})  — ${err.message}`);
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

export { parserRosatom };
