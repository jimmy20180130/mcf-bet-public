# 廢土對賭機器人
**✨一個由 jimmy20180130(XiaoXi_YT) 製作的完全開源的廢土對賭機器人✨**\
**⭐開始前拜託先給這個專案一顆星星(右上角星星圖示)或buy me a coffee支持我繼續維護此專案⭐**\
**✨您也可以透過`/warp XiaoXi_YT_4`將綠寶石券投入漏斗裡面以贊助我✨**

## 免則聲明/版權聲明
***若您違反以下規定，經勸導不聽者，我將不排除對您追究法律責任!!!***

### ⚠️免責聲明

⚠️使用者應自行承擔機器人使用的風險，包括但不限於遊戲更新、機器人更新等可能導致機器人無法正確運作的情況、或因為程式錯誤使您的帳號破產或是面臨其他問題。

⚠️如果您使用此程式，請確保使用您的行為符合Minecraft及廢土伺服器的相關使用條款。機器人的使用者或架設者以及管理員應對其使用行為負全部責任，並應遵守相關法律法規。

⚠️在任何情況下，我本人和相關方均不對任何因使用本機器人而導致的損失或損害承擔責任，包括但不限於直接損失、間接損失、意外損失等。

⚠️我本人保留隨時更新或修改免責聲明的權利，請定期查看以確保您了解任何變更。

❓👉如果您有任何問題，您可以至我們的Discord伺服器詢問，不過我們可能提供有限的技術支援，且不保證對所有問題的解答。
### ⚠️版權聲明

<p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.com/jimmy20180130/mcf-bet-public">mcf-bet-public</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://github.com/jimmy20180130/">jimmy20180130</a> is licensed under <a href="http://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">CC BY-NC-SA 4.0<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/nc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1"></a></p>

***只要您遵守授權條款規定，授權人不能撤回您使用本素材的自由。***

***您可自由***：

- 分享 — ✅以任何媒介或格式重製及散布本素材
- 修改 — ✅重混、轉換本素材、及依本素材建立新素材

***惟需遵照下列條件***:

- **姓名標示** - ⚠️您必須給予 適當表彰 、提供指向本授權條款的連結，以及 指出（本作品的原始版本）是否已被變更 。您可以任何合理方式為前述表彰，但不得以任何方式暗示授權人為您或您的使用方式背書。

- **非商業性** - ❌您不得將本素材進行 商業目的 之使用。

- **相同方式分享** - ⚠️若您重混、轉換本素材，或依本素材建立新素材，您必須依 本素材的授權條款 來散布您的貢獻物。

# 部分程式碼參考來源
- Mineflayer Examples: https://github.com/PrismarineJS/mineflayer/blob/master/examples
- Discord.js 文檔: https://discord.js.org/docs/packages/discord.js/main

# 簡介
這是一個**🆓免費且完全開源🆓**的廢土對賭機器人\
由 jimmy20180130 (Minecraft ID為 XiaoXi_YT) 製作\
原本為我朋友 maxhung001 委託我製作，寫好後我\
因為看到廢土都沒有開源的對賭機器人，所以我決定要把他開源。

# 功能

## 本機器人有以下功能

### 1. 自動接受傳送
- 有管理員權限: `/tpa <機器人ID>`或`/tpahere <機器人ID>` 機器人會自動同意\
- 無管理員權限: `/tpa <機器人ID>`或`/tpahere <機器人ID>` 機器人會自動拒絕

### 2. 遊戲內控制機器人(以下指令皆需加上`/msg <機器人ID>`)
- 有身份組使用者通用指令\
`hi` -> 跟機器人問好\
`daily` -> 領取每日獎勵(詳情請看底下身份組加成的部分)\
`help` -> 取得指令清單
`play` -> 讓機器人回到原本位置
- 有管理員身份組\
`cmd <指令>` -> 執行遊戲內的指令\
`reload` -> 重啟機器人\
`stop` -> 停止機器人
- 有MVP-MVP++的身份組\
`暫時無特殊指令`
- 有VIP-VIP++的身份組\
`暫時無特殊指令`
- 有一般會員的身份組\
`暫時無特殊指令`
- 沒有身份組\
`link` -> 連接Discord帳號(將取得的驗證碼私訊給Discord伺服器中的機器人)

### 3. 終端機中控制機器人(以下皆不需加任何東西)
- 傳訊息\
`<您要的訊息> <空格後的訊息>`\
例如: `hi 您好`
- 傳指令\
`/<您要的指令> <指令參數1> <指令參數2> <指令參數n>`\
例如: `/pay XiaoXi_YT 10000000`

### 4. 身份組
- 使用指令給予多個玩家身份組`give_role <身份組> <玩家1> <玩家2> <玩家n>`
- 使用指令移除多個玩家的身份組`remove_role <身份組> <玩家1> <玩家2> <玩家n>`
- 可以讓每日獎勵變多(還在做ing)
- 還有更多功能(還在做ing)

### 5. 綁定Discord
- 使用指令`/m <機器人ID> link`
- 將機器人私訊給您的驗證碼記下來(請不要分享給其他人)
- 私訊Discord機器人那一串驗證碼
- 如果機器人回覆您以下文字，代表您綁定成功\
`已成功連結 Minecraft玩家 <您的Minecraft ID> 的帳號至 Discord帳號 <您的Discord帳號> (ID為 <您的Discord ID>)`

### 6. 對賭
- 先蓋好如圖的裝置(中間上半部為一個朝左的投擲器，中間下半部為一個朝上的投擲器，右邊上半部為一個臉向右的發射器)
<img src='https://media.discordapp.net/attachments/1091510078911299674/1173269258378170490/image.png?ex=65635725&is=6550e225&hm=a8404c187ea4dbaf18f2fc4350d540a2aa9d01098059f058c37dd1d0edf40978&='> </img>
- 準備兩組羊毛，一組黑，一組白，好了以後將他命名為"白色羊毛"和"黑色羊毛"(一定要命名，不需包含雙引號)
- 在中間上半部的投擲器中放入一組白色羊毛及一組黑色羊毛(這樣為1/2的機率，您可以自己調整)
- 右鍵紅石粉，假如中間上半部的投擲器有丟出羊毛的話，代表您蓋的正確
- 使機器人站到紅石粉前面的地板上面(圖片中的地板為海磷石)，並與整台機器成一條線
- 使用`/pay <機器人ID> <您想賭的金額>`，機器人正常來說會按下紅石粉開始賭博
- 如果有多人同時使用，將會一個一個執行，不會同時執行
- 白色羊毛為1.5倍，黑色羊毛為0倍(未來會開放給您更改)

### 7. 每日獎勵
- 使用指令`daily`即可領取
- 從 VIP 到 MVP++ 每提升一等級(VIP算提升一次)，每日獎勵將會乘(1+0.2*提升等級數) (還在做ing)

### 8. Discord訊息紀錄功能(還在做ing)
- 還在做

# 想要自己架設機器人?

## 需求
- node.js
- 一個Minecraft帳號(並且在廢土可以使用顏色代碼)
- 一個Discord機器人
- 一台對賭機器

## 架在自己電腦上
- 下載下來這個repo

## 架設在repl.it
- 建立一個新的repo

## 架設在託管平台(以lesa bot hosting為例)
- 上傳檔案
