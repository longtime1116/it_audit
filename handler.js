'use strict';

const request = require('request');
const AWS = require('aws-sdk');
const repoName = 'TokinagaItAuditTest';

const codecommit = new AWS.CodeCommit();

module.exports.update_backlog = async (event, context) => {
  const branchDetail = {
    branchName: 'master',
    repositoryName: repoName,
  };
  let commitBranch;
  try {
    commitBranch = await codecommit.getBranch(branchDetail).promise();
  } catch (err) {
    console.log(err);
    return err;
  }
  const lastCommitId = commitBranch.branch.commitId;
  console.log(lastCommitId);

  const commitDetail = {
    commitId: lastCommitId,
    repositoryName: repoName,
  };
  let resultCommit;
  try {
    resultCommit = await codecommit.getCommit(commitDetail).promise();
  } catch (err) {
    console.log(err);
    return err;
  }
  const lastCommitMessage = resultCommit.commit.message;
  console.log(lastCommitMessage);

  if (!lastCommitMessage.match(/Merge\ branch/)) return;

  const targetMessage = lastCommitMessage.match(/DEV-\d{1,5}/);
  if (targetMessage === null) return;

  const revertMessage = lastCommitMessage.match(/Revert/g);
  const revertMessageCount = revertMessage ? revertMessage.length : 0;
  if (revertMessageCount % 2 == 1) {
    console.log(targetMessage[0] + "'s head commit was revert commit");
    return;
  }

  updateTicketStatus(targetMessage[0]);
};

function updateTicketStatus(targetTicketName) {
  const ticketUrl =
    'https://pixta.backlog.jp/api/v2/issues/' +
    targetTicketName +
    '?apiKey=' +
    process.env.BACKLOG_API_KEY;
  const data = {
    url: ticketUrl,
    method: 'PATCH',
    form: {
      statusId: 3,
    },
    headers: {
      Accept: '*/*',
    },
  };
  request(data, function optionalCallback(err, httpResponse, body) {
    console.log('Result in ' + targetTicketName + ':');
    console.log(body);
  });
}
