import process from 'node:process';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { format, subDays } from 'date-fns';
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

const parserEtpGPB = () => {
  let delay = 0;

  const args = getArgs(argv);

  const minPrice = args.s || searchParams?.price || 0;

  const date = searchParams?.date || args.d || format(new Date(), 'dd.MM.yyyy');

  const active = args.a
    ? 'procedure%5Bcategory%5D=all'
    : 'procedure%5Bstage%5D%5B0%5D=accepting';

  const customer = args.c?.toLowerCase() || searchParams?.client;

  // Формат — node -s "цена контракта (число)" -d "дата публикации закупки (дд.мм.гггг)" -q "поисковый запрос (строка)"

  const queries = args.q ? [args.q] : QUERIES.EtpGPB;

  const parseResults = [];

  console.log(
    `\nEtpGPB — Результаты на ${
      date === '*' ? 'все опубликованные закупки' : date
    } с минимальной суммой контракта ${minPrice}\n`
  );

  const parseData = async (minPrice, queries) => {
    // const browserFetcher = puppeteer.createBrowserFetcher();
    // const revisionInfo = await browserFetcher.download('991974');

    const browser = await puppeteer.launch(puppeteerConfig);

    let count = queries.length;

    for (const query of queries) {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(0);
      page.setUserAgent(pageUserAgent);
      // await page.waitForTimeout(3000);
      await page.goto(
        `https://etpgpb.ru/procedures/?search=${encodeURIComponent(
          query
        )}}&page=1&per=10&${active}`,
        { waitUntil: 'load' }
      );
      // await page.waitForSelector('#searchInput');
      // await page.focus('#searchInput');
      // await page.waitForTimeout(1000);
      // await page.keyboard.type(query);
      //await page.click('.globalProceduresSearch__searchBtn');
      // await page.keyboard.down('Enter');
      await new Promise((r) => setTimeout(r, 2000));
      // // await page.screenshot({ path: `page ${query}.png` });
      const html = await page.content();

      //console.log(html);

      //await page.close();

      const $ = cheerio.load(html);

      const isExsist = !$('.globalProceduresNotFound')
        .text()
        .includes('ничего не');

      //console.log($('.globalProceduresNotFound').text());

      let data = [];

      if (isExsist) {
        $('.globalProceduresCard--fullView').each((i, elem) => {
          const description = $(elem)
            .find('.globalProceduresCard__titleContainer')
            .text()
            .replace(/\n/g, ' ')
            .trim();

          if (
            txtFilterByStopWords(description) &&
            description.includes(query.split(' ')[0].slice(0, -2).toLowerCase())
          ) {
            const result = {
              number: $(elem).find('.globalProceduresCard__number').text(),
              //section: $(elem).find('.globalProceduresCard__ep').text(),
              type: $(elem)
                .find('.globalProceduresCard__typeValue')
                .text()
                .trim(),
              status: $(elem)
                .find('.globalProceduresCard__status')
                .text()
                .trim(),
              customer: $(elem)
                .find('.globalProceduresCard__customerValueItem')
                .text()
                .trim(),
              description,
              price:
                $(elem)
                  .find('.globalProceduresCard__priceValue')
                  .text()
                  .trim()
                  .replace(/\s{2,}/, ' ') || '0.00',
              published: $(elem)
                .find('.globalProceduresCard__placementDateValueDate')
                .text()
                .trim()
                .split(',')[0],
              end:
                $(elem)
                  .find('.globalProceduresCard__expiryDateValueDate')
                  .text()
                  .trim()
                  .split(',')[0] || '—',
              link:
                'https://etpgpb.ru' +
                $(elem).find('a.globalProceduresCard__title').attr('href'),
              query
            };

            if (result.published == 'Сегодня') result.published = date;
            if (result.published == 'Вчера')
              result.published = format(subDays(new Date(), 1), 'dd.MM.yyyy');

            //if (result.price.includes('Цена не указана')) result.price = 0;

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
                  (customer === undefined &&
                    priceFilter(result.price, minPrice))
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
              //data = data.filter((item) => parseInt(item.price.replace(/\s/g, '')) >= minPrice);
            }
            parseResults.push(result);
          }
        });
      } else {
        console.log(
          `EtpGPB — Нет доступных результатов по ключевому запросу "${query}"\n`
        );
      }
      // console.log(`Sberbank AST — ${query} (${count})`);

      if (data.length > 0) {
        console.log(data);
      } else {
        console.log(
          `EtpGPB — Нет результатов удовлетворяющих критериям поиска (цена, дата) по запросу "${query}" (${count})\n`
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

export { parserEtpGPB };
