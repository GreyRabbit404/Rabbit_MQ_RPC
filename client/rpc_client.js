const amqp = require('amqplib');
const uuid = require('uuid');

async function startClient() {
    try {
        // Establish connection and create channel
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        const queue = 'rpc_queue';

        // Create a temporary exclusive queue for responses
        const q = await channel.assertQueue('', { exclusive: true });

        // Generate a single correlationId
        const correlationId = uuid.v4();

        // Set up a consumer for the response queue
        channel.consume(q.queue, async function (msg) {
            if (msg.properties.correlationId === correlationId) {
                console.log("Received response:", msg.content.toString());

                // Close the channel and connection after processing the response
                await channel.close();
                await connection.close();
            }
        }, { noAck: true });

        console.log("Requesting the server");

        // Send the RPC request with the correct correlationId
        channel.sendToQueue(queue, Buffer.from('5'), { replyTo: q.queue, correlationId: correlationId });

    } catch (error) {
        console.log("ERROR IN CLIENT:", error);
    }
}

startClient();
