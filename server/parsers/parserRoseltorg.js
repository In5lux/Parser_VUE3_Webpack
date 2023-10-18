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
import { priceFilter } from '../helpers/priceFilter.js';
import { searchParams } from '../main.js';
import { Template } from '../mailer/template/mail-template.service.js';
import { constructMessage } from '../helpers/constructMessage.js';
import QUERIES from '../configs/queries.js';
import puppeteerConfig from '../configs/puppeteerConfig.js';
import pageUserAgent from '../configs/pageUserAgent.js';
import telegramMsgConfig from '../configs/telegramMsgConfig.js';

const parserRoseltorg = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 300_000;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  class UrlEncode {
    constructor(date, query) {
      this.startPublishDate =
        date != '*'
          ? `&start_date_published=${date.substr(0, 6) + date.slice(8)}`
          : '';
      this.url = `https://www.roseltorg.ru/procedures/search?sale=1&query_field=${encodeURIComponent(
        query
      )}&status%5B%5D=0&currency=all${this.startPublishDate}`;
    }
  }

  console.log(args.q);

  const queries = args.q ? [args.q] : QUERIES.Roseltorg;

  const parseResults = [];

  console.log(
    `\nRoseltorg — Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = async (date, minPrice, queries) => {
    // const browserFetcher = puppeteer.createBrowserFetcher();
    // const revisionInfo = await browserFetcher.download('991974');

    const browser = await puppeteer.launch(puppeteerConfig);

    let count = queries.length;

    for (const query of queries) {
      const url = new UrlEncode(date, query).url;
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      page.setUserAgent(pageUserAgent);
      // page.on('load', () => console.log('Loaded!', page.url()));
      // page.on('domcontentloaded', () => console.log('dom fired'));
      // await page.waitForTimeout(3000);
      await page.goto(url, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 1000));
      // await page.screenshot({ path: `page — ${query}.png` });
      // await page.pdf({ path: `page ${query}.pdf`, printBackground: true, width: '1263px', height: '930px' });
      const html = await page.content();

      let data = [];

      const $ = cheerio.load(html);
      const isExist =
        !$('.search-results__info-text p:first-child').text() ==
        'По вашему запросу ничего не найдено.';

      if (!isExist) {
        const itemLinks = await page.evaluate(() =>
          // eslint-disable-next-line no-undef
          Array.from(
            document.querySelectorAll('.search-results__subject a'),
            (e) => e.href
          )
        );

        const itemsInfo = [];

        for (const link of itemLinks) {
          //console.log(link);
          const itemInfo = {};
          await page.goto(link, { waitUntil: 'load' });
          const html2 = await page.content();
          const $item = cheerio.load(html2);
          let date = $item(
            'body > div.dialog-off-canvas-main-canvas > main > section.lots-list > div > div > div.lot-item__moredetails > div > table:nth-child(2) > tbody > tr.data-table__item.odd > td.data-table__info-td > p'
          ).text();
          date = date.split(' ');
          date = date[0];
          date = date.split('.');
          date[2] = '20' + date[2];
          date = date.join('.');
          itemInfo.publishDate = date;
          itemInfo.securing_requisition =
            $item(
              'main>section.lots-list>div>div>div.lot-item__data> div.lot-item__infoblock.lot-item__request>span.lot-item__summ'
            ).text() +
            ' руб.' +
            $item(
              'main>section.lots-list>div>div>div.lot-item__data> div.lot-item__infoblock.lot-item__request>span.lot-item__procent-qty'
            ).text();
          itemInfo.securing_contract =
            $item(
              'main>section.lots-list>div>div>div.lot-item__data>div.lot-item__infoblock.lot-item__contact>span.lot-item__summ'
            ).text() ||
            $item(
              'main>section.lots-list>div>div>div.lot-item__data>div.lot-item__infoblock.lot-item__contact>span.lot-item__procent-qty'
            ).text();
          itemsInfo.push(itemInfo);
        }

        $('.search-results__item').each((i, elem) => {
          const description = $(elem)
            .find('.search-results__subject a')
            .text()
            .replace(/[\n\t]/g, ' ')
            .trim();

          if (
            txtFilterByStopWords(description) &&
            description.includes(query.split(' ')[0].slice(0, -2).toLowerCase())
          ) {
            let securing_requisition = itemsInfo[i].securing_requisition;

            let securing_contract = itemsInfo[i].securing_contract;

            securing_requisition =
              typeof securing_requisition == 'string' &&
              securing_requisition.indexOf('не предусмотрено') == -1
                ? securing_requisition
                : 'Нет';

            securing_contract =
              typeof securing_contract == 'string' &&
              securing_contract.indexOf('не предусмотрено') == -1
                ? securing_contract
                : 'Нет';

            const result = {
              number: $(elem)
                .find('.search-results__lot a')
                .text()
                .split(' ')[0],
              law: $(elem)
                .find('.search-results__section p.search-results__tooltip')
                .text(),
              type: $(elem).find('.search-results__type').text(),
              customer: $(elem)
                .find('.search-results__customer p.search-results__tooltip')
                .text(),
              description,
              price: $(elem).find('.search-results__sum p').text(),
              published: itemsInfo[i].publishDate,
              end:
                $(elem)
                  .find('.search-results__time')
                  .text()
                  .replace(/\s{2,}/g, ' ')
                  ?.trim() || '—',
              securing_requisition,
              securing_contract,
              link:
                'https://www.roseltorg.ru' +
                $(elem).find('.search-results__subject a').attr('href'),
              query
            };

            if (
              !parseResults.filter(
                (parseResult) => parseResult.number == result.number
              ).length
              // Проверка на дубли результатов парсинга по разным поисковым запросам и фильр даты
            ) {
              if (result.published == date || date == '*') {
                // Фильтр по дате, если дата не указана выводятся все даты
                const isCustomer = args.c
                  ? result.customer
                      .toLowerCase()
                      .replaceAll('"', '')
                      .match(args.c.toLowerCase())
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
          }
        });
        //data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
      }

      await page.close();

      // console.log(`Roseltorg — ${query} (${count})`);

      if (data.length > 0) {
        console.log(data);
      } else {
        console.log(
          `Roseltorg — Нет результатов удовлетворяющих критериям поиска на ${date} цена ${minPrice} по запросу "${query}" (${count})\n`
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
  parseData(date, minPrice, queries);
};

export { parserRoseltorg };
