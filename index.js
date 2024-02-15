const AWS = require('aws-sdk');
const Twitter = require('twitter');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

exports.handler = async (event) => {
    const now = new Date().toISOString();
    const params = {
        TableName: "ReservationNews",
        FilterExpression: "ReservedTime <= :now",
        ExpressionAttributeValues: { ":now": now }
    };

    try {
        const data = await dynamoDB.scan(params).promise();
        for (const item of data.Items) {
            await twitterClient.post('statuses/update', { status: item.summary + " " + item.link });
            console.log("Tweet posted:", item.summary);
            // 게시된 트윗 삭제 또는 상태 업데이트 로직 추가
        }
    } catch (error) {
        console.error("Error:", error);
    }
};