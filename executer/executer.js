const { generate_argo_workflow } = require('./argo');
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');
const crypto = require('crypto');
const util = require('util');

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
					console.log(`Status: ${stdout}`)
					if (stdout.includes("Succeeded")) {
						node.status({ fill: "green", shape: "dot", text: `successfully complete` });
						return clearInterval(statusInterval);
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

	RED.nodes.registerType("executer", GdiNode);
};
