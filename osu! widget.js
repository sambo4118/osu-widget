// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;

let userId = 32757211;

if (!config.runsInWidget) {
  const alert = new Alert();
  alert.title = "Setup";
  alert.addTextField("Id number", "Enter userID");
  alert.addAction("OK");
  await alert.present();
  
}

// get user data from osu api
const fileManager = FileManager.iCloud();
const tokenRequest = new Request("https://osu.ppy.sh/oauth/token");

tokenRequest.method = "POST";
tokenRequest.body = JSON.stringify({
  client_id: 50111,
  client_secret: "q7Di5a2npptwmTP24yI4QcNyL0zBSKdEI0pFw9yF",
  grant_type: "client_credentials",
  scope: "public"
});
tokenRequest.headers = { "content-type": "application/json" };

const tokenResponce = await tokenRequest.loadJSON();
const token = tokenResponce.access_token;

const userRequest = new Request(`https://osu.ppy.sh/api/v2/users/${userId}/osu`);
userRequest.headers = { "authorization": `Bearer ${token}` };

const data = await userRequest.loadJSON();


// preset fonts
const small = new Font("Avenir-Heavy", 10);
const medium = new Font("Avenir-Heavy", 16);
const large = new Font("Avenir-Heavy", 24);

// preset colors
const mainTextColor = new Color("#ffdded");
const backgroundColorDark = new Color("#ba1177");
const backgroundColorLight = new Color("#ed3399", 0.6);

// Function to get grade rank from accuracy percentage
function getGradeFromAccuracy(accuracy) {
  const percent = accuracy * 100;
  if (percent === 100) return 'SS';
  if (percent >= 95) return 'S';
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  return 'D';
}

//get image(s)
const backgroundImagePath = fileManager.joinPath(fileManager.documentsDirectory(), "osuTrianglesBackground.png");
const backgroundImage = Image.fromFile(backgroundImagePath);
const avatarRequest = new Request(data.avatar_url);
const avatarImage = await avatarRequest.loadImage();

// Load flag image from local file
let flagImage = null;
if (data.country_code) {
  try {
    const flagsDir = fileManager.joinPath(fileManager.documentsDirectory(), 'flags');
    const flagPath = fileManager.joinPath(flagsDir, `${data.country_code}.png`);
    flagImage = Image.fromFile(flagPath);
  } catch (error) {
    console.log(`Flag not found: ${data.country_code}`);
  }
}

// Load grade badge image from local file
let badgeImage = null;
const grade = getGradeFromAccuracy(data.statistics.accuracy);
try {
  const badgesDir = fileManager.joinPath(fileManager.documentsDirectory(), 'badges');
  const badgePath = fileManager.joinPath(badgesDir, `${grade}.png`);
  badgeImage = Image.fromFile(badgePath);
} catch (error) {
  console.log(`Badge not found: ${grade}`);
}

// initialize widget with background image
const widget = new ListWidget();
widget.backgroundImage = backgroundImage;

let widgetSize;
if (!config.runsInWidget) {
  widgetSize = "small";
} else {
  widgetSize = config.widgetFamily;
}

// Function to calculate rank change and arrow indicator
function getRankChangeInfo(data) {
  let rankChange = 0;
  let changeColor = mainTextColor;
  let arrow = "";

  if (data.rank_history && data.rank_history.data && data.rank_history.data.length > 1) {
    const historyData = data.rank_history.data;
    const todayRank = historyData[historyData.length - 1];
    // Scan backward to find the most recent day where rank was different
    let referenceRank = null;
    for (let i = historyData.length - 2; i >= 0; i--) {
      if (historyData[i] !== 0 && historyData[i] !== todayRank) {
        referenceRank = historyData[i];
        break;
      }
    }
    if (referenceRank !== null) {
      rankChange = referenceRank - data.statistics.global_rank; // positive = improvement
    }
  }
  
  if (rankChange !== 0) {
    arrow = rankChange > 0 ? "▴" : "▾";
    changeColor = rankChange > 0 ? new Color("#a5cc00") : new Color("#ed1121");
  }

  return { arrow, rankChange, changeColor };
}

