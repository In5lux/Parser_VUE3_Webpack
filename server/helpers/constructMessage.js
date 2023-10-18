export const constructMessage = (data) => {
  let message = '';

  message += `
<b>Номер закупки:</b> ${data.number}

<b>Тип закупки:</b> ${data.type}

<b>Клиент:</b> ${data.customer}

<b>Описание:</b> ${data.description}

<b>Дата публикации:</b> ${data.published}

<b>Окончание:</b> ${data.end}

`;
  if (data.section) message += `<b>Секция площадки:</b> ${data.section}\n\n`;
  if (data.status) message += `<b>Статус:</b> ${data.status}\n\n`;
  if (data.law) message += `<b>ФЗ:</b> ${data.law}\n\n`;
  if (data.price) message += `<b>Цена:</b> ${data.price}\n\n`;
  if (data.securing_requisition)
    message += `<b>Обеспечение заявки:</b> ${data.securing_requisition}\n\n`;
  if (data.securing_contract)
    message += `<b>Обеспечение договора:</b> ${data.securing_contract}\n\n`;
  if (data.documents)
    message += `<b>Документы:</b> <a href="${data.documents}">${data.documents}</a>\n\n`;

  message += `<b>Ссылка:</b> <a href="${data.link}">${data.link}</a>`;

  return message;
};
