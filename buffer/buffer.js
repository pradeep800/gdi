const { z } = require("zod")
const isValidString = (str) => {
	const pattern = /^[a-zA-Z0-9-]+$/;
	return pattern.test(str);
}

const schema = z.object({
	name: z.string().default(''),
	config: z.string(),
	'client-id': z.string(),
	'buffer-distance': z.string(),
	'store-artifact': z.string(),
});
module.exports = function(RED) {
	function GdiNode(config) {
		RED.nodes.createNode(this, config);
		var node = this;
		node.name = config.name;
		const result = schema.safeParse(config);
		if (!result.success) {
			console.log(result.error.format());
			node.status({ fill: "red", shape: "dot", text: `fields are missing` });
			return;
		}
		const args = Object.entries(result.data)
			.map(([name, value]) => ({ name, value }));

		// Handle incoming messages
		node.on('input', function(msg) {
			const name = node.name;

			if (!name) {
				node.status({ fill: "red", shape: "dot", text: `no name` });
				return;
			}
			if (!isValidString(name)) {
				node.status({ fill: "red", shape: "dot", text: `node name only contain a-z, A-Z, 0-9, - and _` });
				return;
			}
			if (!Array.isArray(msg.payload)) {
				msg.payload = []
			}

			// Check for duplicate names
			let n = msg.payload.length;
			for (let i = 0; i < n; i++) {
				if (name === msg.payload[i].name) {
					node.status({ fill: "red", shape: "dot", text: `node with this name already present` });
					return;
				}
			}

			let depends = []
			if (n !== 0) {
				depends.push(msg.payload[n - 1].name)
			}

			msg.payload.push({
				type: "buffer",
				name: name,
				depends,
				args
			});

			node.send(msg);
			node.status({ fill: "green", shape: "dot", text: `successfully published` });
		});
	}

	RED.nodes.registerType("buffer", GdiNode);
};
