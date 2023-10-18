import pug from 'pug';
import path from 'path';
import { __dirname } from '../../index.js';

export class Template {
  constructor(data) {
    this.data = data;
  }
  text() {
    return `${this.data[0].customer}

${this.data[0].number}

Тип закупки: ${this.data[0].type}

Описание: ${this.data[0].description}

Цена: ${this.data[0].price}

Дата публикации: ${this.data[0].published}

Дата окончания: ${this.data[0].end}

${
  this.data[0].securing_requisition
    ? 'Обеспечение заявки: ' + this.data[0].securing_requisition
    : ''
}

${
  this.data[0].securing_contract
    ? 'Обеспечение договора: ' + this.data[0].securing_contract
    : ''
}

Страница закупки: ${this.data[0].link}

Документы: ${this.data[0].documents}`;
  }
  html() {
    const htmlCompiler = pug.compileFile(
      path.join(__dirname, 'views') + '/' + 'mail.pug'
    );
    return htmlCompiler({ items: this.data });
  }
}
