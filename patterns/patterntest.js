const axios = require('axios');
const telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const Markup = require('telegraf/markup');


const token = `999145575:AAFUd-YT48yLQJELF1s1_ZohhyeuH1cpvtQ`;
const bot = new telegraf(token);

const fillers = [`🐱`, `🐕`, `🦊`, `🍋`, `🐱`, `🐕`, `🦊`, `🍋`, `🐱`, `🐕`, `🦊`, `🍋`];
const empty = `🕳️`;
const size = 4;


function randomInteger(min, max) {
  // получить случайное число от (min-0.5) до (max+0.5)
  let rand = min - 0.5 + Math.random() * (max - min + 1);
  return Math.round(rand);
}

function createPattern(density, filler, size) {
  let amount = Math.round(size*density);
  let table = [];

  for (let i = 0; i < size; i++) {
    if (i < amount) {
      table.push(filler);
    } else {
      table.push(empty);
    }
  }

  shuffle(table);
  return table;
}




function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}


let complete = [];
let numbers = [];
let time;



let i = 0;

async function forTimeout(sec) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, sec * 1000);
  });
}

function getDistance(a, b) {
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance;
}

let originalPattern;
let userPattern;

bot.start(async ctx => {
  await ctx.reply('Добро пожаловать в программу запоминия паттернов!\n(c) НТУ ХПИ, 2019');
  await forTimeout(2);
  originalPattern = createPattern(0.3, fillers[i], size*size);
  userPattern = createPattern(0, fillers[i], size*size);
  let sent = await ctx.reply('Постарайтесь запомнить паттерн. Время на запоминание: 5 секунд', Extra.markup((m) =>
    m.inlineKeyboard(arrayToKeys(originalPattern), {columns: size})));
  console.log(sent);
  await forTimeout(5);
  await ctx.deleteMessage(sent.message_id);
  await ctx.reply('Восстановите паттерн максимально точно. Тест прекратиться после первой ошибки!', Extra.markup((m) =>
    m.inlineKeyboard(arrayToKeys(userPattern), {columns: size})));
});



function arrayToKeys(array) {
  let keys = [];
  for (let i = 0; i < array.length; i++) {
    keys.push(Markup.callbackButton(array[i], i));
  }
  return keys;
}

bot.action(/.+/, async (ctx) => {
  const id = parseInt(ctx.match[0]);
  console.log(`Mark `, id);
  userPattern[id] = fillers[i];

  if (originalPattern[id] === empty) {
    userPattern[id] = '❌';
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(arrayToKeys(userPattern), {columns: size}));
    await ctx.reply(`Тест завершен :c Вы набрали ${getDistance(originalPattern, userPattern)} баллов`);
  } else {
    await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(arrayToKeys(userPattern), {columns: size}));
  }
});

bot.startPolling();