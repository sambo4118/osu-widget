// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;

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

const userRequest = new Request("https://osu.ppy.sh/api/v2/users/32757211/osu");
userRequest.headers = { "authorization": `Bearer ${token}` };

const data = await userRequest.loadJSON();

// get recent scores to find last play time
const scoresRequest = new Request("https://osu.ppy.sh/api/v2/users/32757211/scores/recent?limit=1");
scoresRequest.headers = { "authorization": `Bearer ${token}` };
const recentScores = await scoresRequest.loadJSON();



// preset fonts
const exo2Small = new Font("Exo2-regular", 12);
const exo2Medium = new Font("Exo2-regular", 16);
const exo2Large = new Font("Exo2-regular", 24);

// preset colors
const mainTextColor = new Color("#ffdded");
const backgroundColorDark = new Color("#ba1177");
const backgroundColorLight = new Color("#ed3399", 0.6);

//get image(s)
const backgroundImagePath = fileManager.joinPath(fileManager.documentsDirectory(), "osuTrianglesBackground.png");
const backgroundImage = Image.fromFile(backgroundImagePath);
const avatarRequest = new Request(data.avatar_url);
const avatarImage = await avatarRequest.loadImage();

// initialize widget with background image
const widget = new ListWidget();
widget.backgroundImage = backgroundImage;

let widgetSize;
if (!config.runsInWidget) {
  widgetSize = "medium";
} else {
  widgetSize = config.widgetFamily;
}


// create small widget
if (widgetSize === "small") {
  
  const dataColumn = widget.addStack();
  dataColumn.layoutVertically();
  dataColumn.addSpacer(5);

  const rankLabelText = dataColumn.addText("Global Rank");
  const rankText = dataColumn.addText(`${data.statistics.global_rank}`);
  
  rankLabelText.font = exo2Medium;
  rankText.font = exo2Large;
  
  rankLabelText.textColor = mainTextColor
  rankText.textColor = mainTextColor
  
  const ppLabelText = dataColumn.addText("perfomance points");
  const ppText = dataColumn.addText(`${data.statistics.pp}`);
  
  ppLabelText.font = exo2Small;
  ppText.font = exo2Medium
  
  ppLabelText.textColor = mainTextColor
  ppText.textColor = mainTextColor
}

if (widgetSize === "medium") {
  widget.addSpacer(10);
  
  const generalStack = widget.addStack();
  generalStack.layoutHorizontally();

  const imageColumn = generalStack.addStack();
  imageColumn.layoutVertically();
  
  const avatar = imageColumn.addImage(avatarImage);
  avatar.imageSize = new Size(135, 135);
  avatar.cornerRadius = 10;
  
  generalStack.addSpacer(10);

  const dataColumn = generalStack.addStack();
  dataColumn.layoutVertically();
  dataColumn.addSpacer(5);

  // Calculate rank change first to get colors
  let rankChange = 0;
  let changeColor = mainTextColor;
  let arrow = "";
  
  if (recentScores.length > 0 && data.rank_history && data.rank_history.data && data.rank_history.data.length > 0) {
    const lastPlayTime = new Date(recentScores[0].created_at);
    const now = new Date();
    const daysSincePlay = Math.floor((now - lastPlayTime) / (1000 * 60 * 60 * 24));
    
    if (daysSincePlay < data.rank_history.data.length) {
      const historyData = data.rank_history.data;
      const rankAtLastPlay = historyData[historyData.length - 1 - daysSincePlay];
      rankChange = rankAtLastPlay - data.statistics.global_rank; // positive = improvement
    }
  } else if (data.rank_history && data.rank_history.data && data.rank_history.data.length > 1) {
    const historyData = data.rank_history.data;
    const previousRank = historyData[historyData.length - 2];
    rankChange = previousRank - data.statistics.global_rank;
  }
  
  if (rankChange !== 0) {
    arrow = rankChange > 0 ? "▲" : "▼";
    changeColor = rankChange > 0 ? new Color("#a5cc00") : new Color("#ed1121");
  }

  const rankLabelText = dataColumn.addText("Global Rank");
  rankLabelText.font = exo2Medium;
  rankLabelText.textColor = mainTextColor;
  
  // Rank row with arrow
  const rankRow = dataColumn.addStack();
  rankRow.layoutHorizontally();
  rankRow.centerAlignContent();
  
  const rankText = rankRow.addText(`${data.statistics.global_rank}`);
  rankText.font = exo2Large;
  rankText.textColor = mainTextColor;
  
  if (arrow) {
    rankRow.addSpacer(8);
    const arrowText = rankRow.addText(arrow);
    arrowText.font = exo2Large;
    arrowText.textColor = changeColor;
    
    rankRow.addSpacer(4);
    const sign = rankChange > 0 ? "+" : "";
    const changeText = rankRow.addText(`${sign}${rankChange}`);
    changeText.font = exo2Medium;
    changeText.textColor = changeColor;
  }
  
  const ppLabelText = dataColumn.addText("perfomance points");
  const ppText = dataColumn.addText(`${data.statistics.pp}`);
  
  ppLabelText.font = exo2Small;
  ppText.font = exo2Medium;

  ppLabelText.textColor = mainTextColor;
  ppText.textColor = mainTextColor;
  
  generalStack.addSpacer();
  widget.addSpacer(20);

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