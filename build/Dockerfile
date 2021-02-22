FROM registry.access.redhat.com/ubi8/nodejs-14:latest
COPY *.js /opt/app
COPY package.json /opt/app
COPY start.sh /opt/app
WORKDIR /opt/app 
RUN npm i
CMD sh start.sh
