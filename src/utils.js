// Logging levels: 1 = Error, 2 = Warning, 3 = Info, 4 = Debug
function log(msg, level, color) { 
  if(!level)
		level = 0;
		
	if(color && log_colors[color])
		msg = log_colors[color] + msg + log_colors.Reset;

  if(level <= process.env.LOGGING_LEVEL || 3)
    console.log(new Date().toLocaleString() + ' - ' + msg); 
}
var log_colors = {
	Reset: "\x1b[0m",
	Bright: "\x1b[1m",
	Dim: "\x1b[2m",
	Underscore: "\x1b[4m",
	Blink: "\x1b[5m",
	Reverse: "\x1b[7m",
	Hidden: "\x1b[8m",

	Black: "\x1b[30m",
	Red: "\x1b[31m",
	Green: "\x1b[32m",
	Yellow: "\x1b[33m",
	Blue: "\x1b[34m",
	Magenta: "\x1b[35m",
	Cyan: "\x1b[36m",
	White: "\x1b[37m",

	BgBlack: "\x1b[40m",
	BgRed: "\x1b[41m",
	BgGreen: "\x1b[42m",
	BgYellow: "\x1b[43m",
	BgBlue: "\x1b[44m",
	BgMagenta: "\x1b[45m",
	BgCyan: "\x1b[46m",
	BgWhite: "\x1b[47m"
}

function tryParse(json) {
	try {
		return JSON.parse(json);
	} catch(err) {
		return null;
	}
}

module.exports = { log, tryParse };