FROM nodered/node-red:4.0.8-22


# Copy files
COPY . . 

# Install dependencies
RUN npm install ./buffer && \
    npm install ./dataset && \
    npm install ./intersection && \
    npm install ./download-artifact

RUN npm install ./submit-workflow/
# Install kubectl
USER root
RUN apk add --no-cache curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Create k8s-config.sh with proper formatting
RUN echo '#!/bin/bash\n\
export KUBERNETES_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)\n\
export KUBERNETES_CA_CERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt\n\
export KUBERNETES_NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)\n\
\n\
kubectl config set-cluster in-cluster \
    --certificate-authority="$KUBERNETES_CA_CERT" \
    --server=https://kubernetes.default.svc\n\
\n\
kubectl config set-credentials serviceaccount \
    --token="$KUBERNETES_TOKEN"\n\
\n\
kubectl config set-context in-cluster \
    --cluster=in-cluster \
    --user=serviceaccount \
    --namespace="$KUBERNETES_NAMESPACE"\n\
\n\
kubectl config use-context in-cluster' > /usr/local/bin/k8s-config.sh && \
    chmod +x /usr/local/bin/k8s-config.sh

RUN cp ./settings.js ./node_modules/node-red
# Expose Node-RED port
EXPOSE 1880

# Start Node-RED after configuring kubectl
CMD ["/bin/sh", "-c", "/usr/local/bin/k8s-config.sh && node-red"]
