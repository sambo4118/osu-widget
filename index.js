// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: magic;
let tokenRequest = new Request("https://osu.ppy.sh/oauth/token")

tokenRequest.method = "POST"

tokenRequest.body = JSON.stringify({
  client_id: 50111,
  client_secret: "q7Di5a2npptwmTP24yI4QcNyL0zBSKdEI0pFw9yF",
  grant_type: "client_credentials",
  scope:"public"
})

tokenRequest.headers = { "content-type":"application/json" }
let tokenResponce = await
tokenRequest.loadJSON()

let token = tokenResponce.access_token

let userRequest = new Request("https://osu.ppy.sh/api/v2/users/32757211/osu")
userRequest.headers = { "authorization":`Bearer ${token}` }

let data = await userRequest.loadJSON()

let widget = new ListWidget()

widget.addText(`Rank: #${data.statistics.global_rank}`)
widget.addText(`PP: ${data.statistics.pp}`)

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentSmall()
}

Script.complete()
//testing gitpuller scriptable script