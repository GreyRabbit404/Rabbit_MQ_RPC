const amqp = require('amqplib');
const nodemailer = require('nodemailer'); // Import Nodemailer

require('dotenv').config();
  
async function startServer() {
    try {
        // Connect to RabbitMQ
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();

        const queue = 'rpc_queue';
        await channel.assertQueue(queue, { durable: false });

        channel.prefetch(1);
        console.log('[x] Awaiting RPC requests');

        // Consume messages from the queue
        channel.consume(queue, async function reply(msg) {
            const num = parseInt(msg.content.toString());
            const res = fib(num);
            // Send response back to the client
            channel.sendToQueue(
                msg.properties.replyTo,
                Buffer.from(res.toString()),
                {
                    correlationId: msg.properties.correlationId,
                }
            );
            channel.ack(msg);

            console.log(`Processed request for number: ${num}, result: ${res}`);

            // Send email notification
            await sendEmail(num, res);
        });

        // Fibonacci function
        function fib(n) {
            if (n <= 1) return n;
            return fib(n - 1) + fib(n - 2);
        }

        // Function to send email
        async function sendEmail(requestedNumber, result) {
            try {
                // Configure the email transporter
                const transporter = nodemailer.createTransport({
                    service: 'gmail', // Use Gmail's SMTP server
                    auth: {
                        user: 'greyrabbit002@gmail.com', // Your email address
                        pass: process.env.PASSWORD    // Your email password or app password
                    },
                });

                // Configure email options
                const mailOptions = {
                    from: 'greyrabbit002@gmail.com', // Sender address
                    to: 'arjun.saxena.as2002@gmail.com',    // Recipient address
                    subject: 'RPC Server Processed Request',
                    text: `The server processed a request.\n\nRequested Number: ${requestedNumber}\nResult: ${result}`,
                };

                // Send the email
                await transporter.sendMail(mailOptions);
                console.log(`Email sent for request ${requestedNumber} with result ${result}`);
            } catch (error) {
                console.error('Failed to send email:', error);
            }
        }
    } catch (err) {
        console.log('ERROR IN SERVER:', err);
    }
}

startServer();
