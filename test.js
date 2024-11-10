require('dotenv').config();
const nodemailer = require('nodemailer');

checkEnvKey('COIN');

if (
  process.env['PRICE_CHANGE_UP'] && process.env['PRICE_CHANGE_UP'].length > 0 ||
  process.env['PRICE_CHANGE_DOWN'] && process.env['PRICE_CHANGE_DOWN'].length > 0
) {
  ['PRICE_CHANGE_UP', 'PRICE_CHANGE_DOWN'].forEach((key) => {
    if (process.env[key] && process.env[key].length > 0)
      logSuccess(`${key} presents`);
  });
} else
  logError(`Neither PRICE_CHANGE_UP, nor PRICE_CHANGE_DOWN env variable in ".env". Need to set at least one of them.`);

[
  'REQUEST_DELAY',
  'EMAIL_RECIPIENT',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD'
].forEach((key) => checkEnvKey(key));

if (process.env.COIN && process.env.COIN.length > 0) {
  testScrape();
}

async function testScrape() {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${process.env.COIN}USDT`);

    if (!response.ok) {
      return logError(`Request API URL status error: ${response.status}`);
    }

    const json = await response.json();
    logSuccess(`API URL response: ${JSON.stringify(json)}`);

    if (
      [
        'EMAIL_RECIPIENT',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD'
      ].every((key) => (process.env[key] && process.env[key].length > 0))
    )
      testEmail(json.lastPrice);
  } catch (error) {
    return logError(`Request API URL error: ${error}`);
  }
}

async function testEmail(message) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const text = `This is a test email sent from RoboRate. Scrapped result: ${message}`

  let mailOptions = {
    from: `"RoboRate" <${process.env.SMTP_USER}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: 'Test email',
    text,
    html: `<b>${text}</b>`
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    logSuccess(`Test email sent: ${info.response}`)
  } catch (error) {
    logError(`Error sending email: ${error}`);
  }
}

function logSuccess(message) {
  const green = '\x1b[32m';
  const greenCheck = '\u2714';
  const reset = '\x1b[0m';
  console.log(`${green}${greenCheck}${reset} ${message}`);
}

function logError(message) {
  const red = '\x1b[31m';
  const redCross = '\u2718';
  const reset = '\x1b[0m';
  console.log(`${red}${redCross}${reset} ${message}`);
}

function logWarning(message) {
  const orange = '\x1b[38;5;214m';
  const exclamationMark = '!';
  const reset = '\x1b[0m';
  console.log(`${orange}${exclamationMark}${reset} ${message}`);
}

function checkEnvKey(key) {
  if (process.env[key] && process.env[key].length > 0)
    logSuccess(`${key} presents`);
  else
    logError(`No env variable ${key} in ".env"`);
}
