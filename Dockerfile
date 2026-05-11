FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npx expo install expo-status-bar expo-asset react react-native

COPY . .

EXPOSE 8081
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

CMD ["npx", "expo", "start", "--lan"]
