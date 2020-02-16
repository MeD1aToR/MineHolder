const color = require('ansi-color').set
const mc = require('minecraft-protocol')
const states = mc.states

const customLogger = require('utils/logger')
const mcClient = require('./lib/minecraftClient')

var connectingNow = false
var resendStatusReq = null

function mcClientStart(){
  const logComponent = 'MCClient'
  const chats = []
  var client = undefined

  if (config.Aternos.enabled) {
    process.send({type: 'Aternos.mcStatusRequest', data: {}})
  } else {
    connecting()
  }

  process.on('message', function(message) {
    const { type, data } = message;
    switch(type){
      case 'messageSend':
        const { line } = data;
        if (client !== undefined && !client.write('chat', { message: line })) {
          chats.push(line)
        }
      break
      case 'statusResponse':
        if ((data.status === 1 || data.status === 5) && !connectingNow) connecting()
        else {
          resendStatusReq = setTimeout(function(){
            process.send({type: 'Aternos.mcStatusRequest', data: {}})
          }, 10000)
        }
      break
      case 'statusUpdate':
        clearInterval(resendStatusReq)
        if ((data.status === 1 || data.status === 5) && !connectingNow) connecting()
      break
      default:
        break
    }
  })

  function connecting(){
    connectingNow = true
    logger.debug(logSystem, logComponent, `Connecting to ${config.MCClient.host}:${config.MCClient.port}`)
    logger.debug(logSystem, logComponent, `Username: ${config.MCClient.username}`)
    client = mc.createClient({
      host: config.MCClient.host,
      port: config.MCClient.port,
      username: config.MCClient.username,
      password: config.MCClient.password === ""?undefined:config.MCClient.password
    })
    
    client.on('connect', function () {
      logger.info(logSystem, logComponent, `Successfully connected to ${config.MCClient.host}:${config.MCClient.port}`)
    })

    client.on('disconnect', function (packet) {
      logger.warning(logSystem, logComponent, `Disconnected: ${packet.reason}`)
    })

    if (!client.wait_connect) next()
    else client.once('connect_allowed', next)
  }
  
  function next(){
    mcClient(client, chats, states, function(type, msg, style){
      style = style || 'white'
      switch(type){
        case 'log':
          logger.debug(logSystem, logComponent, `[ Log ]: ${msg}`)
        break;
        case 'status':
          logger.debug(logSystem, logComponent, `[ Status ]: ${msg}`)
        break;
        case 'message':
          logger.debug(logSystem, logComponent, `[ Chat ]: <${msg.username}> ${msg.message}`)
          process.send({type: 'WEBServer.messageSended', data: { username: msg.username, message: msg.message }})
        break;
        default:
          logger.debug(logSystem, logComponent, `<Undefined>: ${msg}`)
        break;
      }
    })
  }
}

module.exports = function(){
  global.logSystem = 'BOT'
  global.config = JSON.parse(process.env.config)
  global.logger = new customLogger(config.logger)

  mcClientStart()
}