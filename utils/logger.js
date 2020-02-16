const dateFormat = require('dateformat');
const colors = require('colors');

var severityToColor = function(severity, text) {
  switch(severity) {
    case 'debug': return text.green;
    case 'info': return text.cyan;
    case 'warning': return text.yellow;
    case 'error': return text.red;
    default:
      console.log("Unknown severity " + severity);
      return text.italic;
  }
};

var severityValues = {
    'debug': 1,
    'info': 2,
    'warning': 3,
    'error': 4
};


class Logger {
  constructor(config){
    const _this = this;
    this.config = config;
    Object.keys(severityValues).forEach(function(logType){
        _this[logType] = function(){
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(logType);
            _this.log.apply(this, args);
        };
    });
  }

  log(severity, system, component, text, subcat) {
      if (subcat){
          var realText = subcat;
          var realSubCat = text;
          text = realText;
          subcat = realSubCat;
      }
      let time = new Date();
      let fileEntryDesc = `${dateFormat(time, 'yyyy-mm-dd HH:MM:ss')} [${severity.toUpperCase()}] [${system}]`
      let consoleEntryDesc = fileEntryDesc+'\t'
      if (this.config.logConsole.enabled) {
          consoleEntryDesc = severityToColor(severity, consoleEntryDesc);

          var consoleLogString = consoleEntryDesc+(`[${component}] `).italic;

          if (subcat) consoleLogString += (`(${subcat}) `).bold.grey;

          consoleLogString += text.grey;
      }
      else {
          var consoleLogString =
                  consoleEntryDesc +
                  '[' + component + '] ';

          if (subcat)
              consoleLogString += '(' + subcat + ') ';

          consoleLogString += text;
      }

      var fileLogString = `${fileEntryDesc}[${component}] `;

      if (subcat) fileLogString += '(' + subcat + ') ';

      fileLogString += text;

      if(severityValues[severity] >= severityValues[this.config.logConsole.logLevel] && this.config.logConsole.enabled === true){
        console.log(consoleLogString)
      }
  };

};

module.exports = Logger;
