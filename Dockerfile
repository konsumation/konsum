FROM node:21-alpine
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app
COPY package*.json ./
COPY config ./config
COPY src ./src
RUN npm install
EXPOSE 8080
CMD [ "node", "./src", "konsum-cli.mjs", "--config=config", "start"]