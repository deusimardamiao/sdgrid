const io = require('socket.io-client');
const SpellChecker = require('simple-spellchecker');
const dictionary = SpellChecker.getDictionarySync("en-US");
const limiarmemory = 30;
const limiarcpu = 10;
const tarifacpu = 1;
const tarifamemory = 2;
const { checkCpu, checkMemory } = require('./calculeResources');

function checkResources() {
  console.log('Searching resources!');
}

var cpu = 0;

checkCpu(function(response){
  cpu = response;
});

var memory = checkMemory();

// call the first chunk of code right away
checkResources();

// call the rest of the code and have it execute after 3 seconds
setTimeout(startConnection, 3000);

function startConnection() {
  var index;
  const socket = io.connect('http://10.180.35.168:9510');
  socket.on('connect', () => {
    console.log('Successfully connected!');
    socket.emit('resources', { cpu: cpu, memory: memory / 1024 })
  });

  socket.on('index', (indexn)=>{
    index=indexn;
  })

  socket.on('getResources', () => {
    console.log('recebido')
    checkCpu(function(response){
      cpu = response;
    });
    memory = checkMemory();
    socket.emit('sendResources', {index:index, cpu:cpu, memory:memory})
  })

  socket.on('maketask', (dados) => {
    const startUsage = process.cpuUsage();
    var text = dados.dados.replace(/\.|\,|\:|\n/g, '');
    var textoCorrigir = text.split(' ');
    var palavras = {}
    var used = process.memoryUsage().heapUsed / 1024 / 1024;
    var usageCpu = process.cpuUsage(startUsage);
    for(var i = 0; i < textoCorrigir.length; i++){
      if (!dictionary.spellCheck(textoCorrigir[i])) {
        palavras[textoCorrigir[i]] = dictionary.getSuggestions(textoCorrigir[i])
      }
      // console.log(used);
      // console.log(usageCpu.user);
      if((usageCpu.user / 1e+6) >= limiarcpu){
        break;
      }else if(used >= limiarmemory){
        break;
      }
    }
    console.log(`The script uses approximately ${usageCpu.user/1e+6}s of CPU`);
    console.log(`The script uses approximately ${used} MB of memory`);
    console.log('tarifa memory: ', used*tarifamemory);
    console.log('tarifa da cpu: ', (usageCpu.user/1e+6)*tarifacpu);
    var retorno = {
      tarifa: '',
      idClient:dados.idClient,
      parte:dados.parte,
      totalPartes:dados.totalPartes,
      words: palavras
    }
    // console.log(retorno)
    socket.emit('correcoes', retorno)
  });
  
}
