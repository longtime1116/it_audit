'use strict';

var request = require('request');
var AWS = require('aws-sdk');
var repoName = 'tamaiItAuditTest';

var codecommit = new AWS.CodeCommit();

module.exports.processing_to_processed = (event, context, callback) => {
  var branchDetail = {
    branchName: 'master',
    repositoryName: repoName,
  };
  console.log(branchDetail);

  // TODO: 無駄な入れ子をなくす
  codecommit.getBranch(branchDetail, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      var lastCommitId = data.branch.commitId;
    }
    console.log(lastCommitId);

    var commitDetail = {
      commitId: lastCommitId,
      repositoryName: repoName,
    };
    codecommit.getCommit(commitDetail, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        var lastCommitComment = data.commit.message;
      }
      // ticket number for test
      var targetTicketName = lastCommitComment.match(/DEV-\d{1,5}/)[0];
      // Revertが含まれたら？
      if (lastCommitComment.match(/DEV-\d{1,5}/)) {
        updateTicketStatus(targetTicketName);
      }
    });
  });
  function updateTicketStatus(targetTicketName) {
    var ticketUrl =
      'https://pixta.backlog.jp/api/v2/issues/' +
      targetTicketName +
      '?apiKey=' +
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
      console.log(body);
    });
  }
};
