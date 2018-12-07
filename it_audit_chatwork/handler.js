"use strict";

const fetch = require("node-fetch");
const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();

module.exports.invoke_notify_chatwork = async () => {
  const params = {
    FunctionName: "it-audit-chatwork-dev-notify_chatwork",
    InvocationType: "RequestResponse",
    LogType: "Tail"
  };
  try {
    const result = await lambda.invoke(params).promise();
    const execLogNotifyChatwork = new Buffer(
      result.LogResult,
      "base64"
    ).toString();
    console.log(execLogNotifyChatwork);
  } catch (error) {
    console.log(error)
  }
};

module.exports.notify_chatwork = () => {
  getIssuesAndPostMsg();
};

async function getIssuesAndPostMsg() {
  let queue = {
    "chatwork_user_found": [],
    "chatwork_user_not_found": []
  };
  const chatworkMembers = await getChatworkMembersInfo();
  const backlogIssuesUrls = [
    backlogIssuesUrl(process.env.BACKLOG_ADMIN_PROJECT_ID),
    backlogIssuesUrl(process.env.BACKLOG_DEV_PROJECT_ID)
  ];

  // awaitを使うため、forEach ではなく for (.. of ..) を使用
  // ref. https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop#answer-37576787
  for (let backlogIssuesUrl of backlogIssuesUrls) {
    const tickets = await getTickets(backlogIssuesUrl);
    for (let ticket of tickets) {
      let chatworkMember = chatworkMembers[ticket.author];
      if (chatworkMember === undefined)
        chatworkMember = await forceGetChatworkMember(chatworkMembers, ticket.author);
      updateQueue(queue, chatworkMember, ticket);
    }
  }
  postMsgToChatwork(queue);
}

function updateQueue(queue, chatworkMember, ticket) {
  if (chatworkMember === undefined) {
    queue["chatwork_user_not_found"].push(ticket.key);
  } else {
    chatworkMember["tickets"].push(ticket.key);
    queue["chatwork_user_found"][ticket.author] = chatworkMember;
  }
}

async function getTickets(backlogIssuesUrl) {
  const tickets = await getBacklogIssues(backlogIssuesUrl);
  return tickets.map(backlogIssue => {
    const ticket = {
      author: backlogIssue.createdUser.mailAddress.replace(/@pixta.co.jp/, ""),
      key: backlogIssue.issueKey
    };
    return ticket;
  });
}

function backlogIssuesUrl(project_id) {
  return (
    "https://pixta.backlog.jp/api/v2/issues?apiKey=" +
    process.env.BACKLOG_API_KEY +
    "&projectId[]=" +
    project_id +
    "&statusId[]=3&count=100"
  );
}

async function getBacklogIssues(url) {
  try {
    const response = await fetch(encodeURI(url));
    return await response.json();
  } catch (error) {
    console.log(error);
  }
};

async function forceGetChatworkMember(chatworkMembers, ticketAuthor) {
  for (let name in chatworkMembers) {
    var forceGotChatworkMember;
    const splitWordCount = name.split(".").length;
    const splitName = name.split(".");

    if (splitWordCount === 3) {
      // ChatWorkのアルファベット名にミドルネームがある場合
      const joinedName = splitName[0] + "." + splitName[1] + splitName[2];
      if (ticketAuthor == joinedName) forceGotChatworkMember = chatworkMembers[name];
    } else if (splitWordCount === 2) {
      // ChatWorkのアルファベット名で姓名が逆順の場合
      // TODO: 姓名それぞれでマッチングしてもいいかも？
      const reversedName = splitName[1] + "." + splitName[0];
      if (ticketAuthor === reversedName) forceGotChatworkMember = chatworkMembers[name];
    } else if (splitWordCount === 1) {
      // ChatWorkのアルファベット名がフルネームでない場合
      if (ticketAuthor.match(new RegExp(name, "g"))) forceGotChatworkMember = chatworkMembers[name];
    }
  }
  if (forceGotChatworkMember === undefined)
    console.log(ticketAuthor + "を名寄せできませんでした。星さん・時長さん・玉井 にメンションします。");
  return forceGotChatworkMember;
}

async function getChatworkMembersInfo() {
  const chatworkRoomUrl =
    "https://api.chatwork.com/v2/rooms/" +
    process.env.CHATWORK_APPROVAL_ROOM_ID +
    "/members";
  const params = {
    headers: {
      "X-ChatWorkToken": process.env.CHATWORK_API_TOKEN
    },
    method: "GET"
  };
  try {
    const response = await fetch(encodeURI(chatworkRoomUrl), params);
    const json = await response.json();
    let chatworkMembersDict = {};
    json.forEach(member =>
      chatworkMembersDict[emailAccount(member.name)] = {
        "id": member.account_id,
        "name": member.name,
        "tickets": []
      }
    );
    return chatworkMembersDict;
  } catch (error) {
    console.log(error);
  }
};

function emailAccount(name) {
  // Input: "山田 太郎 / Taro Yamada" --> Output: "taro.yamada"
  return name
    .match(/[a-zA-Z]+/g)
    .toString()
    .replace(/,/g, ".")
    .toLowerCase();
}

async function postMsgToChatwork(queue) {
  // 起案者の名寄せができたチケット
  for (let user of Object.values(queue["chatwork_user_found"])) {
    const msgTo = "[To:" + user.id + "]" + user.name;
    let ticketUrls = await genTicketUrlsString(user["tickets"]);
    const msg = await genMsg(msgTo, ticketUrls);
    sendRequestToChatWork(msg, user["tickets"]);
  }

  // 起案者の名寄せができなかったチケット
  let ticketUrls = await genTicketUrlsString(queue["chatwork_user_not_found"]);
  const msgTo = "[To:509597] (*) 直史 / Naoshiさん\n\[To:2541415] 時長 秀茂 / Shumo Tokinagaさん\n\[To:2908455] 玉井 あゆみ / Ayumi Tamaiさん "
  const msg = await genMsg(msgTo, ticketUrls);
  sendRequestToChatWork(msg, queue["chatwork_user_not_found"]);
}

async function genTicketUrlsString(ticketKeys) {
  return ticketKeys.map(ticketKey => {
    return "https://pixta.backlog.jp/view/" + ticketKey;
  }).join("\n");
}

async function genMsg(msgTo, ticketUrls) {
  return msgTo +
    "\nこのチケットは処理済みになったので、確認の上完了にしてください。\n" +
    ticketUrls;
}

async function sendRequestToChatWork(msg, queueContent) {
  const chatworkRoomMsgsUrlWithParamKey =
    "https://api.chatwork.com/v2/rooms/" +
    process.env.CHATWORK_APPROVAL_ROOM_ID +
    "/messages?body=";
  const chatWorkOptions = {
    headers: {
      "X-ChatWorkToken": process.env.CHATWORK_API_TOKEN
    },
    method: "POST"
  };
  try {
    // ------------------------コメントアウト時注意!!!-------------------------
    await fetch(encodeURI(chatworkRoomMsgsUrlWithParamKey + msg), chatWorkOptions);
    // ------------------------コメントアウト時注意!!!-------------------------
    console.log(msg);
    console.log(queueContent.join(", ") + " の完了を依頼しました。");
  } catch (error) {
    console.log(error);
  }
}
