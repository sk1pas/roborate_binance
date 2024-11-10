# RoboRate - Binance

**RoboRate** is a JavaScript-based scraper, containerized in Docker, designed to monitor cryptocurrency price changes on Binance. Set your desired threshold for price increase or decrease, and RoboRate will keep track of real-time price movements, alerting you via email when coins hit the highest or lowest prices of the day.

## Requirements 
- Git [How to install](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Docker [How to install](https://docs.docker.com/engine/install/)
- (Optional) NodeJS [How to install](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)

## Install
1. Clone this repo:
```bash
git clone https://github.com/sk1pas/roborate_binance.git
```
2. Go to project dir:
```bash
cd roborate_binance
```
3. Create `.env` file from config example:
```bash
cp .env.example .env
```
4. Open `.env` file editing with `nano` or any other editor:
```bash
nano .env
```
and change config:
- `COIN` - crypto coin to monitor price, for example: `BTC`
- `PRICE_CHANGE_UP` - coin price change threshold on price increase in $, for example: `1000`
- `PRICE_CHANGE_DOWN` - coin price change threshold on price decrease in $, for example: `1000`
- `REQUEST_DELAY` - delay between requests to Binance API. Dont' recommend to set less that 1 second (1000 milliseconds)
- `EMAIL_RECIPIENT` - email for price change notifications, for example: `recepient@email.com`
- `SMTP_HOST` - email sender setting. For example, Google SMTP host: `smtp.gmail.com`
- `SMTP_PORT` - email sender setting. For example, Google SMTP port: `587`
- `SMTP_USER` - email sender setting. If you're going to use Google mailer - then it's your email. Allows to be the same as `EMAIL_RECIPIENT`
- `SMTP_PASSWORD` - email sender setting. In case you're going to use Google mailer, you must to generate Google app password (**not the same as password of your Google account!**). To generate Google app password you must to activate [2-Step Verification](https://support.google.com/accounts/answer/185839?hl=en&co=GENIE.Platform%3DDesktop) first. Then Google app password creating will be available on page: https://myaccount.google.com/apppasswords

5. (Optional) If you have installed NodeJS, you can verify your config:
```bash
node test.js
```
6. Run Roborate in Docker - one command to make an image and start a container:
```bash
bin/docker-rebuild
```
Check container presence:
```bash
docker ps -a
```
See container log:
```bash
docker logs -f --tail 100 roborate_binance
```
Stop container:
```bash
docker stop roborate_binance
```
Remove container:
```bash
docker rm roborate_binance
```