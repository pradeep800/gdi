FROM node:iron-bullseye-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ENV production=yes
RUN npm run build 
CMD ["npm", "run","start"]

