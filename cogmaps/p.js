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

function changePattern(array, changes, filler) {
  console.log(array);
  for (let i = 0; i < array.length && changes > 0; i++) {
    if (array[i] === filler) {
      array[i] = empty;
      console.log(i, randomInteger(0, array.length - 1));
      array[randomInteger(0, array.length - 1)] = filler;
      changes--;
      console.log(`Change`);
    }
  }
  console.log(array);

  return array;
}

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

let complete = [];
let numbers = [];
let time;

let i = 2;

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
  originalPattern = createPattern(0.3, fillers[i], size*size);
  let sent = await ctx.reply('Постарайтесь запомнить паттерн. Время на запоминание: 3 секунды', Extra.markup((m) =>
    m.inlineKeyboard(arrayToKeys(originalPattern), {columns: size})));
  console.log(sent);
  await forTimeout(3);
  userPattern = changePattern(originalPattern, randomInteger(0, 3), fillers[i]);
  await ctx.deleteMessage(sent.message_id);
  await forTimeout(10);


  await ctx.reply('Постарайтесь запомнить паттерн. Время на запоминание: 3 секунды', Extra.markup((m) =>
    m.inlineKeyboard(arrayToKeys(userPattern), {columns: size})));
  await ctx.reply(".\n.\n.\n.\n.\n.\n.\n.");

  await ctx.reply('Этот паттерн совпадает?', Extra.markup((m) =>
    m.inlineKeyboard(arrayToKeys(['+', '-']), {columns: size})));



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
  const eq = id === 0;

  if (eq && getDistance(userPattern, originalPattern) === 0) {
    await ctx.reply(`Правильно`);
  } else {
    await ctx.reply(`Неправильно`);
  }
});

bot.startPolling();