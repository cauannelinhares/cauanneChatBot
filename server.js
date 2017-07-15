//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));
var messages = [];
var sockets = [];

var _estados = [];

// GET
router.get('/webhook', function(req, res) {
  //Testando requisição do webhook
  //res.send('ok!');
  
  //Testando acesso a aplicalçao
  if(req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'minhasenha123') {
    
    //registra no log
    console.log('Validação Ok!');
    //Dá o ok pro facebook
    res.status(200).send(req.query['hub.challenge']);
  } else {
    //registra no log
    console.log('Validação Falhou!');
    //devolve o status de erro
    res.sendStatus(403);
  }
  
});

router.post('/webhook', function(req, res){
  
  var data = req.body;
  
  if(data && data.object === 'page'){
    //percorrer todas as entradas entry
    data.entry.forEach(function(entry){
      var pageId = entry.id;
      var timeOfEvent = entry.time;
      //percorrer as mensagens
      entry.messaging.forEach(function(event){
        
        if(event.message){
          trataMensagem(event);
        } else if (event.postback && event.postback.payload) {
          
          console.log("achamos um payload ", event.postback.payload);
          
          switch(event.postback.payload){
          
            case 'acionou_comecar':
              sendFirstMenu(event.sender.id);
              sendTextMessage(event.sender.id, "Olá, Tudo bem? Sou um bot simpático e vou lhe apresentar as coisas que eu mais gosto.");
              break;
              
            case 'acionou_categorias':
              sendTextMessage(event.sender.id, "Estas são as categorias das minhas coisas favoritas, Vamos navegar?");
              showListCategorias(event.sender.id);
              //showOptionsMenu(event.sender.id);
              break;
              
            case 'acionou_netflix':
              showNetflixCarousel(event.sender.id);
              console.log("Netflix acionado");
              break;
              
            case 'acionou_games':
              console.log("Games acionado");
              break;
            
            case 'acionou_musica':
              console.log("Musica acionado");
              break;
              
            case 'acionou_contato':
              showInformacoesContato(event.sender.id);
              sendGif(event.sender.id);
              break;

          }
        } //else if (event.message.qr && event.message.qr.payload){
        //   switch(event.message.qr.payload){
            
        //     case 'voltar_netflix':
        //       console.log("Voltar em netflix acionado");
        //       break;
            
        //     case 'menu_inicial':
        //       console.log("Menu inicial acionado");
        //       break;
        //   }
        // }
      })
      
    })
    
    res.sendStatus(200);
  }
  
});

function trataMensagem(event){
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  console.log("Mensagem Recebida do usuario %d pela pagina %d", senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var attachments = message.attachments;
  var quick_reply = message.quick_reply;
  
  if(message.text){
  
    if(_estados[senderID]){
      //Já começou a navegação
      switch(_estados[senderID]) {
        
        case 'options_menu':
          
          switch(messageText){
          
            case 'sim':
            console.log("enviar menu novamente");
            sendFirstMenu(event.sender.id);
            break;
            
            case 'nao': 
              console.log("dar xau");
              sendTextMessage(senderID, "Obrigada e volte sempre!")
              break;
          }
          break;//fim options menu
      }//fim estados
      
    } else {//estado não é um dos considerados acima
      
        switch(messageText){
          case 'oi':
            sendTextMessage(senderID, "Oi, tudo bem?");
            break;
          case 'tchau':
            sendTextMessage(senderID, "Até a próxima, pessoal o/");
            break;
          case 'hey':
            sendTextMessage(senderID, "I said hey, what's going on?");
            sendTextMessage(senderID, "yeah yeah yeah");
            break;
          default:
            sendTextMessage(senderID, "Desculpa, não consegui entender. :(");
        }//fim switch de mensagem
    }//fim do else
  //se não for texto
  } else if (attachments) {
    //tratamento de anexos
    console.log("Me enviaram anexos!");
  } else if (quick_reply) {
    console.log("Me enviaram um quick reply");
  }
}


function callSendAPI(messageData){
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAAJJIxYJ8UUBAJ42HOEWNXoXhzOwKz7cb067CQjjuybikj023D5SMEF06cZCjHVKVQwcKBWwjwEXBE65oW4Vq0Hh3O2VhQTAsk8WVPZCwm5TbkVH3F8UHU4syBubiMOoQ3dR22ZATqZB1q9Vstk7bBBfW1zvDSCLqBH8j2WoGAZDZD'},
    method: 'POST',
    json: messageData
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("mensagem enviada com sucesso");
    } else {
      console.log('nao foi possivel enviar a mensagem');
      console.log(error);
    }
  })
}


function sendTextMessage(recipientID, messageText) {
  var messageData = {
    recipient: {
      id: recipientID
    },
    message:{
      text: messageText
    }
  };
  
  callSendAPI(messageData);
}


