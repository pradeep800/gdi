import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv'
import z from 'zod'
const app = express();
let env_path = "local.env"
if (process.env.production == "yes") {
	env_path = "production.env"
	console.log("running in production")
}
dotenv.config({
	path: env_path
});
let envSchema = z.object({ origin_urls: z.string() })
let env = envSchema.safeParse(process.env)
if (!env.success) {
	env.error.errors.forEach((err) => {
		console.log(`❌ Missing or invalid: ${err.path.join(".")} - ${err.message}`);
	});
	throw new Error("some environmental variable are missing")
}
let origin = env.data.origin_urls.split(" ")
console.log(origin)
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin,
	}
});

io.on('connection', (socket) => {
	console.log(`A user with ${socket.id} connected`);
	socket.on('join-download-room', (downloadId) => {
		socket.join(downloadId)
		console.log(`user id ${socket.id} join room id ${downloadId}`)
	});
	socket.on("send-download-link", (downloadId: string, downloadUrl: string) => {
		io.to(downloadId).emit("receive-download-link", downloadUrl)
		console.log(`sended download-id ${downloadId} url ${downloadUrl}`)
	})
	socket.on('disconnect', () => {
		console.log(`A User disconnected with id ${socket.id}`);
	});
});


httpServer.listen(3000, () => {
	console.log('Server running on port 3000');
});

