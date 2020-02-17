const request = require('request')
const asec = require('./asec')

const aternosAPIbase = 'https://aternos.org/panel/ajax'

function getOptions(path, qs = {}) {
  const SEC = asec()
  return {
    url: path,
    method: 'GET',
    qs: Object.assign(qs, { 'ASEC': `${SEC.key}:${SEC.value}` }),
    headers: {
      Cookie: [ `ATERNOS_SESSION=${process.env.ATERNOS_SESSION}`, `ATERNOS_SEC_${SEC.key}=${SEC.value}` ],
      referer: "https://aternos.org/server/"
    }
  }
}

function callbackCatch(module, cb = () => {} ) {
  return function(err, res, body){
    if (err) {
      cb(false)
      return logger.error(logSystem, `${module}`, `Error: ${JSON.stringify(err)}`)
    }
    if (res.body && typeof res.body === 'string') {
      try {
        const resBody = JSON.parse(res.body)
        if (resBody.success) {
          logger.debug(logSystem, `${module}`, `${module} SUCCESS!`)
          cb(true)
        } else if (resBody.error === "already") {
          logger.debug(logSystem, `${module}`, `${module} already running!`)
          cb(true)
        } else {
          cb(false)
        }
      } catch(err){ 
        cb(false)
        return logger.error(logSystem, `${module}`, `Body parse error: ${JSON.stringify(err)}`)
      }
    } else if (res.statusCode === 200) {
      cb(true)
      logger.debug(logSystem, `${module}`, `${module} SUCCESS!`)
    }
  }
}

function sendConfirm() {
  request(getOptions(`${aternosAPIbase}/confirm.php`), callbackCatch('Confirm'))
}

function sendStart(cb = () => {}) {
  request(getOptions(`${aternosAPIbase}/start.php`, { headstart: 0 }), callbackCatch('Start', cb))
}

function sendStop(cb = () => {}) {
  request(getOptions(`${aternosAPIbase}/stop.php`), callbackCatch('Stop', cb))
}

function sendRestart(cb = () => {}) {
  request(getOptions(`${aternosAPIbase}/restart.php`, { headstart: 0 }), callbackCatch('Restart', cb))
}

module.exports={
  sendStart: sendStart,
  sendStop: sendStop,
  sendConfirm: sendConfirm,
  sendRestart: sendRestart
}