function sendFirstMenu(recipientId){
    var messageData = {
    recipient: {
      id: recipientId
    },
    
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          image_aspect_ratio: "square",
          elements: [
            {
              title: "Bot de Cauanne",
              image_url: "https://bot-framework.azureedge.net/bot-icons-v1/bot-framework-default-7.png",
              subtitle: "Vou lhe apresentar as minhas coisas favoritas, veja as opções abaixo:",
              buttons: [
              {
                type: "web_url",
                url: "https://www.linkedin.com/in/cauanne-linhares-06909a109/",
                title: "A Desenvolvedora"
              }, {
                type: "postback",
                title: "Categorias do Bot",
                payload: "acionou_categorias"
              }]
            }]
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

function showListCategorias(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          top_element_style: "compact",
          elements: [
            {
              title: "Netflix",
              image_url: "https://cdn.vox-cdn.com/thumbor/Yq1Vd39jCBGpTUKHUhEx5FfxvmM=/39x0:3111x2048/1200x800/filters:focal(39x0:3111x2048)/cdn.vox-cdn.com/uploads/chorus_image/image/49901753/netflixlogo.0.0.png",
              subtitle: "Meus seriados favoritos",
              buttons: [
              {
                type: "postback",
                payload: "acionou_netflix",
                title: "Ver",
              }]
            }, {
              title: "Games",
              image_url: "http://www.logoinspiration.net/wp-content/uploads/2016/02/Trophy.jpg",
              subtitle: "Os games que eu mais gosto",
              buttons: [
                {
                  type: "postback",
                  payload: "acionou_games",
                  title: "Ver",
                }]
            }, {
              title: "Spotify",
              image_url: "https://image.flaticon.com/icons/png/512/49/49097.png",
              subtitle: "As músicas que sempre levo comigo:",
              buttons: [
                  {
                    type: "postback",
                    payload: "acionou_musica",
                    title: "Ver",
                  }
                ]
            }]
        }
      }
    }
  };
  callSendAPI(messageData);
   _estados[recipientId] = 'categorias_menu';
}

function showNetflixCarousel (recipientId) {
    var messageData = {
    recipient: {
      id: recipientId
    },
    
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Jessica Jones",
              image_url: "http://juhclaro.com/wp-content/uploads/2016/04/Marvels-Jessica-Jones-p%C3%B4ster.jpg",
              subtitle: "Dos quadrinhos direto para a tela da Netflix!",
              buttons: [
                {
                  type: "web_url",
                  title: "Assistir",
                  url: "https://www.netflix.com/br/title/80002311"
                }, {
                  type: "element_share"
                }]
              
            },{
              title: "Sense8",
              image_url: "http://www.soulgeek.com.br/wp-content/uploads/2017/05/Sense-8-imagen-destacada.png",
              subtitle: "Já podemos comemorar, teremos um episódio final com 2h de duração.",
              buttons: [
              {
                type: "web_url",
                url: "https://www.netflix.com/br/title/80025744",
                title: "Assistir",
              }, {
                type: "web_url",
                url: "https://www.youtube.com/watch?v=6NXnxTNIWkc",
                title: "Música",
              }, {
                type: "element_share"
              }]
            },{
              title: "Suits",
              subtitle: "Uma bela dose de direito.",
              image_url: "https://tdvott-a.akamaihd.net/ondemand/production/image/thumbnails/mm/2017-03/1490917628049173100_213.jpg",
              buttons: [
                {
                  type: "web_url",
                  title: "Assistir",
                  url: "https://www.netflix.com/br/title/70195800"
                }, {
                  type: "element_share"
                }]
            }]
        }
      }//, 
      // quick_replies: [
      //   {
      //     content_type:"text",
      //     title:"Voltar",
      //     payload: "voltar_netflix"
      //   },
      //   {
      //     content_type: "text",
      //     title: "Menu Inicial",
      //     payload: "acionou_comecar"
      //   }
      // ]
      }
    };
  callSendAPI(messageData);
  _estados[recipientId] = 'netflix_carousel';
}

function showInformacoesContato(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [
            {
              title: "Desenvolvedora",
              image_url: "http://static.tumblr.com/347b49e0ac1c73dd722894b3802090ce/wslypay/Ij9mqes4s/tumblr_static_geekid2.png",
              subtitle: "Essas são as minhas informações de contato.",
              buttons: [
                {
                  type: "web_url",
                  title: "Github",
                  url: "https://github.com/cauannelinhares"
                },{
                  type: "web_url",
                  title: "LinkedIn",
                  url:"https://www.linkedin.com/in/cauanne-linhares-06909a109/"
                },{
                  type: "phone_number",
                  title: "Ligar",
                  payload: "+5581995960114"
                }]
            }]
        }
      }
    }
  };
  callSendAPI(messageData);
}


function sendGif(recipientId){
  setTimeout(function() {
    var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment:{
        type: "image",
        payload: {
          url: "https://media.tenor.co/images/b0f1fcb7aed91d5cad9fb76918be67a0/tenor.gif",
        }
      }
    }
  };
  callSendAPI(messageData);
  }, 10000);
}


function showOptionsMenu(recipientId){
  setTimeout(function(){
    sendTextMessage(recipientId, "Posso lhe ajudar com mais alguma coisa?")
    _estados[recipientId] = 'options_menu';
  }, 25000)
}











































io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
