const WebSocketClient = require('websocket').client

const customLogger = require('utils/logger')
const loadWebSocket = require('./lib/websocket')

function serverStart(){
  var client = new WebSocketClient({
    tlsOptions: {
      headers: {
        Cookie: [`ATERNOS_SESSION=${process.env.ATERNOS_SESSION || "6XDjrzHq0dvhxJfQS9rSuEY94TFJTIRqRKvssd9aWWN18ZbJjvsoUEC4AJvMwtjj74VqV2F4aYOeWfqxZiN5XpRi5SQ9uz9ulj4L"}`]
      }
    }
  });

  client.on('connectFailed', (error) => logger.error(logSystem, 'serverStart', `Connect Error: ${error.toString()}`))
        .on('connect', loadWebSocket)
        .connect('wss://aternos.org/hermes/', undefined, 'https://aternos.org');
}

module.exports = function(){
  global.logSystem = 'Aternos'
  global.config = JSON.parse(process.env.config)
  global.logger = new customLogger(config.logger)

  serverStart()
}

