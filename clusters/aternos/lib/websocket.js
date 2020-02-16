const request = require('request')
const cheerio = require('cheerio')
const asec = require('./asec')

const statusCodes = ["Offline", "Online", "Queueing", "Loading", "Starting", "Countdown", "Stopping", "Saving"];
var status = 0
// 0 - Offline, 1 - Online, 2 - Queueing, 3 - Loading, 4 - Starting, 5 - Countdown, 6 - Stopping, 6 - Saving
var players = []

function handleMessage({ type, message }){
  const msgData = JSON.parse(message)
  switch(type){
    case 'status':
      switch(msgData.status){
        case "1":
          if(msgData.class === "online"){
            onStatusUpdate(1)
            if(msgData.playerlist !== players) {
              players = msgData.playerlist
              process.send({type: 'WEBServer.updatePlayers', data: { players: players }})
            }
            if(msgData.players === "0" || msgData.countdown !== false){
              onStatusUpdate(5)
            }
          }
        break
        case "10":
          if(msgData.class === "queueing"){
            onStatusUpdate(2)
            if(msgData.pending === "ready"){
              const SEC = asec()
              request({
                url: `https://aternos.org/panel/ajax/confirm.php?ASEC=${SEC.key}:${SEC.value}`,
                method: 'GET',
                headers: {
                  Cookie: [
                    `ATERNOS_SESSION=${process.env.ATERNOS_SESSION}`,
                    `ATERNOS_SEC_${SEC.key}=${SEC.value}`
                  ],
                  referer: "https://aternos.org/server/"
                }
              }, (err, res, body) => {
                if (err) return logger.error(logSystem, 'Confirm', `Error: ${JSON.stringify(err)}`)
                if (body) {
                  try {
                    const res = JSON.parse(body)
                  } catch(err){
                    return logger.error(logSystem, 'Confirm', `Body parse error: ${JSON.stringify(err)}`)
                  }
                  if (res && res.success) logger.debug(logSystem, 'Confirm', `Confirm starting server SUCCESS!`)
                }
              })
            }
          }
        break
        case "3":
          if(msgData.class === "loading"){
            onStatusUpdate(6)
          }
        break
        case "5":
          if(msgData.class === "loading"){
            onStatusUpdate(7)
          }
        break
        case "6":
          if(msgData.class === "loading"){
            onStatusUpdate(3)
          }
        break
        case "2":
          if(msgData.class === "loading starting"){
            onStatusUpdate(4)
          }
        break
        case "0":
          if(msgData.class === "offline"){
            onStatusUpdate(0)
            const SEC = asec()
            request({
              url: `https://aternos.org/panel/ajax/start.php?headstart=0&ASEC=${SEC.key}:${SEC.value}`,
              method: 'GET',
              headers: {
                Cookie: [
                  `ATERNOS_SESSION=${process.env.ATERNOS_SESSION}`,
                  `ATERNOS_SEC_${SEC.key}=${SEC.value}`
                ],
                referer: "https://aternos.org/server/"
              }
            }, (err, res, body) => {
              if (err) return logger.error(logSystem, 'Starting', `Error: ${JSON.stringify(err)}`)
              if (body) {
                try {
                  const res = JSON.parse(body)
                } catch(err){
                  return logger.error(logSystem, 'Starting', `Body parse error: ${JSON.stringify(err)}`)
                }
                if (res && res.success) logger.debug(logSystem, 'Starting', `Starting Aternos server SUCCESS!`)
              }
            })
          }
        break
        default:
          logger.warning(logSystem, 'Status', `DEBUG: ${JSON.stringify(msgData)}`)
        break
      }
    break
    case 'queue_reduced':
    break
    default:
    break
  }
}

function onStatusUpdate(newStatus){
  if(status !== newStatus) {
    logger.info(logSystem, 'Status', `Updating: ${getStatusString(status)} => ${getStatusString(newStatus)}`)
    status = newStatus
    process.send({type: 'MCClient.statusUpdate', data: { status: status }})
  }
}

const getStatusString = (code) => statusCodes[code % statusCodes.length]

function restart(){
  const SEC = asec()
  request({
    url: `https://aternos.org/panel/ajax/restart.php?headstart=0&ASEC=${SEC.key}:${SEC.value}`,
    method: 'GET',
    headers: {
      Cookie: [
        `ATERNOS_SESSION=${process.env.ATERNOS_SESSION}`,
        `ATERNOS_SEC_${SEC.key}=${SEC.value}`
      ],
      referer: "https://aternos.org/server/"
    }
  }, (err, res, body) => {
    if (err) return logger.error(logSystem, 'Restarting', `Error: ${JSON.stringify(err)}`)
    if (body) {
      try {
        const res = JSON.parse(body)
      } catch(err){
        return logger.error(logSystem, 'Restarting', `Body parse error: ${JSON.stringify(err)}`)
      }
      if (res && res.success) logger.debug(logSystem, 'Restarting', `Restart Aternos server SUCCESS!`)
    }
  })
}

function getStatusGrabber(){
  const SEC = asec()
  request(`https://${config.MCClient.host}`, (err, res, body) => {
    if (err) return logger.error(logSystem, 'Grabber', `Status grabber error: ${JSON.stringify(err)}`)
    if (body) {
      const $ = cheerio.load(body)
      const statusString = $('.status-label').html()
      logger.debug(logSystem, 'Grabber', `Grabbed status: ${statusString}!`)
      switch(statusString){
        case 'Offline':
          onStatusUpdate(0)
        break
        case 'Online':
          onStatusUpdate(1)
        break
        default:
        break
      }
    }
  })
}

function loadWebSocket(connection) {
  logger.info(logSystem, 'loadWebSocket', `Aternos WebSocket Connected`)
  getStatusGrabber()
  connection.on('error', (error) => logger.error(logSystem, 'loadWebSocket', `Connection Error: ${error.toString()}`))
  connection.on('close', (error) => logger.error(logSystem, 'loadWebSocket', `Connection Closed: ${error.toString()}`))
  connection.on('message', function(message) {
    if (message.type === 'utf8') handleMessage(JSON.parse(message.utf8Data))
  })

  process.on('message', function(message) {
    const { type, data } = message;
    switch(type){
      case 'getPlayers':
        process.send({type: 'WEBServer.updatePlayers', data: { players: players }})
      break
      case 'mcStatusRequest':
        process.send({type: 'MCClient.statusResponse', data: { status: status }})
      break
      default:
      break
    }
  })
}

module.exports = loadWebSocket


