FROM node:24-trixie

WORKDIR /app

COPY . .
RUN npm install

EXPOSE 3000

CMD [ "npm", "run", "start" ]

