$(function() {
  var FADE_TIME = 150; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];
  var STATUSES = ["Offline", "Online: ", "Queueing...", "Loading...", "Starting...", "Countdown: ", "Stopping...", "Saving..."]
  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  var $rebootState = $('.rebootState');
  var stateChangeLock = false
  var $start = $('li.start');
  var $stop = $('li.stop');
  var $restart = $('li.restart');
  var $restartBot = $('li.restartBot');

  // Prompt for setting a username
  var username;
  var password;
  var connected = false;
  var serverStatus = 0;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  const capitalizeFLetter = (string) => string[0].toUpperCase() + string.slice(1);

  // Sets the client's password
  const AUTH = () => {
    password = cleanInput($usernameInput.val().trim());

    // If the password is valid
    if (password) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your pass
      socket.emit('login', password);
    }
  }

  // Sends a chat message
  const sendMessage = () => {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  const addChatMessage = (data, options) => {
    if (typeof data === 'string') data = { username: "", message: data }
    options = options || {};
    var $usernameDiv = $('<span class="username"/>').text(data.username).css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">').text(data.message);
    var $messageDiv = $('<li class="message"/>').data('username', data.username).append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }


  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el, options) => {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      if (options.welcome) {
        $('.log.welcome').remove()
        $el.addClass('welcome')
        $el.append('<span class="status"></span>')
        $el.append('<span class="players"></span>')
        $messages.prepend($el);
      }
      $el.insertAfter($('.log.welcome'));
    } else {
      $messages.append($el)
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  // Gets the color of a username through our hash function
  const getUsernameColor = (username = "") => {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
      } else {
        AUTH();
      }
    }
  });

  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  $rebootState.click(() => {
    if (stateChangeLock !== true) {
      if ($rebootState.attr('state') === "true")
        socket.emit('setAutoRebootState', JSON.stringify({ state: false }));
      else
        socket.emit('setAutoRebootState', JSON.stringify({ state: true }));
      stateChangeLock = true
      $rebootState.removeClass('enabled disabled')
    }
  })
  
  function sendAction(type) {
    return function(event) {
      socket.emit(`send${capitalizeFLetter(type)}`, {});
      $(event.target).addClass('loading')
    }
  }

  function addClassCallback(el, status) {
    el.removeClass('loading').addClass(status)
    setTimeout(function() { el.removeClass(status) }, 2000)
  }

  $start.click(sendAction('start'));
  $stop.click(sendAction('stop'));
  $restart.click(sendAction('restart'));
  $restartBot.click(sendAction('restartBot'));
  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    username = data.username
    connected = true;
    // Display the welcome message
    var message = `– Welcome to MineHolder Web Chat –\n`;
    log(message, {
      prepend: true,
      welcome: true
    });
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('mc_message', (data) => {
    addChatMessage(JSON.parse(data));
  });

  socket.on('updatePlayers', (data) => {
    const players = JSON.parse(data)
    let line = ''
    players.forEach((elem, i) => {
      line += `<span style="color: ${getUsernameColor(elem)}">${elem}${players.length - 1 === i?"":"&ensp;"}</span>`
    })
    $('.log.welcome .players').html(`[&ensp;${line}&ensp;]`)
  });

  socket.on('updateAutoRebootState', (data) => {
    const { state } = JSON.parse(data)
    $('.rebootState')
      .addClass(state?'enabled':'disabled')
      .removeClass(!state?'enabled':'disabled')
      .attr('state', state.toString())
    stateChangeLock = false
  })

  socket.on('status', (data) => {
    const { status } = JSON.parse(data)
    serverStatus = status
    $('.log.welcome .status').html(`${STATUSES[serverStatus]}`)
    if (serverStatus !== 1 && serverStatus !== 5) $('.log.welcome .players').html('')
  })
  
  socket.on('controlRes', (data) => {
    const { type, status } = JSON.parse(data)
    switch(type){
      case 'start':
        if (status) addClassCallback($start, 'success')
        else addClassCallback($start, 'error')
      break
      case 'stop':
        if (status) addClassCallback($stop, 'success')
        else addClassCallback($stop, 'error')
      break
      case 'restart':
        if (status) addClassCallback($restart, 'success')
        else addClassCallback($restart, 'error')
      break
      case 'restartBot':
        if (status) addClassCallback($restartBot, 'success')
        else addClassCallback($restartBot, 'error')
      break
    }
  })

  socket.on('disconnect', () => {
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      socket.emit('login', password);
    }
  });

  socket.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

});