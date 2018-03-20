function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
};

/*$.ajax({
    type: "POST",
    url: "/api/token",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    success: function(res) {
      console.log("autorizzato");
    },
    error: function(httpObj, textStatus) {
      console.log("non autorizzato");
    }
  });*/

var notifyNumber = function(num) {
  $('#number').html(num);
}

var notifyNumberPopup = function(num){
  $.notify({message: '<strong>Nuovo numero chiamato!</strong><h2>'+num+'</h2>'
    },{
      newest_on_top: true,
      type: 'success',
      animate: {
        exit: 'animated lightSpeedOut'
      }
  });
}

var confirmNumberPlus = function(num){
  $.notify({message: '<strong>Cambiato il numero in: </strong><h2>'+num+'</h2>'
    },{
      newest_on_top: true,
      type: 'warning',
      animate: {
        exit: 'animated lightSpeedOut'
      }
  });
}

var confirmNumberMinus = function(num){
  $.notify({message: '<strong>Cambiato il numero in: </strong><h2>'+num+'</h2>'
    },{
      newest_on_top: true,
      type: 'warning',
      animate: {
        exit: 'animated lightSpeedOut'
      }
  });
}

var confirmNumberSet = function(num){
  $.notify({message: '<strong>Numero settato in: </strong><h2>'+num+'</h2>'
    },{
      newest_on_top: true,
      type: 'warning',
      animate: {
        exit: 'animated lightSpeedOut'
      }
  });
}

var confirmNumberReset = function(num){
  $.notify({message: '<strong>Numero resettato in: </strong><h2>'+num+'</h2>'
    },{
      newest_on_top: true,
      type: 'danger',
      animate: {
        exit: 'animated lightSpeedOut'
      }
  });
}

var ws = new WebSocket(localStorage.rootWebServer);
// event emmited when connected
ws.onopen = function() {
  console.log('websocket is connected ...');
  // sending a send event to websocket server
  ws.send('connected');
}
// event emmited when receiving message
ws.onmessage = function(ev) {
  mess = JSON.parse(ev.data);
  if(mess.mess == "RESET"){
    $("#hiddenset").show();
  }
  if(mess.mess == "UPDATE") {
    $("#hiddenset").hide();
  }
  if(mess.mess == "UPDATE" || mess.mess == "RESET"){
    console.log(getCookie("token"));
    if(!getCookie("token")){
      notifyNumberPopup(mess.count);
    }else{
      console.log(mess);
    }
    notifyNumber(mess.count);
  }else{
    console.log(mess);
  }
}

$('#plus1').click(function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/increment",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    success: function(res){
      confirmNumberPlus(res.count);
    }
  });
});

$('#minus1').click(function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/decrement",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    success: function(res){
      confirmNumberMinus(res.count);
    }
  });
});

$('#reset').click(function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/reset",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    success: function(res){
      confirmNumberReset(res.count);
    }
  });
});

$('#setform').on('submit', function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/set",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    data: {
      counter: $('#numberset')[0].value
    },
    success: function(res){
      confirmNumberSet(res.count);
    }
  });
});


$('#login').on('submit', function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/signin",
    contentType: 'application/x-www-form-urlencoded',
    data: {
      username: $('#username')[0].value,
      password: CryptoJS.SHA256($('#password')[0].value).toString()
    },
    success: function(res) {
      window.location = "/";
    },
    error: function(httpObj, textStatus) {
      if (httpObj.status == 401)
        $('#errorlogin').show();
    }
  });
});

$('#logout').click(function(e) {
  e.preventDefault();
  $.ajax({
    type: "POST",
    url: "/api/signout",
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      "Authorization": decodeURI(getCookie("token"))
    },
    success: function(res) {
      window.location = "/";
    }
  });
});

$.ajax({
    type: "GET",
    url: "/api/get",
    success: function(res){
      $('#number').html(res.count);
    }
  });