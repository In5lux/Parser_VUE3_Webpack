import nodemailer from 'nodemailer';

export class Mailer {
  constructor(user, pass, to) {
    this.user = user;
    this.to = to;
    this.transporter = nodemailer.createTransport({
      host: 'smtp.yandex.ru',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass
      }
    });
  }
  async send(template) {
    await this.transporter.sendMail({
      from: `Zakupki <${this.user}>`, // sender address
      to: this.to, // list of receivers
      subject: `Закупка ${template.data[0].number}`, // Subject line
      text: template.text(), // plain text body
      html: template.html() // html body
    });
  }
}
