const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
const sgMail = require('@sendgrid/mail');

module.exports = class Email {
  constructor(user, url, fromEmail = process.env.EMAIL_FROM) {
    this.name = `${user.firstname} ${user.lastname}`;
    this.fName = user.firstName;
    this.lName = user.lastName;
    this.url = url;
    this.from = fromEmail;
    this.sgMail = require('@sendgrid/mail');
    this.sgMail.setApiKey(process.env.SG_API_KEY);
    this.testEmail = 'chuck@mailsac.com';
    // this.to = user.email;
    this.to = user.email;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //create transporter for sendgrid
      // console.log(`creating transport`);
      // return nodemailer.createTransport({
      //   service: 'SendGrid',
      //   auth: {
      //   },
      // });
      return 1;
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PW,
      },
    });
  }

  //send the actual email
  async send(template, subject) {
    try {
      //1. render html for email, based on pug template
      const html = pug.renderFile(
        `${__dirname}/../views/email/${template}.pug`,
        {
          name: `${this.fName} ${this.lName}`,
          url: this.url,
          subject,
        }
      );

      //3. create a transport and send the e-mail
      // await this.newTransport().sendMail(mailOptions);
      // if (process.env.NODE_ENV === 'production') {
      //   this.sgMail.setApiKey(process.env.SG_API_KEY);
      //   await this.sgMail.send(msg);
      // } else {
      //   await this.newTransport().sendMail(msg);
      // }
      if (process.env.NODE_ENV === 'production') {
        this.sgMail.setApiKey(process.env.SG_API_KEY);
        await this.sgMail.send(msg);
      }
    } catch (err) {}
  }

  async sendWelcome() {
    try {
      //1. render html for email, based on pug template
      const html = pug.renderFile(`${__dirname}/../views/email/welcome.pug`, {
        name: this.fName,
        url: this.url,
      });

      //2. define email options
      const msg = {
        from: process.env.EMAIL_FROM,
        to: this.to,
        reply_to: process.env.EMAIL_FROM,
        subject: 'Welcome to WordGolf!',
        html,
        text: htmlToText.fromString(html),
      };

      //3. create a transport and send the e-mail
      // await this.newTransport().sendMail(mailOptions);
      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err.response.body.errors);
    }
  }

  async alertUnhandledRejection() {
    try {
      const html = pug.renderFile(
        `${__dirname}/../views/email/serverError.pug`,
        { message: 'I ded.' }
      );

      const msg = {
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: 'Unhandled rejection on WordGolf server',
        html,
        text: htmlToText.fromString(html),
      };

      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err.response.body.errors);
    }
  }

  async alertSigterm() {
    try {
      const html = pug.renderFile(
        `${__dirname}/../views/email/serverError.pug`,
        { message: 'A sigterm was detected on the WordGolf server.' }
      );

      const msg = {
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: 'Sigterm on WordGolf server',
        html,
        text: htmlToText.fromString(html),
      };

      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err.response.body.errors);
    }
  }

  async sendBugReport(user, location, message) {
    try {
      const html = pug.renderFile(`${__dirname}/../views/email/bugReport.pug`, {
        userName: user.userName,
        email: user.email,
        location,
        message,
      });

      const msg = {
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        reply_to: user.email,
        subject: `WordGolf message from ${user.userName}`,
        html,
        text: htmlToText.fromString(html),
      };

      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err);
    }
  }

  async sendPasswordReset() {
    try {
      //1. render html for email, based on pug template
      const html = pug.renderFile(
        `${__dirname}/../views/email/passwordReset.pug`,
        {
          name: this.fName,
          url: this.url,
        }
      );

      //2. define email options
      const msg = {
        from: process.env.NR_FROM,
        to: this.to,
        reply_to: process.env.NR_FROM,
        subject: `Your password reset token (valid for 10 minutes)`,
        html,
        text: htmlToText.fromString(html),
      };

      //3. create a transport and send the e-mail
      // await this.newTransport().sendMail(mailOptions);
      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err);
    }
    // await this.send(
    //   'passwordReset',
    //   'Your G-Jeopardy password reset token (valid for 10 minutes)',
    //   process.env.EMAIL_FROM
    // );
  }

  async sendClue(category, value, clueText, message) {
    try {
      //1. render html for email, based on pug template
      const html = pug.renderFile(`${__dirname}/../views/email/clue.pug`, {
        category,
        value,
        clueText,
        name: this.name,
        message: message !== '' ? message.replace('<br>', '\n') : undefined,
      });

      //2. define email options
      const msg = {
        from: process.env.CLUE_FROM,
        to: this.sendRealMail ? this.to : this.testEmail,
        reply_to: process.env.HOST_EMAIL,
        subject: `QOTD: ${category} for $${value}`,
        html,
        text: htmlToText.fromString(html),
      };

      //3. create a transport and send the e-mail
      // await this.newTransport().sendMail(mailOptions);
      await this.sgMail.send(msg);
    } catch (err) {
      console.log(err);
    }
  }
};
