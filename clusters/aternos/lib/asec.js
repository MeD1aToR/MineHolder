const generateAjaxToken = () => ({ key: randomString(16), value: randomString(16) })
const randomString = (length) => Array(length + 1).join((Math.random().toString(36) + '00000000000000000').slice(2, 18))
                                                  .slice(0, length)

module.exports=generateAjaxToken