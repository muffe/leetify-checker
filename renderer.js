const puppeteer = require('puppeteer');
const clipboardListener = require('clipboard-event');
const { clipboard } = require('electron')
const SteamID = require('steamid');
const loadedPlayers = {};


clipboardListener.startListening();

clipboardListener.on('change', async () => {
  const text = clipboard.readText()
    document.querySelector(".loadingSpinner").style.display = "block";

    const regex = /(STEAM_.+?)\s/gm;
    const matches = [...text.matchAll(regex)];
    let loaded = 0;

    for (const matchData of matches) {
      document.querySelector(".loadingText").innerText = "Loaded " + loaded + " of " + matches.length + " hits";
      const steamID = matchData[1];
      const convertedSteamId = new SteamID(steamID).getSteamID64();

      await loadSteamIdData(convertedSteamId);
      loaded++;
    }

    document.querySelector(".loadingSpinner").style.display = "none";
    document.querySelector(".loadingText").innerText = "";
});

async function loadSteamIdData (steamID) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = `https://leetify.com/public/profile/${steamID}`;

  await page.goto(url, {'timeout': 10000, 'waitUntil':'load'});
  await waitTillHTMLRendered(page);

  const data = await page.evaluate(() => {
    const nameElement = document.querySelector('.rank-and-name > h1');
    const name = nameElement ? nameElement.innerText : '';

    const scoreElements = document.querySelectorAll('.rank-and-name > app-rank-icon');
    const currentRank = Array.from(scoreElements).map(element => element.querySelector('img')).map(element => " " + element.alt);

    const maxRank = document.querySelectorAll('.nax-ranks-achieved > app-rank-icon');
    const maxRanks = Array.from(maxRank).map(element => element.querySelector('img')).map(element => " " + element.alt);

    const win = document.querySelector('#stats-overview .win-rate .score-text');
    const winrate = win ? win.textContent.trim() : '';

    const banList = document.querySelectorAll(".profiles .ban-badge")
    const bans = Array.from(banList).map(element => " " + element.getAttribute("ngbtooltip"));

    const bannedFriends = document.querySelectorAll('#teammates .ban-badge').length > 0;

    return {
      name,
      currentRank,
      maxRanks,
      bans,
      winrate,
      bannedFriends
    };
  });

  loadedPlayers[steamID] = data;

  await browser.close();

  const tableBody = document.querySelector('#data-table tbody');

  if (data.name === "") {
    setEmptyTableData(steamID, tableBody);
    return;
  }

  const row = document.createElement('tr');

  const nameColumn = document.createElement('td');
  const currentRankColumn = document.createElement('td');
  const maxRankColumn = document.createElement('td');
  const banColumn = document.createElement('td');
  const urlColumn = document.createElement('td');
  const winrateColumn = document.createElement('td');
  const bannedFriendsColumn = document.createElement('td');

  nameColumn.textContent = data.name;
  currentRankColumn.textContent = data.currentRank;
  maxRankColumn.textContent = data.maxRanks;
  banColumn.textContent = data.bans;
  urlColumn.innerHTML = `<a target="_blank" href="${url}">${data.name}</a>`;
  winrateColumn.textContent = data.winrate;
  bannedFriendsColumn.textContent = data.bannedFriends ? 'Yes' : 'No';

  row.appendChild(nameColumn);
  row.appendChild(currentRankColumn);
  row.appendChild(maxRankColumn);
  row.appendChild(winrateColumn);
  row.appendChild(banColumn);
  row.appendChild(bannedFriendsColumn);
  row.appendChild(urlColumn);
  tableBody.appendChild(row);
};


const waitTillHTMLRendered = async (page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;
  
    while(checkCounts++ <= maxChecks){
      let html = await page.content();
      let currentHTMLSize = html.length; 
  
      let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
  
      if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
        countStableSizeIterations++;
      else 
        countStableSizeIterations = 0; //reset the counter
  
      if(countStableSizeIterations >= minStableSizeIterations) {
        break;
      }
  
      lastHTMLSize = currentHTMLSize;
      await page.waitForTimeout(checkDurationMsecs);
    }  
  };

function setEmptyTableData(steamID, tableBody) {
  const row = document.createElement('tr');

  const nameColumn = document.createElement('td');
  const currentRankColumn = document.createElement('td');
  const maxRankColumn = document.createElement('td');
  const banColumn = document.createElement('td');
  const urlColumn = document.createElement('td');
  const winrateColumn = document.createElement('td');
  const bannedFriendsColumn = document.createElement('td');

  nameColumn.textContent = steamID;
  currentRankColumn.textContent = "-";
  maxRankColumn.textContent = "-";
  banColumn.textContent = "-";
  urlColumn.innerHTML = "";
  winrateColumn.innerText = '-';
  bannedFriendsColumn.innerText = '-';

  row.appendChild(nameColumn);
  row.appendChild(currentRankColumn);
  row.appendChild(maxRankColumn);
  row.appendChild(winrateColumn);
  row.appendChild(banColumn);
  row.appendChild(bannedFriendsColumn);
  row.appendChild(urlColumn);
  tableBody.appendChild(row);
}
