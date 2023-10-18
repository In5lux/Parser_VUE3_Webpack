import process from 'node:process';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import { bot, myEmitter, db, dbPath, mailer } from '../index.js';
import { writeFileSync } from 'fs';
import { txtFilterByStopWords } from '../helpers/textFilter.js';
import { isNew } from '../helpers/isNew.js';
import { collectData } from '../helpers/collectData.js';
import { searchParams } from '../main.js';
import { Template } from '../mailer/template/mail-template.service.js';
import { constructMessage } from '../helpers/constructMessage.js';
import QUERIES from '../configs/queries.js';
import puppeteerConfig from '../configs/puppeteerConfig.js';
import pageUserAgent from '../configs/pageUserAgent.js';
import telegramMsgConfig from '../configs/telegramMsgConfig.js';

const parserB2BCenter = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 300000;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  const customer = args.c?.toLowerCase() || searchParams?.client;

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  const queries = args.q ? [args.q] : QUERIES.B2BCenter;

  const parseResults = [];

  console.log(
    `\nB2B Center — Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = async (minPrice, queries) => {
    const browser = await puppeteer.launch(puppeteerConfig);

    let count = queries.length;

    for (const query of queries) {
      const page = await browser.newPage();
      page.setUserAgent(pageUserAgent);
      let HTML = false;
      let attempts = 0;
      const url = 'https://www.b2b-center.ru/market/';
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Retry request until it gets data or tries 5 times
      while (HTML === false && attempts < 5) {
        console.log(
          `B2B Center — попытка ${attempts} загрузки данных страницы по запросу "${query}"`
        );
        HTML = await collectData(page, url, query, 'b2b-center.ru');
        attempts += 1;
        if (HTML === false) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      const $ = cheerio.load(HTML);

      await page.close();

      const isExsist = !$('body')
        .text()
        .includes('нет актуальных торговых процедур');

      let data = [];

      if (isExsist) {
        $('table.search-results>tbody>tr').each((i, elem) => {
          const description = $(elem)
            .find('div.search-results-title-desc')
            .text()
            .replace(/\n/g, ' ');

          if (
            txtFilterByStopWords(description) &&
            description.includes(query.split(' ')[0].slice(0, -2).toLowerCase())
          ) {
            const result = {
              number: $(elem)
                .find('td:first-child>a')
                .text()
                .match(/№\s\d{1,}/g)[0],
              type: $(elem)
                .find('td:first-child>a')
                .text()
                .match(/^[а-яА-Я\s]+[а-я]/g)[0],
              customer: $(elem).find('td:nth-child(2)>a').text(),
              description,
              published: $(elem).find('td:nth-child(3)').text().split(' ')[0],
              end:
                $(elem).find('td:last-child').text().split(' ')[0]?.trim() ||
                '—',
              link: $(elem).find('td:first-child>a').attr('href')
            };

            if (!result.link.startsWith('https')) {
              result.link = 'https://www.b2b-center.ru' + result.link;
            }

            if (
              !parseResults.filter(
                (parseResult) => parseResult.number == result.number
              ).length
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
                if (isCustomer || customer === undefined) {
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
              // data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
            }
            parseResults.push(result);
          }
        });
      } else {
        console.log(
          `B2B Center — Нет доступных результатов по ключевому запросу "${query} (${count})"\n`
        );
      }

      if (data.length > 0) {
        console.log(data);
      } else {
        console.log(
          `B2B Center — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query} (${count})"\n`
        );
      }

      count--;
      if (count == 0) {
        await browser.close();
        setTimeout(() => {
          myEmitter.emit('next');
        }, 3000);
      }
    }
  };
  parseData(minPrice, queries);
};

export { parserB2BCenter };
