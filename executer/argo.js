const argo_workflow = {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Workflow',
    metadata: {
        namespace: "argo",
        generateName: ""
    },
    spec: {
        entrypoint: "main-dag",
        templates: [
            {
                name: "fetch-resource",
                inputs: {
                    parameters: [
                        { name: "client-id" },
                        { name: "client-secret" },
                        { name: "role" },
                        { name: "resource-id" },
                        { name: "save-object" },
                        { name: "config-path" },
                        { name: "file-path" }
                    ]
                },
                container: {
                    image: "gdi-cli:latest",
                    command: ["gdi", "fetch-resource"],
                    args: [
                        "--client-id", "{{inputs.parameters.client-id}}",
                        "--client-secret", "{{inputs.parameters.client-secret}}",
                        "--role", "{{inputs.parameters.role}}",
                        "--resource-id", "{{inputs.parameters.resource-id}}",
                        "--save-object", "{{inputs.parameters.save-object}}",
                        "--config-path", "{{inputs.parameters.config-path}}",
                        "--file-path", "{{inputs.parameters.file-path}}"
                    ]
                }
            },
            {
                name: "download-artifact",
                inputs: {
                    parameters: [
                        { name: "config" },
                        { name: "client-id" },
                        { name: "artifact-url" },
                        { name: "save-as" }
                    ]
                },
                container: {
                    image: "gdi-cli:latest",
                    command: ["gdi", "download-artefact"],
                    args: [
                        "--config", "{{inputs.parameters.config}}",
                        "--client-id", "{{inputs.parameters.client-id}}",
                        "--artifact-url", "{{inputs.parameters.artifact-url}}",
                        "--save-as", "{{inputs.parameters.save-as}}"
                    ]
                }
            },
            {
                name: "main-dag",
                dag: {
                    tasks: []
                }
            }
        ]
    }
};

function databaseJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        dependencies: node.depends,
        arguments: {
            parameters: node.args,
        }
    };

}
function downloadArtifactJob(node, templateName) {
    return {
        name: node.name,
        template: templateName,
        dependencies: node.depends,
        arguments: {
            parameters: [...node.args, { name: "artifact-url", value: `{{steps.${node.depends[0]}.outputs.result}}` }]
        }
    };


}
export function generate_argo_workflow(name, nodes_payload) {
    argo_workflow.metadata.generateName = `${name}-`;


    const dagTasks = nodes_payload.map(node => {
        const templateName = node.type === 'dataset' ?
            'fetch-resource' :
            'download-artifact';

        if (node.depends.length === 0 && node.name === "download-artifact") {
            throw new Error("download artifact should be depended some node to download the artifact")
        }
        if (node.type === "dataset") {
            return databaseJob(node, templateName)
        } else if (node.type == "download-artifact") {
            return downloadArtifactJob(node, templateName)
        } else {
            throw new Error("Not supported type")
        }
    });

    // Update DAG template with tasks
    const dagTemplate = argo_workflow.spec.templates.find(t => t.name === 'main-dag');
    dagTemplate.dag.tasks = dagTasks;

    return argo_workflow;
}


