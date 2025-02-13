const { generate_argo_workflow } = require('./argo.js');
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');
const crypto = require('crypto');
const util = require('util');
const sclient = require("socket.io-client")
let index = 0
let redirectUrl = "http://localhost:9000"
let wsLink = "ws://localhost:3000"
const execPromise = util.promisify(exec);
const isValidString = (str) => {
	const pattern = /^[a-zA-Z0-9-]+$/;
	return pattern.test(str);
}
module.exports = function(RED) {
	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;


		const name = config.name
		if (!isValidString(name)) {
			return node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
		}
		let statusInterval
		let workflowFile
		node.on('input', async function(msg) {
			node.status({});

			if (!Array.isArray(msg.payload)) {
				msg.payload = [];
			}

			// Generate workflow
			const workflowId = `${name}-${crypto.randomUUID().slice(0, 8)}`;
			let workflow;
			try {
				workflow = generate_argo_workflow(workflowId, msg.payload);
			} catch (err) {
				node.error(`Workflow generation failed: ${err.message}`, msg);
				return node.status({
					fill: "red",
					shape: "dot",
					text: "Invalid workflow configuration"
				});
			}
			const socket = sclient.io.connect(wsLink);
			socket.on('connect', () => {
				node.log("connected to socket")

			});
			socket.on("error", (error) => {
				console.log("error in socket")
				console.log(error)
			});


			workflowFile = path.join(__dirname, `${workflowId}.json`);
			try {
				await fs.writeFile(workflowFile, JSON.stringify(workflow));
			} catch (err) {
				node.error(`File write failed: ${err.message}`, msg);
				return node.status({
					fill: "red",
					shape: "dot",
					text: "Failed to create workflow file"
				});
			}

			try {
				const { stderr } = await execPromise(
					`kubectl apply -f ${workflowFile}`
				);
				node.log(`Workflow submitted: ${stderr}`);
				node.status({
					fill: "blue",
					shape: "dot",
					text: "Workflow submitted"
				});
			} catch (err) {
				node.error(`Workflow submission failed: ${err.stderr}`, msg);
				return node.status({
					fill: "red",
					shape: "dot",
					text: "Submission failed"
				});
			} finally {
				try {
					await fs.unlink(workflowFile);
					console.log("successfully deleted file " + workflowFile)
				} catch (err) {
					node.error(`File cleanup failed: ${err.message}`);
				}
			}

			// Monitor workflow status
			statusInterval = setInterval(async () => {
				try {
					const { stdout } = await execPromise(
						`kubectl get workflow ${workflowId} -n argo ` +
						"-o jsonpath='{.status.phase}'"
					);
					node.log(`Status: ${stdout}`)

					if (stdout.includes("Succeeded")) {

						clearInterval(statusInterval);

						for (const node of msg.payload) {
							if (node.type === "download-artifact") {
								let command = `kubectl get pods -n argo | grep ${workflowId}| grep ${node.name}`
								const { stdout } = await execPromise(command)
								let name = stdout.split(" ")[0]
								let command2 = `kubectl logs ${name} -n argo`
								const { stdout: stdout2 } = await execPromise(command2)
								let logs = stdout2.split('\n');
								let downloadLink = logs[index].replace("http://minio.gdi.svc.cluster.local:9000", redirectUrl)
								/*
								let downloadId
								for (let arg of node.args) {
									if (arg.name == "download-id") {
										downloadId = arg.value
										break;
									}
								}
								*/
								socket.emit("send-download-link", "link", downloadLink)
							}

						}
						return node.status({ fill: "green", shape: "dot", text: `successfully complete` });
					}
					if (stdout.includes("Failed")) {
						node.status({ fill: "red", shape: "dot", text: `Failed` });
						return clearInterval(statusInterval);
					}
					node.status({
						fill: "blue",
						shape: "dot",
						text: `Status: ${stdout}`
					});

				} catch (err) {
					console.log(err)
					node.error(`Status check failed: ${err.stderr}`);
					clearInterval(statusInterval);
					node.status({
						fill: "red",
						shape: "dot",
						text: "Status check failed"
					});
				}
			}, 3000);

		});



		node.on('close', function() {
			clearInterval(statusInterval);
		});
	}

	RED.nodes.registerType("submit-workflow", GdiNode);
};

