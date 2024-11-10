require('./create_db_table')();
require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite', (err) => {
  if (err)
    throw new Error(`Error opening database: ${err.message}`)
});

startFetching();

async function startFetching() {
  const pricePrecision = await getCoinPricePrecision();

  while (true) {
    try {
      const currentPrice = await getJsonPrice(pricePrecision);
      console.log(`\x1b[33m$${currentPrice}\x1b[0m ${process.env.COIN} current price`);

      insertPriceIfNoRecordsToday(currentPrice)
        .then(() => {})
        .catch(error => console.error('Error in insertPriceIfNoRecordsToday:', error));

      if (process.env.PRICE_CHANGE_UP && process.env.PRICE_CHANGE_UP.length > 0) {
        var todayHighestPrice;

        await getHighestPriceToday()
                .then(price => { todayHighestPrice = price })
                .catch(error => console.error('Error in getHighestPriceToday:', error));

        if (isCurrentPriceHigh(currentPrice, todayHighestPrice, pricePrecision)) {
          sendMail(currentPrice);
          console.log(`Today the highest price update: $${todayHighestPrice} -> $${currentPrice}`);

          insertPrice(currentPrice)
            .then(() => {})
            .catch(error => console.error('Error in insertPrice:', error));
        } else {
          console.log(`\x1b[32m${todayHighestPrice ? `$${todayHighestPrice}` : '-'}\x1b[0m today the highest price`);
        }
      }

      if (process.env.PRICE_CHANGE_DOWN && process.env.PRICE_CHANGE_DOWN.length > 0) {
        var todayLowestPrice;

        await getLowestPriceToday()
                .then(price => { todayLowestPrice = price })
                .catch(error => console.error('Error in getLowestPriceToday:', error));

        if (isCurrentPriceLow(currentPrice, todayLowestPrice, pricePrecision)) {
          sendMail(currentPrice);
          console.log(`Today the lowest update: $${todayLowestPrice} -> $${currentPrice}`);

          insertPrice(currentPrice)
            .then(() => {})
            .catch(error => console.error('Error in insertPrice:', error));
        } else {
          console.log(`\x1b[31m${todayLowestPrice ? `$${todayLowestPrice}` : '-'}\x1b[0m today the lowest price: `);
        }
      }

      console.log('---------------------------------------');
    } catch (error) {
      console.error('Error:', error);
    }

    await timeout(process.env.REQUEST_DELAY);
  }
}

async function getJsonPrice(precision) {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${process.env.COIN}USDT`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    return parseFloat(json.lastPrice).toFixed(precision);
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

async function getCoinPricePrecision() {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/exchangeInfo?symbol=${process.env.COIN}USDT`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    const tickSize =  json.symbols[0].filters[0].tickSize;
    return (tickSize.indexOf('1') - tickSize.indexOf('.'));
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getHighestPriceToday() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT MAX(price) AS highest_price
      FROM prices
      WHERE coin = "${process.env.COIN}"
        AND created_at >= date('now', 'start of day')
        AND created_at < date('now', '+1 day', 'start of day')
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.highest_price : null);
      }
    });
  });
}

async function getLowestPriceToday() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT MIN(price) AS lowest_price
      FROM prices
      WHERE coin = "${process.env.COIN}"
        AND created_at >= date('now', 'start of day')
        AND created_at < date('now', '+1 day', 'start of day')
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.lowest_price : null);
      }
    });
  });
}

async function insertPriceIfNoRecordsToday(price) {
  return new Promise((resolve, reject) => {
    const checkQuery = `
      SELECT 1 AS one
      FROM prices
      WHERE created_at >= date('now', 'start of day')
        AND created_at < date('now', '+1 day', 'start of day')
      LIMIT 1;
    `;

    db.get(checkQuery, async (err, row) => {
      if (err) {
        console.error("Error checking for today's records:", err);
        return reject(err);
      }

      if (row && row.one === 1) {
        // console.log('Records for today already exist. No insertion made.');
        return resolve();
      } else {
        try {
          await insertPrice(price);
          resolve();
        } catch (error) {
          console.error("Error inserting price:", error);
          reject(error);
        }
      }
    });
  });
}

async function insertPrice(price) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        `INSERT INTO prices (price, coin, created_at) VALUES (?, ?, datetime('now'))`,
        [price, process.env.COIN],
        function (err) {
          if (err) {
            console.error("Error inserting price:", err);
            db.run('ROLLBACK', () => reject(err));
          } else {
            db.run('COMMIT', () => resolve());
          }
        }
      );
    });
  });
}

async function sendMail(price) {
  const emailProvider = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const messageText = `Today the highest ${process.env.COIN} price: $${price}`;

  const messageHtml = `
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style type="text/css">
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .footer {
          text-align: center;
          color: gray;
          font-size: 12px;
          margin-top: 20px;
        }
        h1 {
          text-align: center;
          color: #283a48;
        }
        h2 {
          text-align: center;
          color: #283a48;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${process.env.COIN} = $${price}</h2>
        <h2>Today the highest ${process.env.COIN} price was updated</h2>
        <div class="footer">RoboRate</div>
      </div>
    </body>
  </html>
  `;

  const mailOptions = {
    from: `"RoboRate" <${process.env.SMTP_USER}>`,
    to: process.env.EMAIL_RECIPIENT,
    subject: `${process.env.COIN} price update`,
    text: messageText,
    html: messageHtml,
  };

  emailProvider.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }

    console.log('Email sent: ' + info.response);
  });
}

function isCurrentPriceHigh(currentPrice, todayHighestPrice, precision) {
  if (!todayHighestPrice) return false;

  const multiplier = 10**precision;

  return Math.round(currentPrice * multiplier) - Math.round(todayHighestPrice * multiplier) >= Math.round(process.env.PRICE_CHANGE_UP * multiplier);
}

function isCurrentPriceLow(currentPrice, todayLowestPrice, precision) {
  if (!todayLowestPrice) return false;

  const multiplier = 10**precision;

  return Math.round(todayLowestPrice * multiplier) - Math.round(currentPrice * multiplier) >= Math.round(process.env.PRICE_CHANGE_DOWN * multiplier);
}

process.on('exit', async () => {
  db.close((err) => {
    if (err)
      console.error('Error closing database:', err.message);
    else
      console.log('Database connection closed.');
  });
});
