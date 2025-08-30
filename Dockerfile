FROM node:24-trixie

WORKDIR /app

COPY *.js package.json package-lock.json /app
RUN npm install

CMD [ "npm", "run", "start" ]

