import process from 'node:process';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';
import { getArgs } from '../helpers/args.js';
import { argv } from 'process';
import * as cheerio from 'cheerio';
import { bot, myEmitter, db, dbPath, mailer } from '../index.js';
import { writeFileSync } from 'fs';
import { isNew } from '../helpers/isNew.js';
import { priceFilter } from '../helpers/priceFilter.js';
import { searchParams } from '../main.js';
import { Template } from '../mailer/template/mail-template.service.js';
import { constructMessage } from '../helpers/constructMessage.js';
import QUERIES from '../configs/queries.js';
import puppeteerConfig from '../configs/puppeteerConfig.js';
import pageUserAgent from '../configs/pageUserAgent.js';
import telegramMsgConfig from '../configs/telegramMsgConfig.js';

const parserLOTonline = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 100_000;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  const customer = args.c?.toLowerCase() || searchParams?.client;

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  class UrlEncode {
    constructor(query) {
      this.url = `https://gz.lot-online.ru/etp_front/procedure/list?page=1&limit=10&sort=2&sortDirection=DESC&personal=true&${
        args.a ? '' : 'status=given'
      }&keywords=${encodeURIComponent(query)}`;
    }
  }

  const queries = args.q ? [args.q] : QUERIES.LOTonline;

  const parseResults = [];

  console.log(
    `\nLot-online — Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = async (minPrice, queries) => {
    // const browserFetcher = puppeteer.createBrowserFetcher();
    // const revisionInfo = await browserFetcher.download('991974');

    const browser = await puppeteer.launch(puppeteerConfig);

    let count = queries.length;

    for (const query of queries) {
      const url = new UrlEncode(query).url;
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      page.setUserAgent(pageUserAgent);
      await page.goto(url, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 1000));
      // await page.setViewport({ width: 1263, height: 930 });
      // await page.waitForSelector('div.mat-expansion-panel-body div div input');
      // await page.focus('div.mat-expansion-panel-body div div input');
      // await page.waitForTimeout(1000);
      // await page.keyboard.type(query);
      // await page.click('button[type="submit"]');
      // await page.screenshot({ path: `page — ${query}.png` });
      // await page.pdf({ path: `page ${query}.pdf`, printBackground: true, width: '1263px', height: '930px' });
      const html = await page.content();

      const $ = cheerio.load(html);

      await page.close();

      let data = [];

      const isExsist = !$('body')
        .text()
        .includes('По вашему запросу ничего не найдено');

      if (isExsist) {
        $('.procedureList__card').each((i, elem) => {
          const result = {
            number: $(elem).find('a.__link_purchase-number').text(),
            type: $(elem)
              .find('.card-div__procedureType')
              .text()
              .split(' / ')[1]
              .trim(),
            law: $(elem)
              .find('.card-div__procedureType')
              .text()
              .split(' / ')[0]
              .trim(),
            status: $(elem)
              .find('.card-div__procedureStatus span:nth-child(2)')
              .text()
              .trim(),
            customer: $(elem)
              .find(
                'div>div:nth-child(3)>div.col-12.col-md-8>div>div:nth-child(2)'
              )
              .text()
              .trim(),
            description: $(elem)
              .find(
                'div>div.row.col-12.mb-2.mt-4.pl-md-0>div.col-12.col-md-8>div.row.col-12.p-md-0.mx-md-0.__purchaseObjectInfo>p'
              )
              .text()
              .replace(/[\n\t]/g, ' ')
              .trim(),
            price: $(elem).find('.card-div__maxSum').text(),
            published: $(elem).find('.__publication-date').text().split(' ')[1],
            end:
              $(elem)
                .find(
                  'div>div.row.col-12.mb-2.mt-4.pl-md-0>div.col-12.col-md-4.pl-md-0.card-div__procedureStatus.ng-star-inserted>span:nth-child(4)'
                )
                .text()
                .split(' ')[4]
                ?.trim() || '—',
            link:
              'https://gz.lot-online.ru' +
              $(elem).find('a.__link_purchase-number').attr('href'),
            documents:
              'https://gz.lot-online.ru' +
              $(elem)
                .find('a.__link_purchase-number')
                .attr('href')
                .replace('common', 'documentation')
          };

          console.log(result);

          if (
            !parseResults.filter(
              (parseResult) => parseResult.link == result.link
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
      } else {
        console.log(
          `Lot-online — Нет доступных результатов по ключевому запросу "${query}" (${count})\n`
        );
      }
      // console.log(`Lot-online — ${query} (${count})`);

      if (data.length > 0) {
        console.log(data);
      } else {
        console.log(
          `Lot-online — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}" (${count})\n`
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

export { parserLOTonline };