// create small widget
if (widgetSize === "small") {
  
  const { arrow, rankChange, changeColor } = getRankChangeInfo(data);

  widget.addSpacer();

  const dataColumn = widget.addStack();
  dataColumn.layoutVertically();

  const nameRow = dataColumn.addStack();
  nameRow.layoutHorizontally();

  const usernameText = nameRow.addText(`${data.username}`);
  usernameText.font = large;
  usernameText.textColor = mainTextColor;
  
  nameRow.addSpacer(10);

  if (flagImage) {
    const countryFlag = nameRow.addImage(flagImage);
    countryFlag.imageSize = new Size(25, 20);
  }
  
  dataColumn.addSpacer(5);
  
  const rankRow = dataColumn.addStack();
  rankRow.layoutHorizontally();
  rankRow.centerAlignContent();
  
  const rankText = rankRow.addText(`# ${data.statistics.global_rank}`);
  rankText.font = medium;
  rankText.textColor = mainTextColor;
  
  if (arrow) {
    rankRow.addSpacer(4);
    const arrowText = rankRow.addText(arrow);
    arrowText.font = medium;
    arrowText.textColor = changeColor;
    
    rankRow.addSpacer(2);
    const sign = rankChange > 0 ? "+" : "";
    const changeText = rankRow.addText(`${sign}${rankChange}`);
    changeText.font = small;
    changeText.textColor = changeColor;
  }
  
  dataColumn.addSpacer(5);
  
  const statsRowOne = dataColumn.addStack();
  statsRowOne.layoutHorizontally();
  statsRowOne.centerAlignContent();

  const accuracyText = statsRowOne.addText(`${(data.statistics.accuracy * 100).toFixed(2)} %`);
  accuracyText.font = medium;
  accuracyText.textColor = mainTextColor;

  const ppDisplayRow = statsRowOne.addStack();
  ppDisplayRow.layoutHorizontally();
  ppDisplayRow.bottomAlignContent();

  const ppText = ppDisplayRow.addText(`${data.statistics.pp}`);
  const ppLabelText = ppDisplayRow.addText("PP");

  ppLabelText.font = small;
  ppText.font = medium;
  
  ppLabelText.textColor = mainTextColor;
  ppText.textColor = mainTextColor;
  
  widget.addSpacer();
}

if (widgetSize === "medium") {
  
  const { arrow, rankChange, changeColor } = getRankChangeInfo(data);
  
  widget.addSpacer();

  const generalStack = widget.addStack();
  generalStack.layoutHorizontally();

  const imageColumn = generalStack.addStack();
  imageColumn.layoutVertically();
  
  const avatar = imageColumn.addImage(avatarImage);
  avatar.imageSize = new Size(135, 135);
  avatar.cornerRadius = 10;
  avatar.backgroundColor = new Color("#808080", 0.5);
  
  generalStack.addSpacer(4);

  const dataColumn = generalStack.addStack();
  dataColumn.layoutVertically();
  dataColumn.addSpacer(4);

  const nameRow = dataColumn.addStack();
  nameRow.layoutHorizontally();
  
  const usernameText = nameRow.addText(`${data.username}`);
  usernameText.font = large;
  usernameText.textColor = mainTextColor;

  nameRow.addSpacer(4);

  if (flagImage) {
    const countryFlag = nameRow.addImage(flagImage);
    countryFlag.imageSize = new Size(25, 20);
  }
  
  dataColumn.addSpacer(3);

  const rankRow = dataColumn.addStack();
  rankRow.layoutHorizontally();
  rankRow.centerAlignContent();
  
  const rankText = rankRow.addText(`# ${data.statistics.global_rank}`);
  rankText.font = large;
  rankText.textColor = mainTextColor;
  
  if (arrow) {
    rankRow.addSpacer(4);
    const arrowText = rankRow.addText(arrow);
    arrowText.font = large;
    arrowText.textColor = changeColor;
    
    rankRow.addSpacer(4);
    const sign = rankChange > 0 ? "+" : "";
    const changeText = rankRow.addText(`${sign}${rankChange}`);
    changeText.font = medium;
    changeText.textColor = changeColor;
  }
  dataColumn.addSpacer(5);

  const statsRowOne = dataColumn.addStack();
  statsRowOne.layoutHorizontally();
  statsRowOne.centerAlignContent();

  const accuracyText = statsRowOne.addText(`${(data.statistics.accuracy * 100).toFixed(2)} %`);
  accuracyText.font = medium;
  accuracyText.textColor = mainTextColor;

  statsRowOne.addSpacer(5);

  const ppDisplayRow = statsRowOne.addStack();
  ppDisplayRow.layoutHorizontally();
  ppDisplayRow.bottomAlignContent();

  const ppText = ppDisplayRow.addText(`${data.statistics.pp}`);
  const ppLabelText = ppDisplayRow.addText("PP");

  ppLabelText.font = small;
  ppText.font = medium;
  
  ppLabelText.textColor = mainTextColor;
  ppText.textColor = mainTextColor;
  
  generalStack.addSpacer();
  
  widget.addSpacer();

}

if (widgetSize === "large") { 

}
if (!config.runsInWidget) {
  if (widgetSize === "small") {
    await widget.presentSmall();
  } else if (widgetSize === "medium") {
    await widget.presentMedium();
  } else if (widgetSize === "large") {
    await widget.presentLarge();
  }
}
Script.setWidget(widget);
Script.complete()