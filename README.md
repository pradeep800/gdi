# How to run

# Note
1. You might have wait for sometime after executing each step 

## install minikube
https://minikube.sigs.k8s.io/docs/start/?arch=%2Flinux%2Fx86-64%2Fstable%2Fbinary+download

check these part and run those command 
1. Installation
2.  Start your cluster
3. Interact with your cluster (don't have to run `minikube dashboard`) 

# install argo workflow 
```sh
kubectl create namespace argo
kubectl apply -n argo -f https://github.com/argoproj/argo-workflows/releases/download/v3.6.4/install.yaml
```
if you want argo workflow dashboard open a new terminal and excute this command
```sh
kubectl -n argo port-forward service/argo-server 2746:2746
```
for getting auth token
```sh
kubectl -n argo exec deploy/argo-server -- argo auth token
```

Run these command for giving access to private registry
```sh
kubectl -n gdi create secret docker-registry analytics-registry-cred --docker-server=private-registry.iudx.org.in --docker-username=iudx --docker-password=6ds3nxjdsn3uxn3nzjcehzq
kubectl -n argo create secret docker-registry analytics-registry-cred --docker-server=private-registry.iudx.org.in --docker-username=iudx --docker-password=6ds3nxjdsn3uxn3nzjcehzq
```

# clone the given repo 

```sh
git clone https://github.com/pradeep800/gdi-workflow.git gdi
```

# give permission to argo for creating pods 
go inside cloned repo 

```sh
kubectl apply -f argo-rbac.yaml
```

# deploy minio 

```sh
kubectl create ns gdi
kubectl apply -f minio.yaml
```

# port forward for api and console 
open two terminal for running these command 
```sh
kubectl -n gdi port-forward service/minio 9000:9000
kubectl -n gdi port-forward service/minio 9001:9001
```
ui url :- http://localhost:9001/
s3 server url := http://localhost:9000/

dashboard credentials
user:- admin
password:- password

# Install Node red

```sh
sudo npm install -g --unsafe-perm node-red
node-red
```
Cancel the server
```sh
Control + c
```
go inside ~/.node-red folder

```sh
cd ~/.node-red
```
let say you have clone that repo on gdi folder and repo is in ~/gdi
install all the custom node
```sh
npm install ~/gdi/buffer && \
npm install ~/gdi/dataset && \
npm install ~/gdi/intersection && \
npm install ~/gdi/download-artifact && \
npm install ~/gdi/submit-workflow/ 
```
open new terminal run

```sh
node-red
```
dashboard url :- http://localhost:1880/

# Run websocket
open a new terminal and go inside repo ws folder and run these command

```sh
npm run dev
```
your socket io url is ws://localhost:3000

# others
go to node-red ui follow given below step (fill values from https://github.com/datakaveri/gdi-python-sdk)

- drag dataset, double click and fill the input and save
- drag download-artifact, double click, fill the input and save
- drag submit-workflow, double click, fill the input

click on deploy button and when it get finished you will get url in given callback

```js
const socket = io.connect('ws://localhost:3000');
socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit("join-download-room","link");
});

socket.on("receive-download-link", (url) => {
    console.log("Received URL:", url);
    //here use the url
});
```

# gdi-workflow
