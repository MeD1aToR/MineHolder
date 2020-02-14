const color = require('ansi-color').set
const colors = require('./colors')
const util = require('util')

const dictionary = require('./dictionary')

const parseChat = function(chatObj, parentState) {

  function getColorize (parentState) {
    let myColor = ''
    if ('color' in parentState) myColor += colors[parentState.color] + '+'
    if (parentState.bold) myColor += 'bold+'
    if (parentState.underlined) myColor += 'underline+'
    if (parentState.obfuscated) myColor += 'obfuscated+'
    if (myColor.length > 0) myColor = myColor.slice(0, -1)
    return myColor
  }

  if (typeof chatObj === 'string') {
    return color(chatObj, getColorize(parentState))
  } else {
    let chat = ''
    if ('color' in chatObj) parentState.color = chatObj.color
    if ('bold' in chatObj) parentState.bold = chatObj.bold
    if ('italic' in chatObj) parentState.italic = chatObj.italic
    if ('underlined' in chatObj) parentState.underlined = chatObj.underlined
    if ('strikethrough' in chatObj) parentState.strikethrough = chatObj.strikethrough
    if ('obfuscated' in chatObj) parentState.obfuscated = chatObj.obfuscated

    if ('text' in chatObj) {
      chat += color(chatObj.text, getColorize(parentState))
    } else if ('translate' in chatObj && dictionary[chatObj.translate] !== undefined) {
      const args = [dictionary[chatObj.translate]]
      chatObj.with.forEach(function (s) {
        args.push(parseChat(s, parentState))
      })

      chat += color(util.format.apply(this, args), getColorize(parentState))
    }
    if (chatObj.extra) {
      chatObj.extra.forEach(function (item) {
        chat += parseChat(item, parentState)
      })
    }
    return chat
  }
}

module.exports=parseChat;