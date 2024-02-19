const AWS = require('aws-sdk');
const { TwitterApi } = require('twitter-api-v2');

// DynamoDB 클라이언트 설정
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Twitter API 클라이언트 설정
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY,
  appSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

// 읽기 및 쓰기 가능한 Twitter 클라이언트
const rwClient = twitterClient.readWrite;

exports.handler = async (event) => {
  let fetch;

  // node-fetch 동적 임포트
  try {
    if (!fetch) {
      fetch = (await import('node-fetch')).default;
    }
  } catch (error) {
    console.error("Failed to dynamically import 'node-fetch':", error);
    return;
  }

  const params = {
    TableName: "ReservationNews",
  };

  try {
    // DynamoDB에서 데이터 스캔
    const { Items } = await dynamoDB.scan(params).promise();
    console.log(`Scanned items: ${Items.length}`);

    // 현재 시간
    const now = new Date();

    for (const item of Items) {
      // DynamoDB 항목의 예약된 시간을 Date 객체로 변환
      const reservedTime = new Date(item.ReservedTime);

      // 예약된 시간이 현재 시간보다 이전인 경우 트윗과 Facebook 게시물 게시
      if (reservedTime <= now) {
        // Twitter에 게시
        const { data: createdTweet } = await rwClient.v2.tweet(item.summary + " " + item.link);
        console.log("Tweet posted:", createdTweet);

        // Facebook에 게시
        const message = item.summary + " " + item.News;
        const pageAccessToken = process.env.PAGE_ACCESS_TOKEN; // 페이지 액세스 토큰
        const pageId = process.env.PAGE_ID; // 페이지 ID
        const url = `https://graph.facebook.com/${pageId}/feed`;

        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            message: message,
            access_token: pageAccessToken,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const fbData = await response.json();
        console.log("Facebook post created:", fbData);
      }
    }
  } catch (error) {
    // 에러 로깅
    console.error("Error:", error);
  }
};