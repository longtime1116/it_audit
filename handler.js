'use strict';

// TODO: lambda に request, aws-sdk をインストール
var request = require('request');
var util = require('util');
var AWS = require('aws-sdk');
var repoName = 'tamaiItAuditTest';

var codecommit = new AWS.CodeCommit();

module.exports.processing_to_processed = async (event, context) => {
  // var branchDetail = {
  //   branchName: 'master',
  //   repositoryName: repoName,
  // };

  // // TODO: 無駄な入れ子をなくす
  // codecommit.getBranch(branchDetail, function(err, data) {
  //   if (err) {
  //     console.log(err, err.stack);
  //   } else {
  //     var lastCommitId = data.branch.commitId;
  //   }
  //   var commitDetail = {
  //     commitId: lastCommitId,
  //     repositoryName: repoName,
  //   };
  //   codecommit.getCommit(commitDetail, function(err, data) {
  //     if (err) {
  //       console.log(err, err.stack);
  //     } else {
  //       var lastCommitComment = data.commit.message;
  //     }

  //     // ticket number for test
  //     var targetTicketName = lastCommitComment.match(/DEV-\d{1,5}/)[0];

  //     // Revertが含まれたら？
  //     if (lastCommitComment.match(/DEV-\d{1,5}/)) {
  //       updateTicketStatus(targetTicketName);
  //     }
  //   });
  // });

  // function updateTicketStatus(targetTicketName) {
  //   var ticketUrl =
  //     'https://pixta.backlog.jp/api/v2/issues/' +
  //     targetTicketName +
  //     '?apiKey=' +
  //     process.env.BACKLOG_API_KEY;
  //   var data = {
  //     url: ticketUrl,
  //     method: 'PATCH',
  //     form: {
  //       statusId: 3,
  //     },
  //     headers: {
  //       Accept: '*/*',
  //     },
  //   };
  //   request.patch(data);
  // }

  // 以下動作確認用。あとで消す
  var ticketUrl =
    'https://pixta.backlog.jp/api/v2/issues/DEV-21163?apiKey=' +
    process.env.BACKLOG_API_KEY;

  var data = {
    url: ticketUrl,
    method: 'PATCH',
    form: {
      statusId: 3,
    },
    headers: {
      Accept: '*/*',
    },
  };

  request.patch(data, function optionalCallback(err, httpResponse, body) {
    console.log(httpResponse);
    console.log(body);
    // return body;
    return httpResponse;
  });
};
